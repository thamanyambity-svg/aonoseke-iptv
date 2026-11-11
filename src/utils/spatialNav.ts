export type Dir = 'left' | 'right' | 'up' | 'down';
export interface GridPos { row: number; col: number }

/** Convertit une touche de télécommande/clavier en direction (null si ce n'en est pas une). */
export function keyToDir(key: string): Dir | null {
  switch (key) {
    case 'ArrowLeft': return 'left';
    case 'ArrowRight': return 'right';
    case 'ArrowUp': return 'up';
    case 'ArrowDown': return 'down';
    default: return null;
  }
}

/** Touches « retour » des télécommandes (clavier, VIDAA/Hisense, Tizen, webOS). */
export function isBackKey(e: { key: string; keyCode?: number }): boolean {
  return e.key === 'Escape' || e.key === 'BrowserBack' || e.key === 'GoBack' || e.keyCode === 10009 || e.keyCode === 461;
}

/**
 * Déplacement dans une grille de rangées de longueurs variables (bannière = 1 élément, puis rangées de cartes).
 * Gauche/droite restent dans la rangée ; haut/bas gardent la colonne, bornée à la taille de la rangée visée.
 * Renvoie la même position quand on est au bord (rien ne bouge).
 */
export function moveInGrid(rowLengths: readonly number[], pos: GridPos, dir: Dir): GridPos {
  const len = rowLengths[pos.row] ?? 0;
  if (len === 0) return pos;
  const col = Math.min(pos.col, len - 1);
  if (dir === 'left') return { row: pos.row, col: Math.max(0, col - 1) };
  if (dir === 'right') return { row: pos.row, col: Math.min(len - 1, col + 1) };
  const step = dir === 'up' ? -1 : 1;
  let row = pos.row + step;
  while (row >= 0 && row < rowLengths.length && (rowLengths[row] ?? 0) === 0) row += step;
  if (row < 0 || row >= rowLengths.length) return { row: pos.row, col };
  return { row, col: Math.min(col, (rowLengths[row] ?? 1) - 1) };
}
