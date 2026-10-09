-- ════════════════════════════════════════════════════════════════════════════
-- Régie publicitaire — corrections de logique (idempotent, relançable)
--
--  1. get_active_campaigns : quand le lecteur ne précise ni pays ni catégorie (cas actuel),
--     une campagne ciblée était EXCLUE (comparaison avec NULL). Désormais : paramètre non fourni
--     = pas de filtre sur ce critère. Rotation réellement proportionnelle au poids
--     (course exponentielle) et plafond d'impressions sans les événements en quarantaine.
--  2. admin_resolve_agent_proposal :
--     - quarantine_events : ne marque QUE les clics suspects désignés par l'agent (IP / signature,
--       depuis `since`), au lieu de tous les clics de la campagne depuis toujours ;
--     - migrate_channel : AJOUTE les catégories au ciblage existant (plus d'écrasement) et garde
--       l'ancienne valeur dans le résultat pour pouvoir revenir en arrière ;
--     - creative_swap : n'applique qu'une variante que le lecteur sait afficher.
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.get_active_campaigns(
  p_user_country text default null, p_category text default null, p_limit integer default 10
)
returns table (
  id uuid, advertiser_id uuid, advertiser_name text, name text, type text,
  content jsonb, weight integer,
  frequency_cap_per_user integer, p_session_id text
)
language plpgsql
security definer set search_path = public
as $$
#variable_conflict use_column
begin
  return query
  select
    c.id, c.advertiser_id, a.name as advertiser_name, c.name, c.type,
    c.content, c.weight, c.frequency_cap_per_user,
    null::text as p_session_id
  from public.campaigns c
  join public.advertisers a on a.id = c.advertiser_id and a.status = 'active'
  where c.status = 'active'
    and now() >= c.start_at
    and (c.end_at is null or now() <= c.end_at)
    -- critère non fourni par le lecteur = pas de filtre (avant : campagne ciblée jamais diffusée)
    and (cardinality(c.target_countries) = 0 or p_user_country is null or p_user_country = any(c.target_countries))
    and (cardinality(c.target_categories) = 0 or p_category is null or p_category = any(c.target_categories))
    and (c.impression_cap is null or c.impression_cap > (
      select count(*) from public.ad_events e
      where e.campaign_id = c.id and e.event_type = 'impression' and not e.suspect
    ))
  -- Course exponentielle : P(campagne en tête) = poids / somme des poids.
  order by (-ln(1.0 - random()) / greatest(c.weight, 1))
  limit greatest(coalesce(p_limit, 10), 1);
end;
$$;

create or replace function public.admin_resolve_agent_proposal(p_id uuid, p_approve boolean)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  p public.agent_proposals;
  v_result jsonb := '{}'::jsonb;
  v_since timestamptz;
  v_ips text[];
  v_sigs text[];
  v_n integer;
  v_prev text[];
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
      -- Fenêtre analysée par l'agent (24 h par défaut pour les anciennes propositions).
      v_since := coalesce((p.payload->>'since')::timestamptz, p.created_at - interval '24 hours');
      v_ips  := coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p.payload->'ips', '[]'::jsonb)) x), '{}');
      v_sigs := coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p.payload->'signatures', '[]'::jsonb)) x), '{}');
      update public.ad_events e set suspect = true
        where e.campaign_id = p.target_campaign_id
          and e.event_type = coalesce(p.payload->>'event_type', 'click')
          and e.created_at >= v_since
          and e.created_at <= p.created_at
          and not e.suspect
          -- si l'agent a désigné des IP / signatures, on ne touche qu'à elles ;
          -- sinon (CTR anormal global) on marque la fenêtre analysée.
          and (
            (cardinality(v_ips) = 0 and cardinality(v_sigs) = 0)
            or e.ip = any(v_ips) or e.signature = any(v_sigs)
          );
      get diagnostics v_n = row_count;
      v_result := jsonb_build_object('action', 'events_quarantined', 'count', v_n, 'since', v_since);
    when 'creative_swap' then
      -- Variantes que le lecteur sait afficher ; toute autre est notée sans toucher à la campagne.
      if coalesce(p.payload->>'variant', 'souverain') in ('souverain', 'corridor') then
        update public.campaigns
          set content = content
            || coalesce(jsonb_build_object('image', nullif(p.payload->>'image', '')), '{}'::jsonb)
            || coalesce(jsonb_build_object('video', nullif(p.payload->>'video', '')), '{}'::jsonb)
            || jsonb_build_object('variant', coalesce(p.payload->>'variant', 'souverain'))
          where id = p.target_campaign_id;
        v_result := jsonb_build_object('action', 'creative_swapped', 'variant', p.payload->>'variant');
      else
        v_result := jsonb_build_object('action', 'noted', 'kind', p.kind, 'reason', 'variante non gérée par le lecteur');
      end if;
    when 'migrate_channel' then
      select target_categories into v_prev from public.campaigns where id = p.target_campaign_id;
      if p.payload ? 'categories' then
        update public.campaigns
          set target_categories = array(
            select distinct x from unnest(coalesce(target_categories, '{}') || coalesce(
              (select array_agg(value) from jsonb_array_elements_text(p.payload->'categories') value), '{}')) x)
          where id = p.target_campaign_id;
      end if;
      v_result := jsonb_build_object('action', 'retargeted', 'to', p.payload->>'to', 'previous_categories', to_jsonb(coalesce(v_prev, '{}')));
    else
      v_result := jsonb_build_object('action', 'noted', 'kind', p.kind);
  end case;

  update public.agent_proposals set status = 'approved', resolved_at = now(), resolved_by = auth.uid(), result = v_result where id = p_id;
  return jsonb_build_object('status', 'approved', 'result', v_result);
end; $$;

revoke all on function public.admin_resolve_agent_proposal(uuid, boolean) from public;
grant execute on function public.admin_resolve_agent_proposal(uuid, boolean) to authenticated;
