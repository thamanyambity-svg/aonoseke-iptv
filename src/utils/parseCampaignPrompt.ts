/**
 * Parseur de commande publicitaire en langage naturel → brouillon de campagne.
 *
 * SIMULÉ pour l'instant (heuristiques regex). L'INTERFACE de retour est stable :
 * pour passer à une vraie IA, il suffira de remplacer le corps de
 * `parseCampaignPrompt` par un appel API (LLM) renvoyant le même `CampaignDraft` —
 * aucun composant consommateur n'aura à changer.
 *
 * @module parseCampaignPrompt
 */

export type MediaKind = 'video' | 'image' | 'text';

export interface DraftMedia {
  kind: MediaKind;
  name: string;
  url?: string;
}

export interface CampaignDraft {
  advertiserName: string;
  type: 'preroll' | 'banner' | 'both';
  format: MediaKind;
  media?: DraftMedia;
  title: string;
  /** ISO (jour de début, minuit local). */
  startDate: string;
  /** ISO (jour de fin, minuit local). */
  endDate: string;
  /** Plage horaire quotidienne (dayparting). Absent = toute la journée. */
  daypart?: { startHour: number; endHour: number };
  /** Quota de vues/impressions avant arrêt auto. */
  impressionCap: number | null;
  /** 0..1 — confiance du parsing (sert à colorer la carte de validation). */
  confidence: number;
}

const MONTHS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

function strip(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function monthIndex(name: string): number {
  const n = strip(name);
  return MONTHS.findIndex((m) => strip(m).startsWith(n.slice(0, 4)));
}

/** Prochaine occurrence STRICTE du jour (1 = lundi … 0 = dimanche). */
function nextWeekday(from: Date, weekday: number): Date {
  const d = new Date(from);
  const diff = ((weekday + 7 - d.getDay()) % 7) || 7;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfMonth(from: Date): Date {
  return new Date(from.getFullYear(), from.getMonth() + 1, 0, 0, 0, 0, 0);
}

export function parseCampaignPrompt(
  prompt: string,
  media: DraftMedia | undefined,
  knownAdvertisers: string[] = [],
  now: Date = new Date(),
): CampaignDraft {
  const text = prompt.trim();
  const lower = strip(text);

  // ── Annonceur ───────────────────────────────────────────────────────────
  let advertiserName = '';
  for (const a of knownAdvertisers) {
    if (a && lower.includes(strip(a))) { advertiserName = a; break; }
  }
  if (!advertiserName) {
    const m = text.match(/pour\s+([A-ZÀ-Ÿ][\wÀ-ÿ&.\- ]{1,28}?)(?:\s+(?:tous|chaque|entre|de|du|à|le|la|pendant|jusqu)\b|[,.;]|$)/);
    if (m) advertiserName = m[1].trim();
  }
  if (!advertiserName) advertiserName = 'Annonceur';

  // ── Plage horaire (dayparting) ──────────────────────────────────────────
  let daypart: { startHour: number; endHour: number } | undefined;
  const h = lower.match(/(\d{1,2})\s*h(?:\s*\d{2})?\s*(?:a|et|-|–|jusqu['’]?a)\s*(\d{1,2})\s*h/);
  if (h) {
    const s = Math.min(23, parseInt(h[1], 10));
    const e = Math.min(24, parseInt(h[2], 10));
    if (e > s) daypart = { startHour: s, endHour: e };
  }

  // ── Quota (vues / impressions) ──────────────────────────────────────────
  let impressionCap: number | null = null;
  const c = lower.match(/(\d[\d\s. ]*)\s*(?:vues|impressions|affichages)/);
  if (c) {
    const n = parseInt(c[1].replace(/[\s. ]/g, ''), 10);
    if (!Number.isNaN(n)) impressionCap = n;
  }

  // ── Dates ───────────────────────────────────────────────────────────────
  let start = new Date(now); start.setHours(0, 0, 0, 0);
  let end = endOfMonth(now);

  const days = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  for (let i = 0; i < 7; i++) {
    if (lower.includes(days[i] + ' prochain')) { start = nextWeekday(now, i); break; }
  }
  if (lower.includes('demain')) { start = new Date(now); start.setDate(start.getDate() + 1); start.setHours(0, 0, 0, 0); }
  if (lower.includes("aujourd")) { start = new Date(now); start.setHours(0, 0, 0, 0); }

  // Dates explicites « JJ mois »
  const explicit = [...lower.matchAll(/(\d{1,2})\s+([a-zû]+)/g)]
    .map((m) => ({ day: parseInt(m[1], 10), mi: monthIndex(m[2]) }))
    .filter((x) => x.mi >= 0 && x.day >= 1 && x.day <= 31)
    .map((x) => new Date(now.getFullYear(), x.mi, x.day, 0, 0, 0, 0));
  if (explicit.length >= 1) start = explicit[0];
  if (explicit.length >= 2) end = explicit[explicit.length - 1];
  else if (lower.includes('fin du mois') || lower.includes('fin de mois')) end = endOfMonth(start);

  if (end < start) end = endOfMonth(start);

  // ── Format / type ───────────────────────────────────────────────────────
  const isBanner = lower.includes('banniere') || lower.includes('bandeau');
  const format: MediaKind = media?.kind
    ?? (lower.includes('video') ? 'video' : (isBanner || lower.includes('image')) ? 'image' : 'text');
  const type: 'preroll' | 'banner' | 'both' = isBanner ? 'banner' : 'preroll';

  // ── Titre ───────────────────────────────────────────────────────────────
  const raw = media?.name?.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').trim();
  const title = (raw && raw.length > 1) ? raw : `Campagne ${advertiserName}`;

  // ── Confiance ───────────────────────────────────────────────────────────
  let confidence = 0.45;
  if (daypart) confidence += 0.2;
  if (impressionCap) confidence += 0.15;
  if (advertiserName !== 'Annonceur') confidence += 0.2;

  return {
    advertiserName,
    type,
    format,
    media,
    title: title.charAt(0).toUpperCase() + title.slice(1),
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    daypart,
    impressionCap,
    confidence: Math.min(1, confidence),
  };
}
