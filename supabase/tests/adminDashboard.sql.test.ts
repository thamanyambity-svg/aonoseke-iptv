// @vitest-environment node
/**
 * Tests de la logique SQL du tableau de bord admin, sur un vrai Postgres embarqué (PGlite).
 * Charge supabase/schema.sql puis les migrations, avec un faux schéma `auth`.
 * Aucun accès à votre base Supabase.
 */
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const A = '00000000-0000-0000-0000-00000000000a';
const B = '00000000-0000-0000-0000-00000000000b';
const C = '00000000-0000-0000-0000-00000000000c';
const D = '00000000-0000-0000-0000-00000000000d';
const ADM = '00000000-0000-0000-0000-0000000000ad';

let db: PGlite;
const as = (uid: string | null): Promise<unknown> => db.exec(`select set_config('app.uid', '${uid ?? ''}', false)`);

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}'::jsonb);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('app.uid', true), '')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;
  `);
  await db.exec(read('schema.sql'));
  await db.exec(read('migrations/20261009100000_admin_dashboard_consistency.sql'));
  await db.exec(`
    grant usage on schema public to anon, authenticated;
    grant insert on public.view_events to anon, authenticated;
    grant usage, select on all sequences in schema public to anon, authenticated;
  `);
}, 60_000);

beforeEach(async () => {
  await db.exec(`
    reset role;
    delete from public.user_activity_hourly; delete from public.user_activity; delete from public.view_events;
    delete from auth.users;
    insert into auth.users(id, email) values
      ('${A}','a@x.com'), ('${B}','b@x.com'), ('${C}','c@x.com'), ('${D}','d@x.com'), ('${ADM}','thamanyambity@gmail.com');
  `);
  await as(ADM);
});

const q = async <T = Record<string, unknown>>(sql: string): Promise<T[]> => (await db.query<T>(sql)).rows;

describe('toutes les fonctions du tableau de bord s’exécutent', () => {
  const fns = [
    'admin_stats()', 'admin_recent_users(100)', 'admin_online_users()', 'admin_geo_stats()', 'admin_engagement()',
    'admin_activity_heatmap()', 'admin_content_affinity()', 'admin_age_distribution()', 'admin_device_split()', 'admin_segments()',
  ];
  it.each(fns)('%s', async (fn) => {
    await expect(db.query(`select * from public.${fn}`)).resolves.toBeDefined();
  });

  it('refuse les non-administrateurs', async () => {
    await as(A);
    await expect(db.query('select * from public.admin_stats()')).rejects.toThrow(/administrateur/);
  });
});

describe('heartbeat : temps réellement écoulé', () => {
  it('une rafale d’appels ne gonfle pas le temps (avant : 10 × 60 s)', async () => {
    await as(A);
    for (let i = 0; i < 10; i++) await db.query('select public.track_heartbeat(60)');
    const [row] = await q<{ s: number }>(`select coalesce(sum(seconds),0)::int s from public.user_activity where user_id='${A}'`);
    expect(row!.s).toBeLessThanOrEqual(30);
  });

  it('un battement régulier après 60 s crédite 60 s, dans le jour ET dans l’heure', async () => {
    await db.exec(`update public.profiles set last_seen_at = now() - interval '60 seconds' where id='${B}'`);
    await as(B);
    await db.query('select public.track_heartbeat(60)');
    const [day] = await q<{ seconds: number }>(`select seconds from public.user_activity where user_id='${B}'`);
    const hours = await q(`select 1 from public.user_activity_hourly where user_id='${B}'`);
    expect(day!.seconds).toBe(60);
    expect(hours).toHaveLength(1);
  });

  it('après une longue absence, crédit forfaitaire de 30 s (pas toute l’absence)', async () => {
    await db.exec(`update public.profiles set last_seen_at = now() - interval '3 hours' where id='${B}'`);
    await as(B);
    await db.query('select public.track_heartbeat(60)');
    const [day] = await q<{ seconds: number }>(`select seconds from public.user_activity where user_id='${B}'`);
    expect(day!.seconds).toBe(30);
  });
});

describe('engagement', () => {
  it('temps moyen par utilisateur actif : A=60 min, B=20 min → 40 min (avant : 80)', async () => {
    await db.exec(`insert into public.user_activity(user_id,day,seconds) values
      ('${A}', public.app_today(), 3600), ('${B}', public.app_today(), 1200)`);
    const [e] = await q<{ avg_min_per_active_day: string; total_min_today: string; dau: string }>('select * from public.admin_engagement()');
    expect(Number(e!.avg_min_per_active_day)).toBe(40);
    expect(Number(e!.total_min_today)).toBe(80);
    expect(Number(e!.dau)).toBe(2);
  });

  it('sans activité : zéros, pas d’erreur de division', async () => {
    const [e] = await q<{ avg_min_per_active_day: string; dau: string }>('select * from public.admin_engagement()');
    expect(Number(e!.avg_min_per_active_day)).toBe(0);
    expect(Number(e!.dau)).toBe(0);
  });
});

describe('heures de pointe', () => {
  it('plusieurs heures par utilisateur, converties en heure de Kinshasa (UTC+1)', async () => {
    // jours récents, fixes par rapport à maintenant : lundi précédent minuit UTC
    await db.exec(`
      with base as (select date_trunc('week', now()) - interval '7 days' as monday_utc)   -- lundi 00:00 UTC de la semaine passée
      insert into public.user_activity_hourly(user_id, hour_start, seconds)
      select u, monday_utc + h, s from base,
        (values ('${A}'::uuid, interval '19 hours', 3000), ('${A}'::uuid, interval '20 hours', 1800),
                ('${B}'::uuid, interval '19 hours', 600),  ('${A}'::uuid, interval '23 hours', 600)) as v(u, h, s);
    `);
    const rows = await q<{ dow: number; hour: number; count: string }>('select * from public.admin_activity_heatmap() order by dow, hour');
    expect(rows.map((r) => [r.dow, r.hour, Number(r.count)])).toEqual([
      [1, 20, 60],   // lundi 19 h UTC = 20 h Kinshasa : A 50 min + B 10 min
      [1, 21, 30],   // lundi 20 h UTC = 21 h Kinshasa
      [2, 0, 10],    // lundi 23 h UTC = mardi 00 h Kinshasa (minuit local, pas 23 h)
    ]);
  });
});

describe('segments et indicateurs', () => {
  it('les segments sont exclusifs et leur somme est égale au nombre d’inscrits', async () => {
    await db.exec(`
      update public.profiles set created_at = now() - interval '40 days', last_seen_at = now() - interval '40 days';
      update public.profiles set created_at = now() - interval '2 days',  last_seen_at = now()                     where id='${A}';
      update public.profiles set last_seen_at = now() - interval '2 days'  where id='${B}';
      update public.profiles set last_seen_at = now() - interval '15 days' where id='${C}';`);
    const segs = await q<{ label: string; count: string }>('select * from public.admin_segments()');
    const [st] = await q<{ total_users: string }>('select total_users from public.admin_stats()');
    expect(segs.reduce((s, x) => s + Number(x.count), 0)).toBe(Number(st!.total_users));
    expect(segs.map((s) => s.label)).toEqual(expect.arrayContaining([
      'Nouveaux (inscrits < 7 jours)', 'Réguliers (actifs < 7 jours)', 'À réactiver (inactifs 7–30 jours)', 'Dormants (inactifs > 30 jours)',
    ]));
  });

  it('« nouveaux aujourd’hui » suit le jour de Kinshasa', async () => {
    await db.exec(`
      update public.profiles set created_at = now() - interval '30 days';
      update public.profiles set created_at = (public.app_today()::timestamp at time zone 'Africa/Kinshasa') + interval '30 minutes' where id='${D}';
      update public.profiles set created_at = (public.app_today()::timestamp at time zone 'Africa/Kinshasa') - interval '30 minutes' where id='${C}';`);
    const [st] = await q<{ new_today: string }>('select new_today from public.admin_stats()');
    expect(Number(st!.new_today)).toBe(1);
  });

  it('les catégories, âges et appareils comptent bien', async () => {
    await db.exec(`
      update public.profiles set age_range='18-24', device='mobile' where id in ('${A}','${B}');
      update public.profiles set age_range='25-34', device='tv' where id='${C}';
      insert into public.view_events(event_type, ref, category) values ('channel_view','u1','Sport'),('channel_view','u2','Sport'),('channel_view','u3',null);`);
    const cat = await q<{ category: string; count: string }>('select * from public.admin_content_affinity()');
    expect(cat[0]).toMatchObject({ category: 'Sport', count: 2 });
    expect(cat.some((c) => c.category === 'Non classé')).toBe(true);
    const ages = await q<{ age_range: string; count: string }>('select * from public.admin_age_distribution()');
    expect(ages.map((a) => a.age_range).slice(0, 2)).toEqual(['18-24', '25-34']);
    const dev = await q<{ device: string; count: string }>('select * from public.admin_device_split()');
    expect(dev.find((d) => d.device === 'mobile')).toMatchObject({ count: 2 });
    expect(dev.find((d) => d.device === 'tv')).toMatchObject({ count: 1 });
  });

  it('admin_recent_users borne la taille demandée', async () => {
    const rows = await q('select * from public.admin_recent_users(-5)');
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });
});

describe('événements publics', () => {
  const tryInsert = async (sql: string): Promise<boolean> => {
    await as(null);
    await db.exec('set role anon');
    try { await db.query(sql); return true; } catch { return false; } finally { await db.exec('reset role'); }
  };
  it('accepte un événement anonyme normal', async () => {
    expect(await tryInsert(`insert into public.view_events(event_type, ref, category) values ('channel_view','https://x/y.m3u8','Sport')`)).toBe(true);
  });
  it('refuse un faux clic au nom d’un autre utilisateur', async () => {
    expect(await tryInsert(`insert into public.view_events(event_type, ref, user_id) values ('ad_click','x','${B}')`)).toBe(false);
  });
  it('refuse une valeur démesurée', async () => {
    expect(await tryInsert(`insert into public.view_events(event_type, ref) values ('ad_click', repeat('x', 5000))`)).toBe(false);
  });
});
