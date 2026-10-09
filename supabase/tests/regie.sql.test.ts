// @vitest-environment node
/**
 * Tests de la logique SQL de la régie publicitaire (diffusion + validation des propositions d'agents),
 * sur un vrai Postgres embarqué (PGlite). Aucun accès à votre base Supabase.
 */
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import schemaSql from '../schema.sql?raw';
import agentProposalsSql from '../migrations/20260621090000_agent_proposals_approval_socle.sql?raw';
import dashboardSql from '../migrations/20261009100000_admin_dashboard_consistency.sql?raw';
import regieSql from '../migrations/20261009110000_regie_logic_fixes.sql?raw';
const ADM = '00000000-0000-0000-0000-0000000000ad';

let db: PGlite;
let adv: string;
const as = (uid: string): Promise<unknown> => db.query(`select set_config('app.uid', $1, false)`, [uid]);

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
  await db.exec(agentProposalsSql);
  await db.exec(dashboardSql);
  await db.exec(regieSql);
}, 60_000);

beforeEach(async () => {
  await db.exec(`
    delete from public.agent_proposals; delete from public.ad_events; delete from public.campaigns; delete from public.advertisers;
    delete from auth.users;
  `);
  await db.query(`insert into auth.users(id, email) values ($1, 'thamanyambity@gmail.com')`, [ADM]);
  await as(ADM);
  const { rows } = await db.query<{ id: string }>(`insert into public.advertisers(name) values ('Alpha') returning id`);
  adv = rows[0]!.id;
});

const campaign = async (name: string, opts: { weight?: number; impression_cap?: number } = {}): Promise<string> => {
  const { rows } = await db.query<{ id: string }>(
    `insert into public.campaigns(advertiser_id, name, type, content, status, weight, impression_cap)
     values ($1, $2, 'banner', '{"title":"t"}', 'active', coalesce($3::int, 10), $4::bigint) returning id`,
    [adv, name, opts.weight ?? null, opts.impression_cap ?? null]);
  return rows[0]!.id;
};
const served = async (country: string | null = null, category: string | null = null): Promise<string[]> => {
  const { rows } = await db.query<{ name: string }>('select name from public.get_active_campaigns($1, $2, 50)', [country, category]);
  return rows.map((r) => r.name);
};
const propose = async (kind: string, payload: object, cid: string): Promise<string> => {
  const { rows } = await db.query<{ id: string }>(
    `insert into public.agent_proposals(agent, kind, title, summary, payload, target_campaign_id)
     values ('sentinel', $1, 't', 's', $2::jsonb, $3) returning id`, [kind, JSON.stringify(payload), cid]);
  return rows[0]!.id;
};
const click = (cid: string, ip: string, sig: string, ageMin = 10): Promise<unknown> =>
  db.query(`insert into public.ad_events(campaign_id, advertiser_id, event_type, session_id, ip, signature, created_at)
            values ($1, $2, 'click', 's', $3, $4, now() - ($5 || ' minutes')::interval)`, [cid, adv, ip, sig, String(ageMin)]);

describe('diffusion : get_active_campaigns', () => {
  it('sert une campagne ciblée quand le lecteur ne précise ni pays ni catégorie (avant : jamais servie)', async () => {
    await campaign('globale');
    await db.query(`insert into public.campaigns(advertiser_id, name, type, content, status, target_countries, target_categories)
                    values ($1, 'ciblée', 'banner', '{}', 'active', '{CD}', '{Sport}')`, [adv]);
    expect((await served()).sort()).toEqual(['ciblée', 'globale']);
  });

  it('respecte le ciblage quand le pays est connu', async () => {
    await db.query(`insert into public.campaigns(advertiser_id, name, type, content, status, target_countries)
                    values ($1, 'RDC seulement', 'banner', '{}', 'active', '{CD}')`, [adv]);
    expect(await served('FR')).toEqual([]);
    expect(await served('CD')).toEqual(['RDC seulement']);
  });

  it('le plafond d’impressions ignore les événements en quarantaine', async () => {
    const id = await campaign('plafonnée', { impression_cap: 2 });
    await db.query(`insert into public.ad_events(campaign_id, advertiser_id, event_type, session_id, signature, suspect)
                    select $1, $2, 'impression', 's', 'x', true from generate_series(1, 5)`, [id, adv]);
    expect(await served()).toEqual(['plafonnée']);
    await db.exec(`update public.ad_events set suspect = false`);
    expect(await served()).toEqual([]);
  });

  it('la rotation est proportionnelle au poids (≈ 90 % / 10 %)', async () => {
    await campaign('lourde', { weight: 90 });
    await campaign('légère', { weight: 10 });
    let heavyFirst = 0;
    const N = 600;
    for (let i = 0; i < N; i++) {
      const { rows } = await db.query<{ name: string }>('select name from public.get_active_campaigns(null, null, 1)');
      if (rows[0]!.name === 'lourde') heavyFirst++;
    }
    expect(heavyFirst / N).toBeGreaterThan(0.82);
    expect(heavyFirst / N).toBeLessThan(0.96);
  });
});

