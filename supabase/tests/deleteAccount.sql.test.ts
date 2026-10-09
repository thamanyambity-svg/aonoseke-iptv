// @vitest-environment node
/** Suppression de son propre compte : effets en base, sur un Postgres embarqué (PGlite). */
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import schemaSql from '../schema.sql?raw';
import dashboardSql from '../migrations/20261009100000_admin_dashboard_consistency.sql?raw';
import deleteSql from '../migrations/20261009130000_delete_my_account.sql?raw';

const U1 = '00000000-0000-0000-0000-000000000001';
const U2 = '00000000-0000-0000-0000-000000000002';
const ADM = '00000000-0000-0000-0000-0000000000ad';

let db: PGlite;
const as = (uid: string | null): Promise<unknown> => db.query(`select set_config('app.uid', $1, false)`, [uid ?? '']);
const count = async (table: string, where = 'true', params: unknown[] = []): Promise<number> =>
  Number((await db.query<{ n: string }>(`select count(*) n from ${table} where ${where}`, params)).rows[0]!.n);

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}'::jsonb);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('app.uid', true), '')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;
  `);
  await db.exec(schemaSql);
  await db.exec(dashboardSql);
  await db.exec(deleteSql);
}, 60_000);

beforeEach(async () => {
  await db.exec(`delete from public.view_events; delete from public.user_activity_hourly; delete from public.user_activity; delete from auth.users;`);
  for (const [id, mail] of [[U1, 'u1@x.com'], [U2, 'u2@x.com'], [ADM, 'adm@x.com']] as const) {
    await db.query(`insert into auth.users(id, email) values ($1, $2)`, [id, mail]);
  }
  await db.query(`update public.profiles set role = 'admin' where id = $1`, [ADM]);
  await db.query(`insert into public.user_activity(user_id, day, seconds) values ($1, current_date, 60), ($2, current_date, 60)`, [U1, U2]);
  await db.query(`insert into public.user_activity_hourly(user_id, hour_start, seconds) values ($1, date_trunc('hour', now()), 60)`, [U1]);
  await db.query(`insert into public.view_events(event_type, ref, user_id) values ('channel_view', 'a', $1), ('channel_view', 'b', $2)`, [U1, U2]);
});

describe('delete_my_account', () => {
  it('supprime le compte et ses données personnelles, sans toucher aux autres', async () => {
    await as(U1);
    await db.query('select public.delete_my_account()');

    expect(await count('auth.users', 'id = $1', [U1])).toBe(0);
    expect(await count('public.profiles', 'id = $1', [U1])).toBe(0);
    expect(await count('public.user_activity', 'user_id = $1', [U1])).toBe(0);
    expect(await count('public.user_activity_hourly', 'user_id = $1', [U1])).toBe(0);
    // l'autre utilisateur est intact
    expect(await count('auth.users', 'id = $1', [U2])).toBe(1);
    expect(await count('public.user_activity', 'user_id = $1', [U2])).toBe(1);
  });

  it('anonymise les événements au lieu de les supprimer', async () => {
    await as(U1);
    await db.query('select public.delete_my_account()');
    expect(await count('public.view_events', 'ref = $1 and user_id is null', ['a'])).toBe(1);
    expect(await count('public.view_events', 'ref = $1 and user_id = $2', ['b', U2])).toBe(1);
  });

  it('refuse sans connexion', async () => {
    await as(null);
    await expect(db.query('select public.delete_my_account()')).rejects.toThrow(/Authentification/);
    expect(await count('auth.users')).toBe(3);
  });

  it('refuse de supprimer un compte administrateur', async () => {
    await as(ADM);
    await expect(db.query('select public.delete_my_account()')).rejects.toThrow(/administrateur/);
    expect(await count('auth.users', 'id = $1', [ADM])).toBe(1);
  });

  it('ne permet pas de cibler un autre compte (aucun paramètre)', async () => {
    await as(U1);
    await expect(db.query(`select public.delete_my_account('${U2}'::uuid)`)).rejects.toThrow();
    expect(await count('auth.users', 'id = $1', [U2])).toBe(1);
  });
});
