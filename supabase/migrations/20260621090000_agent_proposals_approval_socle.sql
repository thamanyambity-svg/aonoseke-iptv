-- Socle d'approbation des agents IA (Smart-Stream Ad Matrix).
-- Appliquée en prod le 2026-06-21 (projet cvuhvppsdzrjtvrtvrlv / aonoseke-iptv).
-- Règle d'or : les agents (jobs serveur) n'écrivent QUE des propositions ici
-- (statut 'pending'). AUCUNE mutation des tables pub sans VALIDER explicite admin.

create table if not exists public.agent_proposals (
  id                 uuid primary key default gen_random_uuid(),
  agent              text not null check (agent in ('yield','swarm','context','sentinel')),
  kind               text not null,
  title              text not null,
  summary            text not null,
  payload            jsonb not null default '{}'::jsonb,
  target_campaign_id uuid references public.campaigns(id) on delete cascade,
  confidence         numeric not null default 0.5 check (confidence >= 0 and confidence <= 1),
  status             text not null default 'pending' check (status in ('pending','approved','rejected','expired')),
  created_at         timestamptz not null default now(),
  resolved_at        timestamptz,
  resolved_by        uuid references auth.users(id) on delete set null,
  result             jsonb
);
create index if not exists agent_proposals_status_idx on public.agent_proposals (status, created_at desc);

alter table public.agent_proposals enable row level security;

-- Colonne anti-fraude pour Sentinel (quarantaine, PAS suppression — auditable).
alter table public.ad_events add column if not exists suspect boolean not null default false;

create or replace function public.agent_propose(
  p_agent text, p_kind text, p_title text, p_summary text,
  p_payload jsonb default '{}'::jsonb, p_target_campaign_id uuid default null, p_confidence numeric default 0.5
) returns uuid language plpgsql
security definer set search_path = public
as $$
declare v_id uuid;
begin
  insert into public.agent_proposals (agent, kind, title, summary, payload, target_campaign_id, confidence)
  values (p_agent, p_kind, p_title, p_summary, coalesce(p_payload, '{}'::jsonb), p_target_campaign_id,
          greatest(0, least(1, coalesce(p_confidence, 0.5))))
  returning id into v_id;
  return v_id;
end; $$;

create or replace function public.admin_list_agent_proposals(p_status text default 'pending')
returns setof public.agent_proposals
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Accès refusé : administrateur requis' using errcode = '42501'; end if;
  return query
    select * from public.agent_proposals
    where (p_status is null or status = p_status)
    order by created_at desc limit 100;
end; $$;

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
      v_result := jsonb_build_object('action', 'campaign_paused', 'campaign_id', p.target_campaign_id);
    when 'resume_campaign' then
      update public.campaigns set status = 'active' where id = p.target_campaign_id;
      v_result := jsonb_build_object('action', 'campaign_resumed', 'campaign_id', p.target_campaign_id);
    when 'set_weight' then
      update public.campaigns set weight = greatest(1, coalesce((p.payload->>'weight')::int, weight)) where id = p.target_campaign_id;
      v_result := jsonb_build_object('action', 'weight_set', 'weight', p.payload->>'weight');
    when 'quarantine_events' then
      update public.ad_events set suspect = true
        where campaign_id = p.target_campaign_id and event_type = coalesce(p.payload->>'event_type', 'click');
      v_result := jsonb_build_object('action', 'events_quarantined', 'campaign_id', p.target_campaign_id);
    else
      v_result := jsonb_build_object('action', 'noted', 'kind', p.kind);
  end case;

  update public.agent_proposals set status = 'approved', resolved_at = now(), resolved_by = auth.uid(), result = v_result where id = p_id;
  return jsonb_build_object('status', 'approved', 'result', v_result);
end; $$;

revoke all on function public.agent_propose(text, text, text, text, jsonb, uuid, numeric) from public;
grant execute on function public.agent_propose(text, text, text, text, jsonb, uuid, numeric) to service_role;
revoke all on function public.admin_list_agent_proposals(text) from public;
grant execute on function public.admin_list_agent_proposals(text) to authenticated;
revoke all on function public.admin_resolve_agent_proposal(uuid, boolean) from public;
grant execute on function public.admin_resolve_agent_proposal(uuid, boolean) to authenticated;
