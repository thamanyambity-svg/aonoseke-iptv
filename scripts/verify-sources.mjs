/**
 * Vérification des sources — ne garde QUE ce qui marche.
 *
 * - Chaînes (playlist.json) : fetch du .m3u8, suit les redirections, trois issues (voir scripts/lib/stream-status.mjs) :
 *     ok   → gardée, verified:true ;
 *     geo  → accès refusé (HTTP 403/451 ou message « indisponible dans votre pays ») : GARDÉE et signalée
 *            geoBlocked:true — la vérification tourne depuis les États-Unis, la chaîne marche sans doute chez elle ;
 *     dead → flux disparu : supprimée.
 * - Sites (sites.json) : HEAD/GET, statut online/offline.
 *
 * Sortie : playlist nettoyée + public/sources-report.json (chaînes bloquées par pays et chaînes mortes,
 * avec la raison). Chaque entrée gardée reçoit verifiedAt ; verified:true seulement si elle est lisible d'ici.
 *
 * Usage : node scripts/verify-sources.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';
import { checkStream } from './lib/stream-status.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const CONCURRENCY = 40;
const TIMEOUT_MS = 7000;
const NOW = new Date().toISOString();

async function pool(items, worker) {
  const out = new Array(items.length);
  let i = 0;
  async function run() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await worker(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, run));
  return out;
}

async function verifyPlaylist() {
  const path = `${ROOT}public/playlist.json`;
  const channels = JSON.parse(await readFile(path, 'utf8'));
  console.log(`\n📺 Vérification de ${channels.length} chaînes (concurrence ${CONCURRENCY})…`);

  let done = 0;
  const results = await pool(channels, async (ch) => {
    const r = await checkStream(ch.url, { timeoutMs: TIMEOUT_MS });
    done++;
    if (done % 250 === 0) console.log(`   …${done}/${channels.length}`);
    return r;
  });

  const kept = [];
  const geoBlocked = [];
  const dead = [];
  channels.forEach((ch, idx) => {
    const r = results[idx];
    // On repart d'une chaîne sans anciens marqueurs : l'état est recalculé à chaque passage.
    const { geoBlocked: _g, geoReason: _r, verified: _v, ...base } = ch;
    const info = { name: ch.name, country: ch.country, group: ch.group, url: ch.url, reason: r.reason, ...(r.code ? { code: r.code } : {}) };
    if (r.status === 'ok') {
      kept.push({ ...base, verified: true, verifiedAt: NOW });
    } else if (r.status === 'geo') {
      kept.push({ ...base, geoBlocked: true, geoReason: r.reason, verifiedAt: NOW });
      geoBlocked.push(info);
    } else {
      dead.push(info);
    }
  });

  await writeFile(path, JSON.stringify(kept, null, 2));
  const ok = kept.length - geoBlocked.length;
  console.log(`✅ Chaînes : ${ok} lisibles, ${geoBlocked.length} bloquées par pays (gardées), ${dead.length} mortes supprimées`);

  // Rapport lisible : quelles chaînes sont récupérables (bloquées par pays) et lesquelles sont perdues (mortes).
  const deadReasons = {};
  for (const d of dead) deadReasons[d.reason] = (deadReasons[d.reason] ?? 0) + 1;
  await writeFile(
    `${ROOT}public/sources-report.json`,
    JSON.stringify(
      {
        generatedAt: NOW,
        note: 'Vérification depuis un serveur aux États-Unis : « bloquée par pays » = le serveur répond mais refuse l\'accès (HTTP 403/451) ; la chaîne marche probablement dans son pays d\'origine.',
        counts: { checked: channels.length, ok, geoBlocked: geoBlocked.length, dead: dead.length },
        deadReasons,
        geoBlocked,
        dead,
      },
      null,
      2,
    ),
  );
  console.log('   raisons des chaînes mortes :', JSON.stringify(deadReasons));

  // Répartition par source
  const bySrc = {};
  for (const c of kept) bySrc[c.source ?? '?'] = (bySrc[c.source ?? '?'] ?? 0) + 1;
  console.log('   par source :', JSON.stringify(bySrc));
  return { ok, geo: geoBlocked.length, removed: dead.length };
}

async function verifySites() {
  const path = `${ROOT}public/sites.json`;
  const sites = JSON.parse(await readFile(path, 'utf8'));
  console.log(`\n🧭 Vérification de ${sites.length} sites de l'annuaire…`);

  const updated = await pool(sites, async (s) => {
    let status = 'offline';
    try {
      const res = await fetch(s.url, {
        method: 'GET',
        redirect: 'follow',
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      if (res.status < 500) status = 'online';
    } catch { /* offline */ }
    return { ...s, status, verifiedAt: NOW };
  });

  await writeFile(path, JSON.stringify(updated, null, 2));
  const online = updated.filter((s) => s.status === 'online').length;
  console.log(`✅ Sites : ${online}/${sites.length} en ligne`);
  return { online, total: sites.length };
}

const playlist = await verifyPlaylist();
const sites = await verifySites();
console.log('\n📊 RÉSUMÉ');
console.log(`   Chaînes lisibles : ${playlist.ok} · bloquées par pays (gardées) : ${playlist.geo} · mortes retirées : ${playlist.removed}`);
console.log(`   Sites en ligne : ${sites.online}/${sites.total}`);
