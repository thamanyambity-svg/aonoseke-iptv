import type { Channel } from '../types';

export interface HomeRow {
  id: string;
  title: string;
  channels: Channel[];
}

const ROW_SIZE = 24;
const MIN_ROW = 3;

const GROUP_TITLES: Record<string, string> = {
  Afrique: 'Afrique',
  France: 'France',
  Sport: 'Sport',
  Movies: 'Films',
  Series: 'Séries',
  Kids: 'Jeunesse',
  Documentary: 'Documentaires',
  Music: 'Musique',
  News: 'Actualités',
  Latino: 'Latino',
  Telenovelas: 'Novelas',
  USA: 'États-Unis',
  Italy: 'Italie',
};

/** Ordre d'affichage des rangées thématiques (le reste suit par taille décroissante). */
const GROUP_ORDER = ['Afrique', 'France', 'Sport', 'Movies', 'Series', 'Kids', 'Documentary', 'Music', 'News', 'Telenovelas', 'Latino'];

/** Mélange déterministe : garde l'ordre d'origine mais fait remonter les chaînes vérifiées. */
function verifiedFirst(list: Channel[]): Channel[] {
  return [...list.filter((c) => c.verified), ...list.filter((c) => !c.verified)];
}

/**
 * Construit les rangées façon catalogue : « Congo (RDC) » d'abord, puis les groupes thématiques,
 * puis les autres groupes par taille. Une chaîne n'apparaît jamais deux fois dans la même rangée.
 */
export function buildHomeRows(channels: Channel[]): HomeRow[] {
  const rows: HomeRow[] = [];

  const congo = verifiedFirst(channels.filter((c) => c.country === 'CD' || c.country === 'CG'));
  if (congo.length >= 1) rows.push({ id: 'congo', title: 'Congo (RDC)', channels: congo.slice(0, ROW_SIZE) });

  const byGroup = new Map<string, Channel[]>();
  for (const ch of channels) {
    const list = byGroup.get(ch.group);
    if (list) list.push(ch);
    else byGroup.set(ch.group, [ch]);
  }

  const ordered = [
    ...GROUP_ORDER.filter((g) => byGroup.has(g)),
    ...[...byGroup.keys()]
      .filter((g) => !GROUP_ORDER.includes(g))
      .sort((a, b) => (byGroup.get(b)?.length ?? 0) - (byGroup.get(a)?.length ?? 0)),
  ];

  for (const group of ordered) {
    const list = byGroup.get(group) ?? [];
    if (list.length < MIN_ROW) continue;
    rows.push({ id: `g-${group}`, title: GROUP_TITLES[group] ?? group, channels: verifiedFirst(list).slice(0, ROW_SIZE) });
  }
  return rows;
}

/** Chaîne mise en avant : une chaîne congolaise vérifiée avec logo, sinon la première chaîne avec logo. */
export function pickFeatured(channels: Channel[]): Channel | null {
  const withLogo = channels.filter((c) => c.logo);
  return (
    withLogo.find((c) => (c.country === 'CD' || c.country === 'CG') && c.verified) ??
    withLogo.find((c) => c.verified) ??
    withLogo[0] ??
    channels[0] ??
    null
  );
}
