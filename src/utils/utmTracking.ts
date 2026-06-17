/**
 * Capture et propagation des paramètres UTM (Phase 1 du plan écosystème).
 *
 * Au chargement de l'app, si l'URL contient des paramètres UTM
 * (utm_source, utm_medium, utm_campaign, utm_content, utm_term),
 * ils sont capturés et stockés en localStorage pour être attachés à
 * tous les événements de tracking envoyés par la suite.
 *
 * Cela permet l'attribution : un visiteur qui arrive via une pub
 * pré-roll du player IPTV portera ces UTMs dans tous ses événements,
 * et la plateforme Alpha Import Exchange pourra les lire (via cookie
 * partagé ou paramètre d'URL sur la redirection) pour attribuer
 * les inscriptions/demandes au player.
 *
 * @module utmTracking
 */

const UTM_KEY = 'iptv-utm-params';
const UTM_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours

export interface UtmParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  captured_at: number; // timestamp ms
  landing_url: string; // URL d'atterrissage
}

/**
 * Capture les UTM params depuis l'URL courante et les stocke en localStorage.
 * À appeler au démarrage de l'app (main.tsx ou App.tsx useEffect).
 *
 * Ne fait rien si l'URL ne contient pas d'UTMs (préserve les UTM précédents).
 */
export function captureUtmParams(): void {
  try {
    const url = new URL(window.location.href);
    const params = url.searchParams;

    const hasUtm = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']
      .some((k) => params.has(k));

    if (!hasUtm) return; // pas d'UTM dans l'URL → on garde les précédents

    const utm: UtmParams = {
      utm_source: params.get('utm_source') ?? undefined,
      utm_medium: params.get('utm_medium') ?? undefined,
      utm_campaign: params.get('utm_campaign') ?? undefined,
      utm_content: params.get('utm_content') ?? undefined,
      utm_term: params.get('utm_term') ?? undefined,
      captured_at: Date.now(),
      landing_url: window.location.pathname + window.location.search,
    };

    localStorage.setItem(UTM_KEY, JSON.stringify(utm));
  } catch {
    /* localStorage indisponible ou mode privé */
  }
}

/**
 * Récupère les UTM params stockés (ou null si absents / expirés).
 */
export function getUtmParams(): UtmParams | null {
  try {
    const raw = localStorage.getItem(UTM_KEY);
    if (!raw) return null;
    const utm = JSON.parse(raw) as UtmParams;

    // Expiration après 30 jours
    if (Date.now() - utm.captured_at > UTM_TTL_MS) {
      localStorage.removeItem(UTM_KEY);
      return null;
    }

    return utm;
  } catch {
    return null;
  }
}

/**
 * Construit une chaîne de query string avec les UTM params stockés,
 * prête à être ajoutée à une URL de destination (lien annonceur, etc.).
 *
 * @example
 *   const url = `https://alpha-import.com/register?${buildUtmQueryString()}`;
 */
export function buildUtmQueryString(): string {
  const utm = getUtmParams();
  if (!utm) return '';

  const parts: string[] = [];
  if (utm.utm_source) parts.push(`utm_source=${encodeURIComponent(utm.utm_source)}`);
  if (utm.utm_medium) parts.push(`utm_medium=${encodeURIComponent(utm.utm_medium)}`);
  if (utm.utm_campaign) parts.push(`utm_campaign=${encodeURIComponent(utm.utm_campaign)}`);
  if (utm.utm_content) parts.push(`utm_content=${encodeURIComponent(utm.utm_content)}`);
  if (utm.utm_term) parts.push(`utm_term=${encodeURIComponent(utm.utm_term)}`);

  return parts.join('&');
}

/**
 * Ajoute les UTM params à une URL de destination si elle n'en a pas déjà.
 *
 * @example
 *   const url = appendUtm('https://alpha-import.com/register');
 *   // → https://alpha-import.com/register?utm_source=iptv-player&utm_medium=preroll
 */
export function appendUtm(targetUrl: string): string {
  const utm = getUtmParams();
  if (!utm) return targetUrl;

  try {
    const url = new URL(targetUrl);
    // Ne pas écraser des UTMs déjà présents dans l'URL cible
    if (!url.searchParams.has('utm_source') && utm.utm_source) {
      url.searchParams.set('utm_source', utm.utm_source);
    }
    if (!url.searchParams.has('utm_medium') && utm.utm_medium) {
      url.searchParams.set('utm_medium', utm.utm_medium);
    }
    if (!url.searchParams.has('utm_campaign') && utm.utm_campaign) {
      url.searchParams.set('utm_campaign', utm.utm_campaign);
    }
    if (!url.searchParams.has('utm_content') && utm.utm_content) {
      url.searchParams.set('utm_content', utm.utm_content);
    }
    if (!url.searchParams.has('utm_term') && utm.utm_term) {
      url.searchParams.set('utm_term', utm.utm_term);
    }
    return url.toString();
  } catch {
    // URL invalide → on retourne telle quelle
    return targetUrl;
  }
}

/**
 * Nettoie les UTM params stockés (à appeler lors d'une déconnexion
 * ou d'un reset explicite).
 */
export function clearUtmParams(): void {
  try {
    localStorage.removeItem(UTM_KEY);
  } catch {
    /* ignore */
  }
}
