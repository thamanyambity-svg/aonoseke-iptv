/**
 * Vérification des sources — ne garde QUE ce qui marche.
 *
 * - Chaînes (playlist.json) : vérification COMPLÈTE de lecture (voir scripts/lib/stream-deep.mjs : liste, variante,
 *   DRM, flux terminé, premier segment réellement lisible, autorisation CORS du site et de l'appli), trois issues :
 *     ok   → gardée, verified:true ;
 *     geo  → accès refusé (HTTP 403/451 ou message « indisponible dans votre pays ») : GARDÉE et signalée
 *            geoBlocked:true — la vérification tourne depuis les États-Unis, la chaîne marche sans doute chez elle ;
 *     dead → inutilisable : supprimée tout de suite si l'échec est définitif (DRM, flux terminé, 404, segment
 *            illisible, pas de CORS) ; panne passagère (réseau, délai, 5xx) : règle des deux échecs
 *            (1er échec : gardée avec failedChecks:1 ; un succès remet le compteur à zéro).
 * - Sites (sites.json) : HEAD/GET, statut online/offline.
 *
 * Sortie : playlist nettoyée + public/sources-report.json (chaînes bloquées par pays et chaînes mortes,
 * avec la raison). Chaque entrée gardée reçoit verifiedAt ; verified:true seulement si elle est lisible d'ici.
 *
 * Usage : node scripts/verify-sources.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';
import { deepCheckStream } from './lib/stream-deep.mjs';
import { decideChannel, MAX_FAILED_CHECKS } from './lib/channel-state.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const CONCURRENCY = 30;
const TIMEOUT_MS = 10000;
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
    const r = await deepCheckStream(ch.url, { timeoutMs: TIMEOUT_MS });
    done++;
    if (done % 250 === 0) console.log(`   …${done}/${channels.length}`);
    return r;
  });

  const kept = [];
  const geoBlocked = [];
  const pending = [];
  const dead = [];
  channels.forEach((ch, idx) => {
    const r = results[idx];
    const { bucket, entry } = decideChannel(ch, r, NOW);
    const info = { name: ch.name, country: ch.country, group: ch.group, url: ch.url, reason: r.reason, ...(r.code ? { code: r.code } : {}) };
    if (entry) kept.push(entry);
    if (bucket === 'geo') geoBlocked.push(info);
    else if (bucket === 'pending') pending.push(info);
    else if (bucket === 'dead') dead.push(info);
  });

  await writeFile(path, JSON.stringify(kept, null, 2));
  const ok = kept.length - geoBlocked.length - pending.length;
  console.log(
    `✅ Chaînes : ${ok} lisibles, ${geoBlocked.length} bloquées par pays (gardées), ` +
      `${pending.length} en échec (1er échec, gardées), ${dead.length} mortes supprimées (${MAX_FAILED_CHECKS} échecs de suite)`,
  );

  // Rapport lisible : quelles chaînes sont récupérables (bloquées par pays) et lesquelles sont perdues (mortes).
  const deadReasons = {};
  for (const d of dead) deadReasons[d.reason] = (deadReasons[d.reason] ?? 0) + 1;
  await writeFile(
    `${ROOT}public/sources-report.json`,
    JSON.stringify(
      {
        generatedAt: NOW,
        note: 'Vérification depuis un serveur aux États-Unis : « bloquée par pays » = le serveur répond mais refuse l\'accès (HTTP 403/451) ; la chaîne marche probablement dans son pays d\'origine. « pending » = premier échec, gardée ; retirée au 2e échec de suite.',
        counts: { checked: channels.length, ok, geoBlocked: geoBlocked.length, pending: pending.length, dead: dead.length },
        deadReasons,
        geoBlocked,
        pending,
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
  return { ok, geo: geoBlocked.length, pending: pending.length, removed: dead.length };
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
console.log(`   Chaînes lisibles : ${playlist.ok} · bloquées par pays (gardées) : ${playlist.geo} · en échec (gardées) : ${playlist.pending} · mortes retirées : ${playlist.removed}`);
console.log(`   Sites en ligne : ${sites.online}/${sites.total}`);
