export interface DisplayName {
  title: string;
  /** Qualité annoncée dans le nom (« 1080p », « 720p »…), à afficher en pastille plutôt que dans le titre. */
  quality: string | null;
}

const QUALITY = /\s*[([]\s*((?:\d{3,4}p)|HD|FHD|UHD|4K|SD)\s*[)\]]\s*/gi;
const NOISE = /\s*[([]\s*(?:geo-?blocked|not 24\/7|24\/7)\s*[)\]]\s*/gi;

/** Nettoie un nom de chaîne pour l'affichage : « REFLET TV (1080p) » → « REFLET TV » + pastille « 1080p ». */
export function displayName(name: string): DisplayName {
  let quality: string | null = null;
  const title = name
    .replace(NOISE, ' ')
    .replace(QUALITY, (_m, q: string) => { quality ??= q.toUpperCase().replace(/^(\d+)P$/, '$1p'); return ' '; })
    .replace(/\s{2,}/g, ' ')
    .trim();
  return { title: title || name.trim(), quality };
}

/** Initiales pour une vignette sans logo (deux lettres max, sur les mots significatifs). */
export function monogram(name: string): string {
  const words = displayName(name).title.split(/[\s\-_/]+/).filter((w) => /[\p{L}\d]/u.test(w));
  const letters = words.length >= 2 ? (words[0]?.[0] ?? '') + (words[1]?.[0] ?? '') : (words[0] ?? name).slice(0, 2);
  return letters.toUpperCase();
}
