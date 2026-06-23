-- Agents IA : brique d'audience (Yield/Swarm) + exécution creative_swap/migrate_channel.
-- Appliquée en prod le 2026-06-22 (projet cvuhvppsdzrjtvrtvrlv).

create table if not exists public.audience_snapshots (
  id          bigint generated always as identity primary key,
  taken_at    timestamptz not null default now(),
  active_devices int not null default 0,
  mobile      int not null default 0,
  desktop     int not null default 0,
  tv          int not null default 0
);
create index if not exists audience_snapshots_taken_idx on public.audience_snapshots (taken_at desc);
alter table public.audience_snapshots enable row level security;

create or replace function public.record_audience_snapshot()
returns bigint language plpgsql security definer set search_path = public
as $$
declare v_id bigint;
begin
  insert into public.audience_snapshots (active_devices, mobile, desktop, tv)
  select count(*),
         count(*) filter (where device = 'mobile'),
         count(*) filter (where device = 'desktop'),
         count(*) filter (where device = 'tv')
  from public.device_presence
  where last_seen_at > now() - interval '10 minutes'
  returning id into v_id;
  return v_id;
end; $$;
grant execute on function public.record_audience_snapshot() to service_role;

-- Snapshot auto toutes les 5 min (pg_cron — hors limites cron Vercel).
create extension if not exists pg_cron;
do $$
begin
  if not exists (select 1 from cron.job where jobname = 'audience-snapshot') then
    perform cron.schedule('audience-snapshot', '*/5 * * * *', 'select public.record_audience_snapshot()');
  end if;
end $$;

-- admin_resolve étendu : seule voie d'exécution (règle d'or). Ajoute les branches
-- creative_swap + migrate_channel aux 4 d'origine. Définition COMPLÈTE (alignée prod)
-- pour qu'un replay-from-scratch des migrations ne régresse pas la prod.
create or replace function public.admin_resolve_agent_proposal(p_id uuid, p_approve boolean)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare p public.agent_proposals; v_result jsonb := '{}'::jsonb;
begin
  if not public.is_admin() then raise exception 'Accès refusé : administrateur requis' using errcode = '42501'; end if;
  select * into p from public.agent_proposals where id = p_id and status = 'pending' for update;
  if not found then raise exception 'Proposition introuvable ou déjà traitée'; end if;

  if not p_approve then
    update public.agent_proposals set status = 'rejected', resolved_at = now(), resolved_by = auth.uid() where id = p_id;
    return jsonb_build_object('status', 'rejected');
  end if;

  case p.kind
    when 'pause_campaign' then
      update public.campaigns set status = 'paused' where id = p.target_campaign_id;
      v_result := jsonb_build_object('action', 'campaign_paused');
    when 'resume_campaign' then
      update public.campaigns set status = 'active' where id = p.target_campaign_id;
      v_result := jsonb_build_object('action', 'campaign_resumed');
    when 'set_weight' then
      update public.campaigns set weight = greatest(1, least(100, coalesce((p.payload->>'weight')::int, weight)))
        where id = p.target_campaign_id;
      v_result := jsonb_build_object('action', 'weight_set', 'weight', p.payload->>'weight');
    when 'quarantine_events' then
      update public.ad_events set suspect = true
        where campaign_id = p.target_campaign_id and event_type = coalesce(p.payload->>'event_type', 'click');
      v_result := jsonb_build_object('action', 'events_quarantined');
    when 'creative_swap' then
      update public.campaigns
        set content = content
          || coalesce(jsonb_build_object('image', nullif(p.payload->>'image', '')), '{}'::jsonb)
          || coalesce(jsonb_build_object('video', nullif(p.payload->>'video', '')), '{}'::jsonb)
          || jsonb_build_object('variant', coalesce(p.payload->>'variant', 'souverain'))
        where id = p.target_campaign_id;
      v_result := jsonb_build_object('action', 'creative_swapped', 'variant', p.payload->>'variant');
    when 'migrate_channel' then
      update public.campaigns
        set target_categories = case when p.payload ? 'categories'
              then (select array_agg(value) from jsonb_array_elements_text(p.payload->'categories') value)
              else target_categories end
        where id = p.target_campaign_id;
      v_result := jsonb_build_object('action', 'retargeted', 'to', p.payload->>'to');
    else
      v_result := jsonb_build_object('action', 'noted', 'kind', p.kind);
  end case;

  update public.agent_proposals set status = 'approved', resolved_at = now(), resolved_by = auth.uid(), result = v_result where id = p_id;
  return jsonb_build_object('status', 'approved', 'result', v_result);
end; $$;
grant execute on function public.admin_resolve_agent_proposal(uuid, boolean) to authenticated;
