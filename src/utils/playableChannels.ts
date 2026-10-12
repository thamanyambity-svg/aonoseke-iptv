import type { Channel } from '../types.ts';

/**
 * Un flux `http://` ne peut pas être lu directement depuis une page en https (contenu mixte bloqué par le
 * navigateur). Deux voies : l'application Android l'autorise, et sur le web le relais `/api/relay` le sert en https.
 */
export const HTTP_RELAY_ENABLED = import.meta.env.VITE_HTTP_RELAY !== 'off';

export function isPlayableHere(url: string, native: boolean, relay: boolean = HTTP_RELAY_ENABLED): boolean {
  return native || relay || !/^http:\/\//i.test(url);
}

export function filterPlayable(
  channels: Channel[],
  native: boolean,
  relay: boolean = HTTP_RELAY_ENABLED,
): Channel[] {
  return channels.filter((ch) => isPlayableHere(ch.url, native, relay));
}

/** Adresse à donner au lecteur : sur le web, un flux http passe par le relais ; ailleurs, inchangée. */
export function playbackUrl(url: string, native: boolean, relay: boolean = HTTP_RELAY_ENABLED): string {
  if (native || !relay || !/^http:\/\//i.test(url)) return url;
  return `/api/relay?u=${encodeURIComponent(url)}`;
}
