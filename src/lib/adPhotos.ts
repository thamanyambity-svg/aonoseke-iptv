/**
 * Photos réelles (libres de droits, CC0) liées à chaque service d'Alpha Import Exchange.
 * Les campagnes en base référencent encore les anciens visuels `/ads/sectors/<service>-<format>.jpg` :
 * on en déduit le service et on affiche la photo correspondante, avec le texte superposé par le composant.
 */
const SECTORS = [
  'sourcing', 'maritime', 'aerien', 'douane', 'qualite', 'securise', 'financement',
  'conseil', 'electronique', 'btp', 'auto', 'textile', 'solaire', 'machines',
] as const;

const SECTOR_IMAGE = /\/ads\/sectors\/([a-z]+)-(?:banner|preroll|portrait)\.jpg$/;

export function adPhoto(image?: string): string | undefined {
  const id = image ? SECTOR_IMAGE.exec(image)?.[1] : undefined;
  return id && (SECTORS as readonly string[]).includes(id) ? `/ads/photos/${id}.jpg` : undefined;
}
