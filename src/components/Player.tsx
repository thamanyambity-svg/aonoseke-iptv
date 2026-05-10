import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { Maximize2, Minimize2, Tv } from 'lucide-react';

interface PlayerProps {
  url: string;
  onError?: (err: string) => void;
}

export const Player: React.FC<PlayerProps> = ({ url, onError }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Track fullscreen changes
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !url) return;

    // Destroy previous instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    setIsLoading(true);

    const handleWaiting = () => setIsLoading(true);
    const handlePlaying = () => setIsLoading(false);
    const handleCanPlay = () => setIsLoading(false);
    const handleError = () => setIsLoading(false);

    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
      });

      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              if (onError) onError('Flux inaccessible — réseau ou lien expiré.');
              setIsLoading(false);
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              if (onError) onError('Erreur fatale — chaîne indisponible.');
              setIsLoading(false);
              break;
          }
        }
      });

      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS
      video.src = url;
      video.addEventListener('loadedmetadata', () => {
        video.play().catch(() => {});
      });
    } else {
      if (onError) onError('Votre navigateur ne supporte pas HLS.');
      setIsLoading(false);
    }

    return () => {
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [url, onError]);

  if (!url) {
    return (
      <div className="empty-main">
        <div className="empty-main-icon">
          <Tv size={36} color="var(--accent)" />
        </div>
        <h2>Aucune chaîne sélectionnée</h2>
        <p>Choisissez une chaîne dans la liste pour démarrer la lecture en direct.</p>
        <div className="empty-hint">
          <span>💡</span>
          <span>Ajoutez des chaînes en favoris avec ★</span>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%', background: '#000' }}>
      <video
        ref={videoRef}
        controls
        autoPlay
        playsInline
        style={{ width: '100%', height: '100%', display: 'block' }}
      />

      {isLoading && (
        <div className="loading-overlay">
          <div className="spinner" />
          <div className="loading-text">Chargement du flux…</div>
        </div>
      )}

      <button className="fullscreen-btn" onClick={toggleFullscreen} title="Plein écran">
        {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
      </button>
    </div>
  );
};
