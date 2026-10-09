-- ════════════════════════════════════════════════════════════════════════════
-- Tableau de bord admin — cohérence de la logique de traitement des données
-- À exécuter dans : Supabase → SQL Editor (sans risque à relancer : tout est idempotent)
--
-- Corrige :
--  1. 4 fonctions qui échouaient à l'exécution (« column reference is ambiguous » /
--     « must appear in the GROUP BY clause ») : admin_engagement, admin_content_affinity,
--     admin_age_distribution, admin_device_split.
--  2. « Temps moyen / jour actif » : calculait le TOTAL des minutes de la plateforme par jour,
--     pas la moyenne par utilisateur actif.
--  3. « Heures de pointe » : user_activity n'a qu'UNE ligne par utilisateur et par jour, la heatmap
--     montrait donc seulement l'heure de première connexion (en UTC). Nouvelle table horaire,
--     affichage en heure de Kinshasa.
--  4. Fuseau : « aujourd'hui » était coupé à minuit UTC (01 h à Kinshasa).
--  5. Heartbeat : chaque appel ajoutait 60 s même en rafale (changements d'onglet) → temps gonflé.
--     Le crédit est désormais limité au temps réellement écoulé.
--  6. « Segments d'audience » dupliquait la liste des pays : vrais segments (somme = inscrits).
--  7. admin_recent_users : borne la taille demandée.
--  8. view_events : un anonyme pouvait insérer n'importe quoi (faux clics au nom d'un autre
--     utilisateur) → contrôles de contenu.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Fuseau métier : Kinshasa (UTC+1, sans heure d'été) ──────────────────────
create or replace function public.app_today()
returns date
language sql stable
set search_path = public
as $$ select (now() at time zone 'Africa/Kinshasa')::date $$;

-- ── Activité horaire (alimente la heatmap « heures de pointe ») ─────────────
create table if not exists public.user_activity_hourly (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  hour_start timestamptz not null,
  seconds    integer     not null default 0,
  primary key (user_id, hour_start)
);
create index if not exists user_activity_hourly_hour_idx on public.user_activity_hourly (hour_start);
-- RLS activée SANS politique : seule la fonction security definer track_heartbeat écrit,
-- seules les RPC admin lisent.
alter table public.user_activity_hourly enable row level security;

-- ── Heartbeat : crédit = temps réellement écoulé (plafonné) ─────────────────
create or replace function public.track_heartbeat(p_seconds integer default 60)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_last timestamptz;
  v_gap  numeric;
  v_cap  integer := least(greatest(coalesce(p_seconds, 60), 0), 60);
  v_add  integer;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise' using errcode = '42501';
  end if;

  -- À lire AVANT ensure_my_profile() (qui remet last_seen_at à now()).
  select last_seen_at into v_last from public.profiles where id = auth.uid();

  perform public.ensure_my_profile();

  v_gap := case when v_last is null then null else extract(epoch from (now() - v_last)) end;
  v_add := case
    when v_gap is null or v_gap >= 150 then least(v_cap, 30)   -- début de session / retour après absence : crédit forfaitaire
    else least(floor(v_gap)::integer, v_cap)                   -- battement régulier : temps écoulé, jamais plus que le plafond
  end;

  update public.profiles set last_seen_at = now() where id = auth.uid();

  if v_add > 0 then
    insert into public.user_activity (user_id, day, seconds)
    values (auth.uid(), public.app_today(), v_add)
    on conflict (user_id, day) do update
      set seconds = public.user_activity.seconds + excluded.seconds;

    insert into public.user_activity_hourly (user_id, hour_start, seconds)
    values (auth.uid(), date_trunc('hour', now()), v_add)
    on conflict (user_id, hour_start) do update
      set seconds = public.user_activity_hourly.seconds + excluded.seconds;
  end if;
end;
$$;

-- ── KPI globaux ─────────────────────────────────────────────────────────────
create or replace function public.admin_stats()
returns table (
  total_users         bigint,
  active_24h          bigint,
  active_7d           bigint,
  active_30d          bigint,
  new_today           bigint,
  new_7d              bigint,
  sessions_7d         bigint,
  channel_views_7d    bigint,
  ad_impressions_7d   bigint,
  ad_clicks_7d        bigint
)
language plpgsql
security definer set search_path = public
as $$
#variable_conflict use_column
declare
  v_midnight timestamptz := public.app_today()::timestamp at time zone 'Africa/Kinshasa';
begin
  if not public.is_admin() then
    raise exception 'Accès refusé : administrateur requis' using errcode = '42501';
  end if;

  return query
  select
    (select count(*) from public.profiles),
    (select count(*) from public.profiles p where p.last_seen_at > now() - interval '24 hours'),
    (select count(*) from public.profiles p where p.last_seen_at > now() - interval '7 days'),
    (select count(*) from public.profiles p where p.last_seen_at > now() - interval '30 days'),
    (select count(*) from public.profiles p where p.created_at >= v_midnight),
    (select count(*) from public.profiles p where p.created_at > now() - interval '7 days'),
    (select count(*) from public.view_events e where e.event_type = 'session_start' and e.created_at > now() - interval '7 days'),
    (select count(*) from public.view_events e where e.event_type = 'channel_view'  and e.created_at > now() - interval '7 days'),
    (select count(*) from public.view_events e where e.event_type = 'ad_impression' and e.created_at > now() - interval '7 days'),
    (select count(*) from public.view_events e where e.event_type = 'ad_click'      and e.created_at > now() - interval '7 days');
end;
$$;

-- ── Derniers utilisateurs actifs (taille bornée) ────────────────────────────
create or replace function public.admin_recent_users(lim integer default 100)
returns table (
  id            uuid,
  username      text,
  email         text,
  country       text,
  country_code  text,
  city          text,
  ip            text,
  created_at    timestamptz,
  last_seen_at  timestamptz,
  role          text
)
language plpgsql
security definer set search_path = public
as $$
#variable_conflict use_column
begin
  if not public.is_admin() then
    raise exception 'Accès refusé : administrateur requis' using errcode = '42501';
  end if;

  return query
  select p.id, p.username, p.email, p.country, p.country_code, p.city, p.ip, p.created_at, p.last_seen_at, p.role
  from public.profiles p
  order by p.last_seen_at desc
  limit least(greatest(coalesce(lim, 100), 1), 500);
end;
$$;

-- ── Engagement (jour civil de Kinshasa) ─────────────────────────────────────
create or replace function public.admin_engagement()
returns table (
  avg_min_per_active_day  numeric,
  total_min_today         bigint,
  dau                     bigint,
  wau                     bigint,
  mau                     bigint
)
language plpgsql
security definer set search_path = public
as $$
#variable_conflict use_column
declare
  v_today date := public.app_today();
begin
  if not public.is_admin() then
    raise exception 'Accès refusé : administrateur requis' using errcode = '42501';
  end if;

  return query
  select
    -- minutes moyennes par utilisateur actif ET par jour (30 derniers jours)
    coalesce((
      select round(sum(a.seconds) / 60.0 / nullif(count(*), 0), 1)
      from public.user_activity a
      where a.day > v_today - 30 and a.seconds > 0
    ), 0)::numeric,
    coalesce((select round(sum(a.seconds) / 60.0) from public.user_activity a where a.day = v_today), 0)::bigint,
    (select count(distinct a.user_id) from public.user_activity a where a.day = v_today and a.seconds > 0),
    (select count(distinct a.user_id) from public.user_activity a where a.day > v_today - 7  and a.seconds > 0),
    (select count(distinct a.user_id) from public.user_activity a where a.day > v_today - 30 and a.seconds > 0);
end;
$$;

-- ── Heures de pointe : minutes d'activité par jour de semaine × heure (Kinshasa) ──
create or replace function public.admin_activity_heatmap()
returns table (dow integer, hour integer, count bigint)
language plpgsql
security definer set search_path = public
as $$
#variable_conflict use_column
begin
  if not public.is_admin() then
    raise exception 'Accès refusé : administrateur requis' using errcode = '42501';
  end if;

  return query
  select
    extract(dow  from h.hour_start at time zone 'Africa/Kinshasa')::integer,
    extract(hour from h.hour_start at time zone 'Africa/Kinshasa')::integer,
    round(sum(h.seconds) / 60.0)::bigint
  from public.user_activity_hourly h
  where h.hour_start > now() - interval '30 days'
  group by 1, 2
  order by 1, 2;
end;
$$;

-- ── Catégories (groupes de chaînes) les plus regardées ──────────────────────
create or replace function public.admin_content_affinity()
returns table (category text, count bigint)
language plpgsql
security definer set search_path = public
as $$
#variable_conflict use_column
begin
  if not public.is_admin() then
    raise exception 'Accès refusé : administrateur requis' using errcode = '42501';
  end if;

  return query
  select coalesce(e.category, 'Non classé')::text, count(*)::bigint
  from public.view_events e
  where e.event_type = 'channel_view'
    and e.created_at > now() - interval '30 days'
  group by 1
  order by 2 desc
  limit 10;
end;
$$;

-- ── Tranches d'âge ──────────────────────────────────────────────────────────
create or replace function public.admin_age_distribution()
returns table (age_range text, count bigint)
language plpgsql
security definer set search_path = public
as $$
#variable_conflict use_column
begin
  if not public.is_admin() then
    raise exception 'Accès refusé : administrateur requis' using errcode = '42501';
  end if;

  return query
  select coalesce(p.age_range, 'Non renseigné')::text, count(*)::bigint
  from public.profiles p
  group by p.age_range
  order by
    case p.age_range
      when '18-24' then 1
      when '25-34' then 2
      when '35-44' then 3
      when '45-54' then 4
      when '55+'   then 5
      else 99
    end;
end;
$$;

-- ── Appareils ───────────────────────────────────────────────────────────────
create or replace function public.admin_device_split()
returns table (device text, count bigint)
language plpgsql
security definer set search_path = public
as $$
#variable_conflict use_column
begin
  if not public.is_admin() then
    raise exception 'Accès refusé : administrateur requis' using errcode = '42501';
  end if;

  return query
  select coalesce(p.device, 'Inconnu')::text, count(*)::bigint
  from public.profiles p
  group by p.device
  order by 2 desc;
end;
$$;

-- ── Segments d'audience : exclusifs, leur somme = « Inscrits (total) » ──────
create or replace function public.admin_segments()
returns table (label text, count bigint)
language plpgsql
security definer set search_path = public
as $$
#variable_conflict use_column
begin
  if not public.is_admin() then
    raise exception 'Accès refusé : administrateur requis' using errcode = '42501';
  end if;

  return query
  select s.label, count(*)::bigint
  from (
    select case
      when p.created_at > now() - interval '7 days'      then 'Nouveaux (inscrits < 7 jours)'
      when p.last_seen_at > now() - interval '7 days'    then 'Réguliers (actifs < 7 jours)'
      when p.last_seen_at > now() - interval '30 days'   then 'À réactiver (inactifs 7–30 jours)'
      else                                                    'Dormants (inactifs > 30 jours)'
    end as label
    from public.profiles p
  ) s
  group by s.label
  order by count(*) desc;
end;
$$;

-- ── Événements publics : contenu contrôlé ───────────────────────────────────
do $$
declare
  v_email_clause text := '';
begin
  -- Selon l'historique de la base, view_events peut ne pas avoir la colonne obsolète user_email.
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'view_events' and column_name = 'user_email'
  ) then
    v_email_clause := ' and user_email is null';
  end if;

  execute 'drop policy if exists "anon insert events" on public.view_events';
  execute 'create policy "anon insert events" on public.view_events for insert to anon, authenticated with check ('
    || 'event_type in (''channel_view'', ''ad_impression'', ''ad_click'', ''session_start'')'
    || ' and (ref is null or char_length(ref) <= 300)'
    || ' and (category is null or char_length(category) <= 100)'
    || v_email_clause
    || ' and (user_id is null or user_id = auth.uid()))';
end $$;
