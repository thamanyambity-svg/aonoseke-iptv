/**
 * AdOverlay — couche d'affichage publicitaire en SURCOUCHE du lecteur vidéo.
 *
 * Garanties (Règle d'or perf) :
 *  - DOM séparé : c'est un frère absolu du <Player>, il ne touche JAMAIS la balise
 *    <video>. La vidéo joue indépendamment de l'état/affichage de la pub.
 *  - Non bloquant : l'overlay a `pointer-events:none` ; seule la carte pub capte
 *    les clics → le reste de la zone vidéo reste interactif.
 *  - Asset déjà préchargé par useAdPrefetch → affichage instantané, zéro buffering.
 *
 * Kill Switch (Supabase Realtime) : abonnement aux UPDATE de `campaigns` filtrés
 * sur la campagne affichée. Si son `status` quitte 'active' (un agent IA / admin
 * a validé l'arrêt), l'overlay se démonte INSTANTANÉMENT, sans refresh.
 *
 * @component AdOverlay
 */
import { useEffect, useRef } from 'react';
import type { JSX } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabaseClient.ts';
import { trackEvent } from '../hooks/useAnalytics.ts';
import { trackAdEvent } from '../hooks/useAds.ts';
import { logger } from '../utils/logger.ts';
import { useAdPrefetch } from '../hooks/useAdPrefetch.ts';
import './AdOverlay.css';

interface AdOverlayProps {
  /** Cycle pub actif (ex. une chaîne joue). false = aucune pub. */
  active: boolean;
}

export function AdOverlay({ active }: AdOverlayProps): JSX.Element | null {
  const { ad, dismiss } = useAdPrefetch(active);
  const trackedRef = useRef<string | null>(null);

  // Impression (une seule fois par campagne affichée).
  useEffect(() => {
    if (ad && trackedRef.current !== ad.campaignId) {
      trackedRef.current = ad.campaignId;
      trackEvent('ad_impression', ad.campaignId);
      void trackAdEvent(ad.campaignId, 'impression');
    }
  }, [ad]);

  // ── Kill Switch temps réel ────────────────────────────────────────────────
  useEffect(() => {
    if (!ad || !supabase) return;
    const channel = supabase
      .channel(`ad-killswitch-${ad.campaignId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'campaigns', filter: `id=eq.${ad.campaignId}` },
        (payload) => {
          const status = (payload.new as { status?: string } | null)?.status;
          if (status && status !== 'active') {
            logger.info('AdOverlay: kill switch déclenché', { campaignId: ad.campaignId, status });
            dismiss(); // démontage instantané
          }
        },
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [ad, dismiss]);

  if (!ad) return null;

  const handleClick = (): void => {
    trackEvent('ad_click', ad.campaignId);
    void trackAdEvent(ad.campaignId, 'click');
    const url = ad.content.url;
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="adov" role="dialog" aria-label={`Publicité ${ad.advertiser}`}>
      <div className="adov-card">
        <button className="adov-close" onClick={dismiss} aria-label="Fermer la publicité">
          <X size={15} />
        </button>
        <div
          className="adov-clickable"
          onClick={handleClick}
          onKeyDown={(e) => { if (e.key === 'Enter') handleClick(); }}
          role="button"
          tabIndex={0}
        >
          {ad.content.video ? (
            <video className="adov-media" src={ad.content.video} autoPlay muted loop playsInline />
          ) : ad.content.image ? (
            <img className="adov-media" src={ad.content.image} alt={ad.advertiser} />
          ) : (
            <div className="adov-text">{ad.content.title ?? ad.advertiser}</div>
          )}
          <div className="adov-meta">
            <span className="adov-label">Publicité · {ad.advertiser}</span>
            {ad.content.cta && (
              <span className="adov-cta">{ad.content.cta} <ExternalLink size={12} aria-hidden="true" /></span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
