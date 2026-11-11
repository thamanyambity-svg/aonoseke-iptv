/**
 * Basculement automatique vers les adresses de secours d'une chaîne.
 *
 * Une chaîne peut avoir plusieurs adresses (`url` + `backups`). Si la première échoue chez l'utilisateur,
 * le lecteur essaie la suivante avant d'afficher une erreur.
 */

/** Nombre maximal d'adresses essayées pour une chaîne (principale comprise). */
export const MAX_SOURCES = 4;

/** Liste ordonnée des adresses à essayer : principale d'abord, sans vides ni doublons. */
export function sourceChain(url: string, backups: readonly string[] = []): string[] {
  const out: string[] = [];
  for (const u of [url, ...backups]) {
    if (u && !out.includes(u)) out.push(u);
    if (out.length >= MAX_SOURCES) break;
  }
  return out;
}

/** Indice de l'adresse suivante, ou null s'il n'en reste plus. */
export function nextSource(chain: readonly string[], index: number): number | null {
  return index + 1 < chain.length ? index + 1 : null;
}
