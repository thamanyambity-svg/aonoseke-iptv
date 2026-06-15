import { useState, useEffect } from 'react';

export interface PrerollAd {
  id: string;
  title: string;
  subtitle?: string;
  cta?: string;
  url?: string;
  bg?: string;
  image?: string;
  logo?: string;
  eyebrow?: string;
  destinations?: string;
  legal?: string;
  variant?: 'souverain' | 'corridor';
  emblem?: boolean;
}

export interface BannerAd {
  id: string;
  title: string;
  subtitle?: string;
  url?: string;
  image?: string;
  logo?: string;
  legal?: string;
  emblem?: boolean;
}

export interface AdsConfig {
  enabled: boolean;
  preroll: {
    enabled: boolean;
    skipAfter: number;
    maxDuration: number;
    frequency: number;
    items: PrerollAd[];
  };
  banners: BannerAd[];
}

const FALLBACK: AdsConfig = {
  enabled: false,
  preroll: { enabled: false, skipAfter: 5, maxDuration: 12, frequency: 3, items: [] },
  banners: [],
};

export function useAds(): AdsConfig {
  const [config, setConfig] = useState<AdsConfig>(FALLBACK);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/ads.json', { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('no ads'))))
      .then((data: AdsConfig) => setConfig(data))
      .catch(() => setConfig(FALLBACK));
    return () => controller.abort();
  }, []);

  return config;
}