describe('validation des propositions', () => {
  it('quarantaine : ne marque que les clics de l’IP en rafale, pas les clics légitimes (avant : tous)', async () => {
    const cid = await campaign('c');
    for (let i = 0; i < 25; i++) await click(cid, '1.1.1.1', `bot${i}`);
    for (let i = 0; i < 5; i++) await click(cid, `9.9.9.${i}`, `ok${i}`);
    await click(cid, '8.8.8.8', 'vieux', 60 * 24 * 10); // 10 jours : hors fenêtre
    const pid = await propose('quarantine_events', { event_type: 'click', ips: ['1.1.1.1'], signatures: [] }, cid);

    const { rows } = await db.query<{ r: { status: string; result: { count: number } } }>(`select public.admin_resolve_agent_proposal($1, true) r`, [pid]);
    expect(rows[0]!.r.result.count).toBe(25);
    const { rows: left } = await db.query<{ n: string }>(`select count(*) n from public.ad_events where not suspect`);
    expect(Number(left[0]!.n)).toBe(6);
  });

  it('quarantaine sans contrevenant désigné (CTR anormal) : marque la fenêtre analysée seulement', async () => {
    const cid = await campaign('c');
    await click(cid, '2.2.2.2', 'a');
    await click(cid, '3.3.3.3', 'b');
    await click(cid, '4.4.4.4', 'vieux', 60 * 24 * 10);
    const pid = await propose('quarantine_events', { event_type: 'click' }, cid);
    await db.query(`select public.admin_resolve_agent_proposal($1, true)`, [pid]);
    const { rows } = await db.query<{ n: string }>(`select count(*) n from public.ad_events where suspect`);
    expect(Number(rows[0]!.n)).toBe(2);
  });

  it('migrate_channel : ajoute les catégories sans écraser le ciblage et mémorise l’ancien', async () => {
    const cid = await campaign('c');
    await db.query(`update public.campaigns set target_categories = '{News}' where id = $1`, [cid]);
    const pid = await propose('migrate_channel', { to: 'mobile', categories: ['Mobile', 'News'] }, cid);
    const { rows } = await db.query<{ r: { result: { previous_categories: string[] } } }>(`select public.admin_resolve_agent_proposal($1, true) r`, [pid]);
    const { rows: c } = await db.query<{ target_categories: string[] }>(`select target_categories from public.campaigns where id = $1`, [cid]);
    expect([...c[0]!.target_categories].sort()).toEqual(['Mobile', 'News']);
    expect(rows[0]!.r.result.previous_categories).toEqual(['News']);
    // …et la campagne reste diffusée quand le lecteur ne précise pas de catégorie
    expect(await served()).toEqual(['c']);
  });

  it('creative_swap : une variante inconnue (« rain ») ne modifie pas la campagne', async () => {
    const cid = await campaign('c');
    const pid = await propose('creative_swap', { variant: 'rain' }, cid);
    const { rows } = await db.query<{ r: { result: { action: string } } }>(`select public.admin_resolve_agent_proposal($1, true) r`, [pid]);
    expect(rows[0]!.r.result.action).toBe('noted');
    const { rows: c } = await db.query<{ content: Record<string, string> }>(`select content from public.campaigns where id = $1`, [cid]);
    expect(c[0]!.content.variant).toBeUndefined();

    const pid2 = await propose('creative_swap', { variant: 'corridor' }, cid);
    await db.query(`select public.admin_resolve_agent_proposal($1, true)`, [pid2]);
    const { rows: c2 } = await db.query<{ content: Record<string, string> }>(`select content from public.campaigns where id = $1`, [cid]);
    expect(c2[0]!.content.variant).toBe('corridor');
  });

  it('refuse les non-administrateurs', async () => {
    const cid = await campaign('c');
    const pid = await propose('set_weight', { weight: 5 }, cid);
    await as('00000000-0000-0000-0000-00000000000a');
    await expect(db.query(`select public.admin_resolve_agent_proposal($1, true)`, [pid])).rejects.toThrow(/administrateur/);
  });
});
