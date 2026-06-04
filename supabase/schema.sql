-- ════════════════════════════════════════════════════════════════
-- Aonoseke IPTV Player Pro — Schéma Supabase
-- À exécuter dans : Supabase Dashboard → SQL Editor → New query
-- ════════════════════════════════════════════════════════════════

-- ── Table : événements de vue (vues chaînes, impressions & clics pub) ──
-- Sert à la facturation des annonceurs et aux statistiques d'audience.
create table if not exists public.view_events (
  id          bigint generated always as identity primary key,
  event_type  text not null check (event_type in
                ('channel_view', 'ad_impression', 'ad_click', 'session_start')),
  ref         text,              -- url chaîne ou id pub
  user_email  text,             -- email de l'utilisateur (si connecté)
  created_at  timestamptz not null default now()
);

create index if not exists view_events_type_idx on public.view_events (event_type);
create index if not exists view_events_created_idx on public.view_events (created_at);
create index if not exists view_events_ref_idx on public.view_events (ref);

-- ── Table : profils utilisateurs (étend auth.users) ──
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

-- Crée automatiquement un profil à chaque inscription
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ════════════════════════════════════════════════════════════════
-- Row Level Security
-- ════════════════════════════════════════════════════════════════
alter table public.view_events enable row level security;
alter table public.profiles    enable row level security;

-- view_events : tout le monde (clé anon) peut INSÉRER un événement,
-- mais personne ne peut lire/modifier via l'API publique.
drop policy if exists "anon insert events" on public.view_events;
create policy "anon insert events"
  on public.view_events for insert
  to anon, authenticated
  with check (true);

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

-- ════════════════════════════════════════════════════════════════
-- Vue agrégée pour le dashboard annonceurs (revenus / impressions)
-- Interrogeable côté serveur avec la clé service_role uniquement.
-- ════════════════════════════════════════════════════════════════
create or replace view public.ad_stats as
select
  ref                                   as ad_id,
  count(*) filter (where event_type = 'ad_impression') as impressions,
  count(*) filter (where event_type = 'ad_click')      as clicks,
  date_trunc('day', created_at)         as day
from public.view_events
where event_type in ('ad_impression', 'ad_click')
group by ref, date_trunc('day', created_at);
