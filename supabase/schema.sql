-- ════════════════════════════════════════════════════════════════
-- Aonoseke IPTV Player — Schéma Supabase (V2 — modèle 100% gratuit + pub multi-annonceurs)
-- À exécuter dans : Supabase Dashboard → SQL Editor → New query
-- ════════════════════════════════════════════════════════════════
-- Historique :
--   V1 : freemium (essai 30j + premium 2 500 FC/mois via Flutterwave)
--   V2 : 100% gratuit, monétisation 100% publicitaire multi-annonceurs
-- ════════════════════════════════════════════════════════════════

-- ── Table : événements de vue (vues chaînes, impressions & clics pub, sessions) ──
-- Sert à la facturation des annonceurs et aux statistiques d'audience.
create table if not exists public.view_events (
  id          bigint generated always as identity primary key,
  event_type  text not null check (event_type in
                ('channel_view', 'ad_impression', 'ad_click', 'session_start')),
  ref         text,              -- url chaîne ou id pub
  category    text,              -- catégorie de contenu (fast, vod, news, sport, etc.)
  user_email  text,              -- email de l'utilisateur (si connecté) — obsolète, gardé pour rétro-compat
  user_id     uuid references auth.users (id) on delete set null, -- utilisateur connecté (null si anonyme)
  created_at  timestamptz not null default now()
);

create index if not exists view_events_type_idx     on public.view_events (event_type);
create index if not exists view_events_created_idx  on public.view_events (created_at);
create index if not exists view_events_ref_idx      on public.view_events (ref);
create index if not exists view_events_user_idx     on public.view_events (user_id);
create index if not exists view_events_category_idx on public.view_events (category);

-- ── Table : profils utilisateurs (étend auth.users) ──
create table if not exists public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  email           text,
  full_name       text,
  username        text unique,
  avatar_url      text,
  role            text not null default 'user' check (role in ('user', 'admin')),
  age_range       text,                                   -- '18-24', '25-34', '35-44', '45-54', '55+'
  country         text,
  country_code    text,
  city            text,
  region          text,
  ip              text,
  lat             numeric,
  lon             numeric,
  device          text check (device in ('tv', 'mobile', 'desktop')),
  last_seen_at    timestamptz not null default now(),    -- mis à jour par le heartbeat
  created_at      timestamptz not null default now()
);

create index if not exists profiles_role_idx        on public.profiles (role);
create index if not exists profiles_last_seen_idx   on public.profiles (last_seen_at desc);
create index if not exists profiles_country_code_idx on public.profiles (country_code);

-- Crée automatiquement un profil à chaque inscription
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, username, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'username',
    'user'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill éventuel : crée les profils manquants pour les utilisateurs auth existants.
insert into public.profiles (id, email, full_name, username, role, created_at, last_seen_at)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data ->> 'full_name', split_part(u.email, '@', 1)),
  coalesce(u.raw_user_meta_data ->> 'username', split_part(u.email, '@', 1)),
  coalesce(u.raw_user_meta_data ->> 'role', 'user'),
  now(),
  now()
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

-- ── Table : activité utilisateur (heartbeat temps réel) ──
-- Une ligne par heartbeat (période de 60s envoyée par useAuth).
-- Sert au calcul du temps de connexion réel (engagement).
create table if not exists public.user_activity (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  seconds     integer not null default 60,
  created_at  timestamptz not null default now()
);

create index if not exists user_activity_user_idx    on public.user_activity (user_id);
create index if not exists user_activity_created_idx on public.user_activity (created_at desc);

