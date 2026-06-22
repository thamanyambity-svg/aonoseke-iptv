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

-- admin_resolve étendu : creative_swap + migrate_channel exécutent du réel.
-- (corps complet : voir 20260621090000_agent_proposals_approval_socle.sql + ces 2 branches)
-- NB: le CREATE OR REPLACE complet est appliqué en prod ; ce fichier documente l'ajout.
