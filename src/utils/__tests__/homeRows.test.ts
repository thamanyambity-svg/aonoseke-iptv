import { describe, it, expect } from 'vitest';
import { buildHomeRows, pickFeatured } from '../homeRows';
import type { Channel } from '../../types';

const ch = (name: string, group: string, country = 'FR', extra: Partial<Channel> = {}): Channel => ({
  name, group, country, logo: '', url: `https://x/${name}.m3u8`, ...extra,
});

describe('buildHomeRows', () => {
  it('met Congo en premier, puis les groupes thématiques dans l’ordre voulu', () => {
    const list = [
      ...['a', 'b', 'c'].map((n) => ch(`sp${n}`, 'Sport')),
      ...['a', 'b', 'c'].map((n) => ch(`af${n}`, 'Afrique', 'CI')),
      ch('rtnc', 'Afrique', 'CD'),
    ];
    const rows = buildHomeRows(list);
    expect(rows.map((r) => r.title)).toEqual(['Congo (RDC)', 'Afrique', 'Sport']);
  });

  it('ignore les groupes de moins de 3 chaînes (sauf Congo)', () => {
    const rows = buildHomeRows([ch('x', 'Comedy'), ch('y', 'Comedy')]);
    expect(rows).toEqual([]);
  });

  it('plafonne chaque rangée et fait remonter les chaînes vérifiées', () => {
    const list = Array.from({ length: 40 }, (_, i) => ch(`m${i}`, 'Movies', 'US', i === 39 ? { verified: true } : {}));
    const [row] = buildHomeRows(list);
    expect(row?.channels).toHaveLength(24);
    expect(row?.channels[0]?.name).toBe('m39');
  });

  it('classe les groupes inconnus par taille décroissante', () => {
    const list = [
      ...Array.from({ length: 3 }, (_, i) => ch(`p${i}`, 'Petit')),
      ...Array.from({ length: 5 }, (_, i) => ch(`g${i}`, 'Gros')),
    ];
    expect(buildHomeRows(list).map((r) => r.title)).toEqual(['Gros', 'Petit']);
  });
});

describe('pickFeatured', () => {
  it('préfère une chaîne congolaise vérifiée avec logo', () => {
    const list = [
      ch('a', 'Sport', 'FR', { logo: 'l', verified: true }),
      ch('rtnc', 'Afrique', 'CD', { logo: 'l', verified: true }),
    ];
    expect(pickFeatured(list)?.name).toBe('rtnc');
  });
  it('retombe sur la première chaîne, ou null si la liste est vide', () => {
    expect(pickFeatured([ch('z', 'Sport')])?.name).toBe('z');
    expect(pickFeatured([])).toBeNull();
  });
});