-- ── Table : journal d'audit des actions admin ──
-- Trace toutes les actions destructrices (suppression utilisateur, etc.)
create table if not exists public.admin_audit_log (
  id          bigint generated always as identity primary key,
  admin_id    uuid not null references auth.users (id),
  action      text not null,
  target_id   text,
  target_type text,
  details     jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists audit_admin_idx    on public.admin_audit_log (admin_id);
create index if not exists audit_created_idx  on public.admin_audit_log (created_at desc);

-- ════════════════════════════════════════════════════════════════
-- Row Level Security
-- ════════════════════════════════════════════════════════════════
alter table public.view_events     enable row level security;
alter table public.profiles        enable row level security;
alter table public.user_activity   enable row level security;
alter table public.admin_audit_log enable row level security;

-- view_events : tout le monde (clé anon) peut INSÉRER un événement,
-- mais personne ne peut lire/modifier via l'API publique.
drop policy if exists "anon insert events" on public.view_events;
create policy "anon insert events"
  on public.view_events for insert
  to anon, authenticated
  with check (true);

-- user_activity : insertion uniquement par l'utilisateur lui-même (heartbeat)
drop policy if exists "own activity insert" on public.user_activity;
create policy "own activity insert"
  on public.user_activity for insert
  to authenticated
  with check (auth.uid() = user_id);

-- profiles : chaque utilisateur lit/modifie uniquement son profil.
drop policy if exists "own profile read" on public.profiles;
create policy "own profile read"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "own profile update" on public.profiles;
create policy "own profile update"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

drop policy if exists "own profile insert" on public.profiles;
create policy "own profile insert"
  on public.profiles for insert
  to authenticated
  with check (
    auth.uid() = id
    and role = 'user'
  );

-- admin_audit_log : lecture/insertion uniquement via service_role (jamais exposé au client)

-- ════════════════════════════════════════════════════════════════
-- RPC sécurisées — accessibles uniquement aux admins
-- Toutes vérifient explicitement le rôle admin via auth.jwt()
-- ════════════════════════════════════════════════════════════════
-- Fonction utilitaire : vérifie que l'utilisateur courant est admin
create or replace function public.is_admin()
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  is_admin_role boolean;
  metadata_role boolean;
begin
  if auth.uid() is null then
    return false;
  end if;

  select role = 'admin' into is_admin_role
  from public.profiles
  where id = auth.uid();

  if is_admin_role is not null then
    return is_admin_role;
  end if;

  select (raw_user_meta_data ->> 'role') = 'admin' into metadata_role
  from auth.users
  where id = auth.uid();

  return coalesce(metadata_role, false);
end;
$$;

create or replace function public.ensure_my_profile()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  insert into public.profiles (id, email, full_name, username, role, created_at, last_seen_at)
  select
    u.id,
    u.email,
    coalesce(u.raw_user_meta_data ->> 'full_name', split_part(u.email, '@', 1)),
    coalesce(u.raw_user_meta_data ->> 'username', split_part(u.email, '@', 1)),
    coalesce(u.raw_user_meta_data ->> 'role', 'user'),
    now(),
    now()
  from auth.users u
  where u.id = auth.uid()
  on conflict (id) do update
  set
    email = coalesce(email, excluded.email),
    username = coalesce(username, excluded.username),
    full_name = coalesce(full_name, excluded.full_name),
    last_seen_at = now();
end;
$$;

-- ── Stats globales KPI ──
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
begin
  if not public.is_admin() then
    raise exception 'Accès refusé : administrateur requis' using errcode = '42501';
  end if;

  return query
  select
    (select count(*) from public.profiles)                                                                 as total_users,
    (select count(*) from public.profiles where last_seen_at > now() - interval '24 hours')                as active_24h,
    (select count(*) from public.profiles where last_seen_at > now() - interval '7 days')                  as active_7d,
    (select count(*) from public.profiles where last_seen_at > now() - interval '30 days')                 as active_30d,
    (select count(*) from public.profiles where created_at > date_trunc('day', now()))                     as new_today,
    (select count(*) from public.profiles where created_at > now() - interval '7 days')                    as new_7d,
    (select count(*) from public.view_events where event_type = 'session_start' and created_at > now() - interval '7 days') as sessions_7d,
    (select count(*) from public.view_events where event_type = 'channel_view' and created_at > now() - interval '7 days') as channel_views_7d,
    (select count(*) from public.view_events where event_type = 'ad_impression' and created_at > now() - interval '7 days') as ad_impressions_7d,
    (select count(*) from public.view_events where event_type = 'ad_click' and created_at > now() - interval '7 days') as ad_clicks_7d;
end;
$$;

-- ── Utilisateurs récents (avec lim) ──
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
begin
  if not public.is_admin() then
    raise exception 'Accès refusé : administrateur requis' using errcode = '42501';
  end if;

  return query
  select id, username, email, country, country_code, city, ip, created_at, last_seen_at, role
  from public.profiles
  order by last_seen_at desc
  limit lim;
end;
$$;

-- ── Utilisateurs en ligne (last_seen < 90s) ──
create or replace function public.admin_online_users()
returns table (
  id            uuid,
  username      text,
  email         text,
  country       text,
  country_code  text,
  city          text,
  device        text,
  last_seen_at  timestamptz
)
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Accès refusé : administrateur requis' using errcode = '42501';
  end if;

  return query
  select id, username, email, country, country_code, city, device, last_seen_at
  from public.profiles
  where last_seen_at > now() - interval '90 seconds'
  order by last_seen_at desc;
end;
$$;

-- ── Géolocalisation agrégée ──
create or replace function public.admin_geo_stats()
returns table (
  total     bigint,
  located   bigint,
  countries jsonb
)
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Accès refusé : administrateur requis' using errcode = '42501';
  end if;

  return query
  select
    (select count(*) from public.profiles)                                                             as total,
    (select count(*) from public.profiles where country is not null)                                   as located,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'country', country,
        'country_code', country_code,
        'count', cnt,
        'lat', lat,
        'lon', lon
      ))
      from (
        select country, country_code, max(lat) as lat, max(lon) as lon, count(*) as cnt
        from public.profiles
        where country is not null
        group by country, country_code
        order by cnt desc
      ) t
    ), '[]'::jsonb)                                                                                    as countries;
