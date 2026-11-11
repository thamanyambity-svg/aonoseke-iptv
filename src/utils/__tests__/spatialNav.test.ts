import { describe, it, expect } from 'vitest';
import { moveInGrid, keyToDir, isBackKey } from '../spatialNav';

const rows = [1, 24, 8, 0, 5]; // bannière, 3 rangées, une rangée vide, une dernière

describe('moveInGrid', () => {
  it('gauche/droite restent dans la rangée et s’arrêtent aux bords', () => {
    expect(moveInGrid(rows, { row: 1, col: 3 }, 'right')).toEqual({ row: 1, col: 4 });
    expect(moveInGrid(rows, { row: 1, col: 0 }, 'left')).toEqual({ row: 1, col: 0 });
    expect(moveInGrid(rows, { row: 2, col: 7 }, 'right')).toEqual({ row: 2, col: 7 });
  });
  it('haut/bas gardent la colonne, bornée à la taille de la rangée visée', () => {
    expect(moveInGrid(rows, { row: 1, col: 15 }, 'down')).toEqual({ row: 2, col: 7 });
    expect(moveInGrid(rows, { row: 2, col: 4 }, 'up')).toEqual({ row: 1, col: 4 });
    expect(moveInGrid(rows, { row: 1, col: 9 }, 'up')).toEqual({ row: 0, col: 0 });
  });
  it('saute les rangées vides et ne sort pas de la grille', () => {
    expect(moveInGrid(rows, { row: 2, col: 2 }, 'down')).toEqual({ row: 4, col: 2 });
    expect(moveInGrid(rows, { row: 4, col: 2 }, 'down')).toEqual({ row: 4, col: 2 });
    expect(moveInGrid(rows, { row: 0, col: 0 }, 'up')).toEqual({ row: 0, col: 0 });
  });
});

describe('touches', () => {
  it('reconnaît les flèches et les touches retour des télécommandes', () => {
    expect(keyToDir('ArrowDown')).toBe('down');
    expect(keyToDir('Enter')).toBeNull();
    expect(isBackKey({ key: 'Escape' })).toBe(true);
    expect(isBackKey({ key: 'Unidentified', keyCode: 10009 })).toBe(true);
    expect(isBackKey({ key: 'a' })).toBe(false);
  });
});
