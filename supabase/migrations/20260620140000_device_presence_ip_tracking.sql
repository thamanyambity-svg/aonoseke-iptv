-- Présence par appareil (anon + connecté). IP capturée CÔTÉ SERVEUR depuis les
-- en-têtes de la requête PostgREST → fonctionne aussi pour la démo (sans session).
-- Appliquée en prod le 2026-06-20 (projet cvuhvppsdzrjtvrtvrlv / aonoseke-iptv).
-- Chemin INDÉPENDANT du heartbeat auth (track_heartbeat) qui ne produit rien en live.

create table if not exists public.device_presence (
  device_id     text primary key,
  user_id       uuid references auth.users(id) on delete set null,
  ip            text,
  user_agent    text,
  device        text,
  country       text,
  country_code  text,
  city          text,
  is_demo       boolean not null default false,
  first_seen_at timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  pings         integer not null default 0
);
create index if not exists device_presence_last_seen_idx on public.device_presence (last_seen_at desc);

alter table public.device_presence enable row level security;
-- Aucune policy directe : tout accès passe par les RPC security definer ci-dessous.

create or replace function public.client_ip()
returns text language plpgsql stable
security definer set search_path = public
as $$
declare hdrs json; xff text;
begin
  begin hdrs := current_setting('request.headers', true)::json;
  exception when others then return null; end;
  if hdrs is null then return null; end if;
  xff := hdrs ->> 'x-forwarded-for';
  if xff is not null and length(btrim(xff)) > 0 then
    return btrim(split_part(xff, ',', 1));
  end if;
  return coalesce(hdrs ->> 'cf-connecting-ip', hdrs ->> 'x-real-ip');
end; $$;

create or replace function public.track_presence(
  p_device_id text, p_device text default null, p_is_demo boolean default false
) returns void language plpgsql
security definer set search_path = public
as $$
declare v_ip text := public.client_ip(); v_ua text;
begin
  if p_device_id is null or length(p_device_id) < 8 then return; end if;
  begin v_ua := (current_setting('request.headers', true)::json) ->> 'user-agent';
  exception when others then v_ua := null; end;
  insert into public.device_presence (device_id, user_id, ip, user_agent, device, is_demo, last_seen_at, pings)
  values (p_device_id, auth.uid(), v_ip, v_ua, p_device, coalesce(p_is_demo, false), now(), 1)
  on conflict (device_id) do update set
    user_id      = coalesce(excluded.user_id, public.device_presence.user_id),
    ip           = coalesce(excluded.ip, public.device_presence.ip),
    user_agent   = coalesce(excluded.user_agent, public.device_presence.user_agent),
    device       = coalesce(excluded.device, public.device_presence.device),
    is_demo      = excluded.is_demo,
    last_seen_at = now(),
    pings        = public.device_presence.pings + 1;
end; $$;

create or replace function public.admin_live_devices(p_window_seconds integer default 300)
returns table (
  device_id text, ip text, kind text, email text, device text,
  country text, city text, user_agent text, pings integer,
  first_seen_at timestamptz, last_seen_at timestamptz
) language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Accès refusé : administrateur requis' using errcode = '42501';
  end if;
  return query
  select d.device_id, d.ip,
         case when d.is_demo or d.user_id is null then 'Démo / anonyme' else 'Connecté' end,
         p.email, d.device, coalesce(d.country, p.country), coalesce(d.city, p.city),
         d.user_agent, d.pings, d.first_seen_at, d.last_seen_at
  from public.device_presence d
  left join public.profiles p on p.id = d.user_id
  where d.last_seen_at > now() - make_interval(secs => greatest(30, coalesce(p_window_seconds, 300)))
  order by d.last_seen_at desc;
end; $$;

revoke all on function public.track_presence(text, text, boolean) from public;
grant execute on function public.track_presence(text, text, boolean) to anon, authenticated;
revoke all on function public.admin_live_devices(integer) from public;
grant execute on function public.admin_live_devices(integer) to authenticated;