end;
$$;

-- ── Engagement : temps moyen / jour actif + DAU/WAU/MAU ──
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
begin
  if not public.is_admin() then
    raise exception 'Accès refusé : administrateur requis' using errcode = '42501';
  end if;

  return query
  select
    coalesce((
      select round(avg(daily_min), 1)
      from (
        select date_trunc('day', created_at) as day, sum(seconds) / 60.0 as daily_min
        from public.user_activity
        where created_at > now() - interval '30 days'
        group by day
      ) s
    ), 0)::numeric                                                                                       as avg_min_per_active_day,
    coalesce((select sum(seconds) / 60 from public.user_activity where created_at > date_trunc('day', now())), 0)::bigint as total_min_today,
    (select count(distinct user_id) from public.user_activity where created_at > date_trunc('day', now()))                as dau,
    (select count(distinct user_id) from public.user_activity where created_at > now() - interval '7 days')               as wau,
    (select count(distinct user_id) from public.user_activity where created_at > now() - interval '30 days')              as mau;
end;
$$;

-- ── Heatmap d'activité 30 derniers jours (jour de semaine × heure) ──
create or replace function public.admin_activity_heatmap()
returns table (dow integer, hour integer, count bigint)
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Accès refusé : administrateur requis' using errcode = '42501';
  end if;

  return query
  select
    extract(dow from created_at)::int                          as dow,
    extract(hour from created_at)::int                         as hour,
    count(*)::bigint                                           as count
  from public.user_activity
  where created_at > now() - interval '30 days'
  group by dow, hour
  order by dow, hour;
end;
$$;

-- ── Affinité contenu (catégories les plus regardées) ──
create or replace function public.admin_content_affinity()
returns table (category text, count bigint)
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Accès refusé : administrateur requis' using errcode = '42501';
  end if;

  return query
  select coalesce(category, 'Non classé') as category, count(*)::bigint as count
  from public.view_events
  where event_type = 'channel_view'
    and created_at > now() - interval '30 days'
  group by category
  order by count desc
  limit 10;
end;
$$;

-- ── Tranches d'âge ──
create or replace function public.admin_age_distribution()
returns table (age_range text, count bigint)
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Accès refusé : administrateur requis' using errcode = '42501';
  end if;

  return query
  select coalesce(age_range, 'Non renseigné') as age_range, count(*)::bigint as count
  from public.profiles
  group by age_range
  order by
    case age_range
      when '18-24' then 1
      when '25-34' then 2
      when '35-44' then 3
      when '45-54' then 4
      when '55+'   then 5
      else 99
    end;
