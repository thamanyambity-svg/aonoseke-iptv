/**
 * Formats et calculs d'affichage du tableau de bord admin — UNE seule définition,
 * partagée par tous les panneaux (dates, « il y a… », drapeaux, appareils, CTR, CSV).
 */

/** Fuseau d'affichage des statistiques (aligné sur `app_today()` côté SQL). */
export const DASHBOARD_TZ = 'Africa/Kinshasa';

/** Seuil « en ligne » : doit rester égal à l'intervalle de `admin_online_users()` (90 s). */
export const ONLINE_THRESHOLD_MS = 90 * 1000;

export function fmtDate(s: string): string {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short', timeZone: DASHBOARD_TZ });
}

export function fmtTimeAgo(s: string, now: number = Date.now()): string {
  const t = new Date(s).getTime();
  if (Number.isNaN(t)) return s;
  const sec = Math.max(0, Math.floor((now - t) / 1000));
  if (sec < 5) return "à l'instant";
  if (sec < 60) return `il y a ${sec} s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `il y a ${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `il y a ${hr} h`;
  return `il y a ${Math.floor(hr / 24)} j`;
}

export function isOnline(lastSeen: string, now: number = Date.now()): boolean {
  const t = new Date(lastSeen).getTime();
  return !Number.isNaN(t) && now - t < ONLINE_THRESHOLD_MS;
}

export function flagEmoji(cc: string | null | undefined): string {
  if (!cc || cc.length !== 2) return '🌍';
  const base = 0x1f1e6;
  return String.fromCodePoint(...[...cc.toUpperCase()].map((c) => base + c.charCodeAt(0) - 65));
}

export function deviceLabel(d: string | null | undefined): string {
  if (!d) return '—';
  switch (d) {
    case 'tv': return 'TV';
    case 'mobile': return 'Mobile';
    case 'desktop': return 'Ordinateur';
    default: return d;
  }
}

/** Nombre au format français (« 1 234,5 »). */
export function fmtNumber(n: number, maxFractionDigits = 0): string {
  return n.toLocaleString('fr-FR', { maximumFractionDigits: maxFractionDigits });
}

/** CTR (clics / impressions) en pourcentage français ; « — » quand il n'y a aucune impression. */
export function fmtCtr(clicks: number, impressions: number): string {
  if (!(impressions > 0)) return '—';
  const pct = (clicks / impressions) * 100;
  return `${pct.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;
}

/** Part en pourcentage entier ; « 0 % » si le total est nul. */
export function fmtShare(part: number, total: number): string {
  return total > 0 ? `${Math.round((part / total) * 100)} %` : '0 %';
}

/**
 * Échappe une valeur CSV (RFC 4180) et neutralise l'injection de formules :
 * Excel / Sheets interprètent comme formule toute cellule commençant par = + - @ tab ou retour chariot.
 * On préfixe alors la valeur d'une apostrophe, PUIS on met entre guillemets si nécessaire.
 */
export function csvEscape(value: unknown): string {
  let s =
    typeof value === 'string' ? value
    : value == null ? ''
    : typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint' ? String(value)
    : JSON.stringify(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  const needsQuote = /[",\n\r]/.test(s);
  return needsQuote ? `"${s.replace(/"/g, '""')}"` : s;
}
