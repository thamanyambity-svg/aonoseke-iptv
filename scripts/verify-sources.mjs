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
 * - Adresses de secours (`backups`) : testées aussi ; si la principale est KO et qu'une secours marche, la secours est
 *   promue et la chaîne survit (voir decideWithBackups).
 * - Quarantaine (public/quarantine.json) : une chaîne retirée n'est pas perdue, elle est retestée à chaque passage,
 *   remise dans la playlist après deux succès de suite, abandonnée après 30 jours sans réponse (voir lib/quarantine.mjs).
 * - Sites (sites.json) : HEAD/GET, statut online/offline.
 *
 * Sortie : playlist nettoyée + public/sources-report.json (chaînes bloquées par pays et chaînes mortes,
 * avec la raison). Chaque entrée gardée reçoit verifiedAt ; verified:true seulement si elle est lisible d'ici.
 *
 * Usage : node scripts/verify-sources.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';
import { deepCheckStream } from './lib/stream-deep.mjs';
import { decideWithBackups, MAX_FAILED_CHECKS } from './lib/channel-state.mjs';
import { quarantineAdd, quarantineStep } from './lib/quarantine.mjs';

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
  const qPath = `${ROOT}public/quarantine.json`;
  const channels = JSON.parse(await readFile(path, 'utf8'));
  let quarantine = [];
  try { quarantine = JSON.parse(await readFile(qPath, 'utf8')); } catch { /* première exécution : pas encore de quarantaine */ }

  // Toutes les adresses à tester, une seule fois chacune : principales, secours, et chaînes en quarantaine.
  const urls = [...new Set([
    ...channels.flatMap((ch) => [ch.url, ...(Array.isArray(ch.backups) ? ch.backups : [])]),
    ...quarantine.map((q) => q.channel.url),
  ])];
  console.log(`\n📺 Vérification de ${channels.length} chaînes (${urls.length} adresses, ${quarantine.length} en quarantaine, concurrence ${CONCURRENCY})…`);

  let done = 0;
  const checked = await pool(urls, async (url) => {
    const r = await deepCheckStream(url, { timeoutMs: TIMEOUT_MS });
    done++;
    if (done % 250 === 0) console.log(`   …${done}/${urls.length}`);
    return r;
  });
  const byUrl = new Map(urls.map((u, idx) => [u, checked[idx]]));

  const kept = [];
  const geoBlocked = [];
  const pending = [];
  const dead = [];
  let promoted = 0;
  for (const ch of channels) {
    const chain = [ch.url, ...(Array.isArray(ch.backups) ? ch.backups : [])];
    const { bucket, entry } = decideWithBackups(ch, chain.map((url) => ({ url, result: byUrl.get(url) })), NOW);
    const r = byUrl.get(ch.url);
    const info = { name: ch.name, country: ch.country, group: ch.group, url: ch.url, reason: r.reason, ...(r.code ? { code: r.code } : {}) };
    if (entry) {
      kept.push(entry);
      if (entry.url !== ch.url) promoted++;
    }
    if (bucket === 'geo') geoBlocked.push(info);
    else if (bucket === 'pending') pending.push(info);
    else if (bucket === 'dead') {
      dead.push(info);
      quarantine = quarantineAdd(quarantine, ch, r.reason, NOW);
    }
  }

  // Retest de la quarantaine : les chaînes qui répondent deux fois de suite reviennent dans la playlist.
  const deadUrls = new Set(dead.map((d) => d.url));
  const step = quarantineStep(quarantine.filter((q) => !deadUrls.has(q.channel.url)), byUrl, NOW);
  const justAdded = quarantine.filter((q) => deadUrls.has(q.channel.url));
  quarantine = [...step.quarantine, ...justAdded];
  const have = new Set(kept.map((c) => c.url));
  const restored = step.restored.filter((c) => !have.has(c.url));
  kept.push(...restored);

  await writeFile(path, JSON.stringify(kept, null, 2));
  await writeFile(qPath, JSON.stringify(quarantine, null, 2));
  const ok = kept.length - geoBlocked.length - pending.length;
  console.log(
    `✅ Chaînes : ${ok} lisibles, ${geoBlocked.length} bloquées par pays (gardées), ` +
      `${pending.length} en échec (1er échec, gardées), ${dead.length} mises en quarantaine (${MAX_FAILED_CHECKS} échecs de suite)`,
  );
  console.log(`   secours promues : ${promoted} · remises depuis la quarantaine : ${restored.length} · abandonnées : ${step.abandoned} · en quarantaine : ${quarantine.length}`);

  // Rapport lisible : quelles chaînes sont récupérables (bloquées par pays) et lesquelles sont perdues (mortes).
  const deadReasons = {};
  for (const d of dead) deadReasons[d.reason] = (deadReasons[d.reason] ?? 0) + 1;
  await writeFile(
    `${ROOT}public/sources-report.json`,
    JSON.stringify(
      {
        generatedAt: NOW,
        note: 'Vérification depuis un serveur aux États-Unis : « bloquée par pays » = le serveur répond mais refuse l\'accès (HTTP 403/451) ; la chaîne marche probablement dans son pays d\'origine. « pending » = premier échec, gardée. « dead » = mise en quarantaine : retestée à chaque passage et remise dans la playlist après deux succès de suite.',
        counts: {
          checked: channels.length,
          ok,
          geoBlocked: geoBlocked.length,
          pending: pending.length,
          dead: dead.length,
          promotedBackups: promoted,
          restored: restored.length,
          quarantined: quarantine.length,
        },
        deadReasons,
        geoBlocked,
        pending,
        dead,
      },
      null,
      2,
    ),
  );
  console.log('   raisons des chaînes mises en quarantaine :', JSON.stringify(deadReasons));

  // Répartition par source
  const bySrc = {};
  for (const c of kept) bySrc[c.source ?? '?'] = (bySrc[c.source ?? '?'] ?? 0) + 1;
  console.log('   par source :', JSON.stringify(bySrc));
  return { ok, geo: geoBlocked.length, pending: pending.length, removed: dead.length, promoted, restored: restored.length };
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
console.log(`   Chaînes lisibles : ${playlist.ok} · bloquées par pays (gardées) : ${playlist.geo} · en échec (gardées) : ${playlist.pending} · mises en quarantaine : ${playlist.removed} · secours promues : ${playlist.promoted} · remises : ${playlist.restored}`);
console.log(`   Sites en ligne : ${sites.online}/${sites.total}`);
