/**
 * Relais http → https pour les flux HLS (fonctions pures, testées).
 *
 * Un navigateur bloque un flux `http://` lu depuis une page `https://` (contenu mixte). Le relais
 * (`/api/relay`) lit le flux côté serveur et le sert en https depuis le même domaine que le site.
 * Il n'accepte QUE les serveurs `http://` présents dans la playlist (aucun relais ouvert).
 */

export const RELAY_PATH = '/api/relay';
export const MAX_MANIFEST_BYTES = 2 * 1024 * 1024;
export const MAX_SEGMENT_BYTES = 25 * 1024 * 1024;

/** Origines (`http://hôte:port`) des flux http:// de la playlist. */
export function allowedOriginsFrom(playlist) {
  const origins = new Set();
  if (!Array.isArray(playlist)) return origins;
  for (const ch of playlist) {
    if (!ch || typeof ch.url !== 'string') continue;
    try {
      const u = new URL(ch.url);
      if (u.protocol === 'http:') origins.add(u.origin);
    } catch {
      /* URL invalide : ignorée */
    }
  }
  return origins;
}

/** Valide l'adresse demandée : http uniquement, sans identifiants, origine autorisée. Renvoie l'URL ou null. */
export function parseTarget(raw, allowedOrigins) {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 2048) return null;
  let u;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== 'http:' || u.username || u.password) return null;
  if (!allowedOrigins.has(u.origin)) return null;
  return u;
}

export function relayUrl(absolute) {
  return `${RELAY_PATH}?u=${encodeURIComponent(absolute)}`;
}

/** Réécrit une liste de lecture HLS : toute adresse (segment, variante, clé, sous-titres) passe par le relais. */
export function rewriteManifest(text, baseUrl) {
  const abs = (ref) => {
    try {
      return new URL(ref, baseUrl).href;
    } catch {
      return null;
    }
  };
  return text
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();
      if (trimmed === '') return line;
      if (trimmed.startsWith('#')) {
        return line.replace(/URI="([^"]*)"/g, (whole, ref) => {
          const target = abs(ref);
          return target ? `URI="${relayUrl(target)}"` : whole;
        });
      }
      const target = abs(trimmed);
      return target ? relayUrl(target) : line;
    })
    .join('\n');
}

export function isManifest(contentType, url, bodyStart) {
  if (/mpegurl/i.test(contentType || '')) return true;
  if (/\.m3u8?($|\?)/i.test(url)) return true;
  return (bodyStart || '').trimStart().startsWith('#EXTM3U');
}
