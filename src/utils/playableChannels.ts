import type { Channel } from '../types.ts';

/**
 * Un flux `http://` ne peut pas être lu depuis une page en https (contenu mixte bloqué par le navigateur) :
 * il n'est donc proposé que dans l'application Android, qui autorise le trafic non chiffré.
 */
export function isPlayableHere(url: string, native: boolean): boolean {
  return native || !/^http:\/\//i.test(url);
}

export function filterPlayable(channels: Channel[], native: boolean): Channel[] {
  return channels.filter((ch) => isPlayableHere(ch.url, native));
}
