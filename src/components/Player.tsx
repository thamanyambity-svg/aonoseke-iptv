import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { Maximize2, Minimize2, Tv, RefreshCw } from 'lucide-react';
import type { PlayerProps } from '../types-exports.ts';
import { logger } from '../utils/logger.ts';
import { ErrorMessages } from '../utils/errors.ts';

export const Player: React.FC<PlayerProps> = ({ url, onError }): JSX.Element => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [recovering, setRecovering] = useState(false);

  useEffect((): (() => void) => {
    const onFsChange = (): void => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = useCallback((): void => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch((err) => {
        logger.warn('Fullscreen request failed', { error: String(err) });
      });
    } else {
      document.exitFullscreen().catch((err) => {
        logger.warn('Exit fullscreen failed', { error: String(err) });
      });
    }
  }, []);

  useEffect((): (() => void) => {
    const video = videoRef.current;
    if (!video || !url) return (): void => {};

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    setIsLoading(true);
    setRecovering(false);

    const handleWaiting = (): void => setIsLoading(true);
    const handlePlaying = (): void => { setIsLoading(false); setRecovering(false); };
    const handleCanPlay = (): void => setIsLoading(false);
    const handleVideoError = (): void => setIsLoading(false);

    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleVideoError);

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
      });

      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (): void => {
        video.play().catch((err) => {
          logger.warn('Auto-play prevented', { error: String(err) });
        });
      });

      hls.on(Hls.Events.ERROR, (_event, data): void => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setRecovering(true);
              setIsLoading(true);
              hls.startLoad();
              logger.warn('HLS Network error — retrying', { details: data.details });
              // Only surface the error after recovery attempts have clearly failed
              setTimeout(() => {
                setRecovering(false);
                setIsLoading(false);
                onError?.(ErrorMessages.STREAM_UNAVAILABLE);
              }, 5000);
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              logger.warn('HLS Media error — recovering');
              break;
            default:
              hls.destroy();
              setIsLoading(false);
              onError?.(ErrorMessages.STREAM_ERROR);
              logger.error('HLS Fatal error', undefined, { type: data.type, details: data.details });
              break;
          }
        }
      });

      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      const onMetadata = (): void => {
        video.play().catch((err) => {
          logger.warn('Native HLS play failed', { error: String(err) });
        });
      };
      video.src = url;
      video.addEventListener('loadedmetadata', onMetadata);

      return (): void => {
        video.removeEventListener('waiting', handleWaiting);
        video.removeEventListener('playing', handlePlaying);
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('error', handleVideoError);
        video.removeEventListener('loadedmetadata', onMetadata);
      };
    } else {
      onError?.(ErrorMessages.HLS_NOT_SUPPORTED);
      logger.error('HLS not supported');
      setIsLoading(false);
    }

    return (): void => {
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleVideoError);
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
    <div
      ref={containerRef}
      style={{ position: 'relative', width: '100%', height: '100%', background: '#000' }}
    >
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
          <div className="loading-text">
            {recovering ? 'Reconnexion en cours…' : 'Chargement du flux…'}
          </div>
        </div>
      )}

      <button
        className="fullscreen-btn"
        onClick={toggleFullscreen}
        title="Plein écran"
        aria-label="Basculer le mode plein écran"
      >
        {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
      </button>

      {recovering && (
        <div className="reconnect-badge">
          <RefreshCw size={12} className="spin-icon" />
          Reconnexion…
        </div>
      )}
    </div>
  );
};