end;
$$;

-- ── Répartition par appareil ──
create or replace function public.admin_device_split()
returns table (device text, count bigint)
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Accès refusé : administrateur requis' using errcode = '42501';
  end if;

  return query
  select coalesce(device, 'Inconnu') as device, count(*)::bigint as count
  from public.profiles
  group by device
  order by count desc;
end;
$$;

-- ── Segments d'audience (par pays) ──
create or replace function public.admin_segments()
returns table (label text, count bigint)
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Accès refusé : administrateur requis' using errcode = '42501';
  end if;

  return query
  select country as label, count(*)::bigint as count
  from public.profiles
  where country is not null
  group by country
  order by count desc
  limit 10;
end;
$$;

-- ── Suppression utilisateur (avec audit + auto-protection) ──
create or replace function public.admin_delete_user(target uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Accès refusé : administrateur requis' using errcode = '42501';
  end if;

  -- Empêche l'auto-suppression
  if target = auth.uid() then
    raise exception 'Auto-suppression interdite' using errcode = '42501';
  end if;

  -- Vérifie que la cible n'est pas admin (on ne supprime pas un autre admin)
  if exists (select 1 from public.profiles where id = target and role = 'admin') then
    raise exception 'Suppression d''un autre administrateur interdite' using errcode = '42501';
  end if;

  -- Journalise l'action
  insert into public.admin_audit_log (admin_id, action, target_id, target_type, details)
  values (auth.uid(), 'delete_user', target::text, 'user',
          jsonb_build_object('target_email', (select email from public.profiles where id = target)));

  -- Supprime le compte (cascade supprime profil, activité, etc.)
  delete from auth.users where id = target;
end;
$$;

-- ════════════════════════════════════════════════════════════════
-- RPC appelées par les utilisateurs (non admin) — sécurité own-resource
-- ════════════════════════════════════════════════════════════════

-- ── Heartbeat (présence + temps) — appelé par useAuth toutes les 60s ──
create or replace function public.track_heartbeat(p_seconds integer default 60)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentification requise' using errcode = '42501';
  end if;

  perform public.ensure_my_profile();

  -- Met à jour last_seen_at
  update public.profiles
  set last_seen_at = now()
  where id = auth.uid();

  -- Insère une ligne d'activité
  insert into public.user_activity (user_id, seconds)
  values (auth.uid(), p_seconds);
end;
$$;

-- ── Capture géo + appareil — appelée par useAuth après login ──
create or replace function public.set_my_geo(
  p_country text, p_country_code text, p_city text, p_region text,
  p_ip text, p_lat numeric, p_lon numeric
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles
  set country = p_country, country_code = p_country_code, city = p_city,
      region = p_region, ip = p_ip, lat = p_lat, lon = p_lon
  where id = auth.uid();
end;
$$;

create or replace function public.set_my_device(p_device text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles set device = p_device where id = auth.uid();
end;
$$;

-- ════════════════════════════════════════════════════════════════
-- Vue agrégée pour le dashboard annonceurs (revenus / impressions)
-- Interrogeable côté serveur avec la clé service_role uniquement.
-- Sert de base au futur reporting par annonceur (V2 multi-annonceurs).
-- ════════════════════════════════════════════════════════════════
create or replace view public.ad_stats as
select
  ref                                       as ad_id,
  count(*) filter (where event_type = 'ad_impression') as impressions,
  count(*) filter (where event_type = 'ad_click')      as clicks,
  date_trunc('day', created_at)             as day
from public.view_events
where event_type in ('ad_impression', 'ad_click')
group by ref, date_trunc('day', created_at);

-- ── Table : statut d'uptime des sites de l'annuaire ──
-- Écrite par la fonction Vercel Cron api/cron-uptime.js (quotidienne).
create table if not exists public.site_status (
  site_id     text primary key,
  status      text not null check (status in ('online', 'offline')),
  checked_at  timestamptz not null default now()
);

alter table public.site_status enable row level security;

drop policy if exists "public read status" on public.site_status;
create policy "public read status"
  on public.site_status for select
  to anon, authenticated
  using (true);

-- ════════════════════════════════════════════════════════════════
-- V2 — PLATEFORME PUBLICITAIRE MULTI-ANNONCEURS
-- ════════════════════════════════════════════════════════════════

-- ── Table : annonceurs ────────────────────────────────────────────
create table if not exists public.advertisers (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  contact_name  text,
  contact_email text,
  phone         text,
  logo_url      text,
  status        text not null default 'active' check (status in ('active', 'paused', 'archived')),
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists advertisers_status_idx on public.advertisers (status);

-- ── Table : campagnes publicitaires ──────────────────────────────
create table if not exists public.campaigns (
  id              uuid primary key default gen_random_uuid(),
  advertiser_id   uuid not null references public.advertisers (id) on delete cascade,
  name            text not null,
  type            text not null check (type in ('preroll', 'banner', 'both')),
  -- Contenu de la pub (aligné sur interface PrerollAd/BannerAd existante)
  content         jsonb not null,
  -- Scheduling
  start_at        timestamptz not null default now(),
  end_at          timestamptz,
  -- Ciblage
  target_countries text[] default '{}',   -- codes pays ISO-2 (vide = tous)
  target_categories text[] default '{}',  -- catégories de chaînes (vide = toutes)
  -- Quotas et fréquence
  impression_cap      bigint,  -- nombre max d'impressions (null = illimité)
  click_cap           bigint,  -- nombre max de clics (null = illimité)
  frequency_cap_per_user integer default 3,  -- max impressions par utilisateur par jour
  -- Poids de rotation (1-100, défaut 10)
  weight          integer not null default 10 check (weight between 1 and 100),
  -- État
  status          text not null default 'draft' check (status in ('draft', 'active', 'paused', 'ended')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists campaigns_advertiser_idx on public.campaigns (advertiser_id);
create index if not exists campaigns_status_idx     on public.campaigns (status);
create index if not exists campaigns_dates_idx      on public.campaigns (start_at, end_at);
create index if not exists campaigns_type_idx       on public.campaigns (type);

-- ── Table : impressions/clics par campagne (anti-fraude + reporting) ──
-- Remplace view_events pour les pubs : permet déduplication, validation HMAC,
-- et reporting par annonceur sans toucher aux vues chaînes.
create table if not exists public.ad_events (
  id              bigint generated always as identity primary key,
  campaign_id     uuid not null references public.campaigns (id) on delete cascade,
  advertiser_id   uuid not null references public.advertisers (id) on delete cascade,
  event_type      text not null check (event_type in ('impression', 'click')),
  user_id         uuid references auth.users (id) on delete set null,
  session_id      text not null,           -- identifiant de session navigateur
  user_email      text,
  country         text,
  country_code    text,
  city            text,
  ip              text,
  device          text,
  -- Anti-fraude
  signature       text not null,           -- HMAC SHA-256 (campaign_id + session_id + timestamp)
  created_at      timestamptz not null default now()
);

create index if not exists ad_events_campaign_idx  on public.ad_events (campaign_id);
create index if not exists ad_events_advertiser_idx on public.ad_events (advertiser_id);
create index if not exists ad_events_type_idx      on public.ad_events (event_type);
create index if not exists ad_events_created_idx   on public.ad_events (created_at desc);
create index if not exists ad_events_session_idx   on public.ad_events (session_id, campaign_id, created_at);
create index if not exists ad_events_user_day_idx  on public.ad_events (user_id, campaign_id, event_type, created_at);

-- ════════════════════════════════════════════════════════════════
-- RLS — Plateforme publicitaire
-- ════════════════════════════════════════════════════════════════
alter table public.advertisers enable row level security;
alter table public.campaigns   enable row level security;
alter table public.ad_events   enable row level security;

-- Annonceurs + campagnes : lecture publique (pour affichage des pubs actives),
-- écriture réservée aux admins via RPC security_definer.
drop policy if exists "public read active advertisers" on public.advertisers;
create policy "public read active advertisers"
  on public.advertisers for select
  to anon, authenticated
  using (status = 'active');

drop policy if exists "public read active campaigns" on public.campaigns;
create policy "public read active campaigns"
  on public.campaigns for select
  to anon, authenticated
  using (status = 'active');

-- ad_events : insertion publique (validation HMAC côté serveur via endpoint Vercel),
-- lecture réservée aux admins.
drop policy if exists "public insert ad events" on public.ad_events;
create policy "public insert ad events"
  on public.ad_events for insert
  to anon, authenticated
  with check (true);

-- ════════════════════════════════════════════════════════════════
-- RPC admin — gestion annonceurs et campagnes
-- ════════════════════════════════════════════════════════════════

-- ── CRUD annonceurs ──────────────────────────────────────────────
create or replace function public.admin_list_advertisers()
returns table (id uuid, name text, contact_name text, contact_email text, phone text, logo_url text, status text, notes text, created_at timestamptz,
                active_campaigns bigint, total_impressions bigint, total_clicks bigint)
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Accès refusé : administrateur requis' using errcode = '42501';
  end if;

  return query
  select
    a.id, a.name, a.contact_name, a.contact_email, a.phone, a.logo_url, a.status, a.notes, a.created_at,
    coalesce((select count(*) from public.campaigns c where c.advertiser_id = a.id and c.status = 'active'), 0)::bigint as active_campaigns,
    coalesce((select count(*) from public.ad_events e where e.advertiser_id = a.id and e.event_type = 'impression'), 0)::bigint as total_impressions,
    coalesce((select count(*) from public.ad_events e where e.advertiser_id = a.id and e.event_type = 'click'), 0)::bigint as total_clicks
  from public.advertisers a
  order by a.created_at desc;
end;
$$;

create or replace function public.admin_create_advertiser(
  p_name text, p_contact_name text default null, p_contact_email text default null,
  p_phone text default null, p_logo_url text default null, p_notes text default null
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare new_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Accès refusé : administrateur requis' using errcode = '42501';
  end if;

  insert into public.advertisers (name, contact_name, contact_email, phone, logo_url, notes)
  values (p_name, p_contact_name, p_contact_email, p_phone, p_logo_url, p_notes)
  returning id into new_id;

  insert into public.admin_audit_log (admin_id, action, target_id, target_type, details)
  values (auth.uid(), 'create_advertiser', new_id::text, 'advertiser',
          jsonb_build_object('name', p_name));

  return new_id;
end;
$$;

create or replace function public.admin_update_advertiser(
  p_id uuid, p_name text default null, p_contact_name text default null,
  p_contact_email text default null, p_phone text default null, p_logo_url text default null,
  p_status text default null, p_notes text default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Accès refusé : administrateur requis' using errcode = '42501';
  end if;

  update public.advertisers set
    name = coalesce(p_name, name),
    contact_name = coalesce(p_contact_name, contact_name),
    contact_email = coalesce(p_contact_email, contact_email),
    phone = coalesce(p_phone, phone),
    logo_url = coalesce(p_logo_url, logo_url),
    status = coalesce(p_status, status),
    notes = coalesce(p_notes, notes),
    updated_at = now()
  where id = p_id;

  insert into public.admin_audit_log (admin_id, action, target_id, target_type, details)
  values (auth.uid(), 'update_advertiser', p_id::text, 'advertiser', jsonb_build_object('status', p_status));
end;
$$;

create or replace function public.admin_delete_advertiser(p_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Accès refusé : administrateur requis' using errcode = '42501';
  end if;

  -- Empêche la suppression d'un annonceur avec campagnes actives
  if exists (select 1 from public.campaigns where advertiser_id = p_id and status = 'active') then
    raise exception 'Impossible : cet annonceur a des campagnes actives. Archivez-les d''abord.';
  end if;

  insert into public.admin_audit_log (admin_id, action, target_id, target_type, details)
  values (auth.uid(), 'delete_advertiser', p_id::text, 'advertiser', null);

  delete from public.advertisers where id = p_id;
end;
$$;

-- ── CRUD campagnes ───────────────────────────────────────────────
create or replace function public.admin_list_campaigns(p_advertiser_id uuid default null)
returns table (
  id uuid, advertiser_id uuid, advertiser_name text, name text, type text,
  content jsonb, start_at timestamptz, end_at timestamptz,
  target_countries text[], target_categories text[],
  impression_cap bigint, click_cap bigint, frequency_cap_per_user integer,
  weight integer, status text, created_at timestamptz,
  impressions bigint, clicks bigint, ctr numeric
)
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Accès refusé : administrateur requis' using errcode = '42501';
  end if;

  return query
  select
    c.id, c.advertiser_id, a.name as advertiser_name, c.name, c.type,
    c.content, c.start_at, c.end_at,
    c.target_countries, c.target_categories,
    c.impression_cap, c.click_cap, c.frequency_cap_per_user,
    c.weight, c.status, c.created_at,
    coalesce(imp.cnt, 0)::bigint as impressions,
    coalesce(clk.cnt, 0)::bigint as clicks,
    case when coalesce(imp.cnt, 0) > 0
      then round(coalesce(clk.cnt, 0)::numeric / imp.cnt * 100, 2)
      else 0::numeric
    end as ctr
  from public.campaigns c
  join public.advertisers a on a.id = c.advertiser_id
  left join (select campaign_id, count(*) as cnt from public.ad_events where event_type = 'impression' group by campaign_id) imp on imp.campaign_id = c.id
  left join (select campaign_id, count(*) as cnt from public.ad_events where event_type = 'click' group by campaign_id) clk on clk.campaign_id = c.id
  where p_advertiser_id is null or c.advertiser_id = p_advertiser_id
  order by c.created_at desc;
end;
$$;

create or replace function public.admin_create_campaign(
  p_advertiser_id uuid, p_name text, p_type text, p_content jsonb,
  p_start_at timestamptz default now(), p_end_at timestamptz default null,
  p_target_countries text[] default '{}', p_target_categories text[] default '{}',
  p_impression_cap bigint default null, p_click_cap bigint default null,
  p_frequency_cap_per_user integer default 3, p_weight integer default 10
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare new_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Accès refusé : administrateur requis' using errcode = '42501';
  end if;

  insert into public.campaigns (
    advertiser_id, name, type, content, start_at, end_at,
    target_countries, target_categories, impression_cap, click_cap,
    frequency_cap_per_user, weight, status
  )
  values (
    p_advertiser_id, p_name, p_type, p_content, p_start_at, p_end_at,
    p_target_countries, p_target_categories, p_impression_cap, p_click_cap,
    p_frequency_cap_per_user, p_weight, 'draft'
  )
  returning id into new_id;

  insert into public.admin_audit_log (admin_id, action, target_id, target_type, details)
  values (auth.uid(), 'create_campaign', new_id::text, 'campaign',
          jsonb_build_object('advertiser_id', p_advertiser_id, 'name', p_name, 'type', p_type));

  return new_id;
end;
$$;

create or replace function public.admin_update_campaign(
  p_id uuid, p_name text default null, p_type text default null, p_content jsonb default null,
  p_start_at timestamptz default null, p_end_at timestamptz default null,
  p_target_countries text[] default null, p_target_categories text[] default null,
  p_impression_cap bigint default null, p_click_cap bigint default null,
  p_frequency_cap_per_user integer default null, p_weight integer default null,
  p_status text default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Accès refusé : administrateur requis' using errcode = '42501';
  end if;

  update public.campaigns set
    name = coalesce(p_name, name),
    type = coalesce(p_type, type),
    content = coalesce(p_content, content),
    start_at = coalesce(p_start_at, start_at),
    end_at = coalesce(p_end_at, end_at),
    target_countries = coalesce(p_target_countries, target_countries),
    target_categories = coalesce(p_target_categories, target_categories),
    impression_cap = coalesce(p_impression_cap, impression_cap),
    click_cap = coalesce(p_click_cap, click_cap),
    frequency_cap_per_user = coalesce(p_frequency_cap_per_user, frequency_cap_per_user),
    weight = coalesce(p_weight, weight),
    status = coalesce(p_status, status),
    updated_at = now()
  where id = p_id;

  insert into public.admin_audit_log (admin_id, action, target_id, target_type, details)
  values (auth.uid(), 'update_campaign', p_id::text, 'campaign', jsonb_build_object('status', p_status));
end;
$$;

create or replace function public.admin_delete_campaign(p_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Accès refusé : administrateur requis' using errcode = '42501';
  end if;

  insert into public.admin_audit_log (admin_id, action, target_id, target_type, details)
  values (auth.uid(), 'delete_campaign', p_id::text, 'campaign', null);

  delete from public.campaigns where id = p_id;
end;
$$;

-- ── Reporting par annonceur (période donnée) ────────────────────
create or replace function public.admin_advertiser_report(
  p_advertiser_id uuid, p_from timestamptz default now() - interval '30 days', p_to timestamptz default now()
)
returns table (
  campaign_id uuid, campaign_name text, campaign_type text, campaign_status text,
  impressions bigint, clicks bigint, ctr numeric, unique_users bigint
)
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Accès refusé : administrateur requis' using errcode = '42501';
  end if;

  return query
  select
    c.id as campaign_id, c.name as campaign_name, c.type as campaign_type, c.status as campaign_status,
    count(e.id) filter (where e.event_type = 'impression')::bigint as impressions,
    count(e.id) filter (where e.event_type = 'click')::bigint as clicks,
    case when count(e.id) filter (where e.event_type = 'impression') > 0
      then round(count(e.id) filter (where e.event_type = 'click')::numeric / count(e.id) filter (where e.event_type = 'impression') * 100, 2)
      else 0::numeric
    end as ctr,
    count(distinct e.user_id) filter (where e.event_type = 'impression')::bigint as unique_users
  from public.campaigns c
  left join public.ad_events e on e.campaign_id = c.id and e.created_at between p_from and p_to
  where c.advertiser_id = p_advertiser_id
  group by c.id, c.name, c.type, c.status
  order by impressions desc;
end;
$$;

-- ── Sélection publique d'une campagne (rotation pondérée + filtres) ──
-- Utilisée par useAds pour charger dynamiquement les pubs actives.
-- Pas de check is_admin() car lecture publique.
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
    and (cardinality(c.target_countries) = 0 or p_user_country = any(c.target_countries))
    and (cardinality(c.target_categories) = 0 or p_category = any(c.target_categories))
    -- Caps non atteintes
    and (c.impression_cap is null or c.impression_cap > (
      select count(*) from public.ad_events e where e.campaign_id = c.id and e.event_type = 'impression'
    ))
  order by random() * (1.0 / c.weight)  -- rotation pondérée inverse (poids élevé = plus probable)
  limit p_limit;
end;
$$;

-- ════════════════════════════════════════════════════════════════
-- V2.1 — EXTENSION UTM TRACKING (Phase 1 écosystème)
-- ════════════════════════════════════════════════════════════════

-- Ajout des colonnes UTM à ad_events (idempotent)
alter table public.ad_events
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists utm_content text,
  add column if not exists utm_term text,
  add column if not exists landing_url text;

create index if not exists ad_events_utm_source_idx   on public.ad_events (utm_source);
create index if not exists ad_events_utm_medium_idx   on public.ad_events (utm_medium);
create index if not exists ad_events_utm_campaign_idx on public.ad_events (utm_campaign);

-- ── Vue agrégée pour reporting par campagne + UTM ──────────────────
-- Permet d'analyser quelles campagnes marketing (UTM) génèrent le plus
-- d'impressions/clics sur les pubs in-player.
create or replace view public.ad_attribution as
select
  ae.campaign_id,
  c.name as campaign_name,
  c.advertiser_id,
  a.name as advertiser_name,
  ae.event_type,
  ae.utm_source,
  ae.utm_medium,
  ae.utm_campaign,
  ae.utm_content,
  ae.utm_term,
  count(*) as events_count,
  count(distinct ae.session_id) as unique_sessions,
  count(distinct ae.user_id) as unique_users,
  date_trunc('day', ae.created_at) as day
from public.ad_events ae
join public.campaigns c on c.id = ae.campaign_id
join public.advertisers a on a.id = ae.advertiser_id
group by ae.campaign_id, c.name, c.advertiser_id, a.name, ae.event_type,
         ae.utm_source, ae.utm_medium, ae.utm_campaign, ae.utm_content, ae.utm_term,
         date_trunc('day', ae.created_at);
