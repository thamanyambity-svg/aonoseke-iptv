import { describe, it, expect } from 'vitest';
import { appConfig } from '../config';

describe('appConfig', () => {
  it('has default playlist URL', () => {
    expect(appConfig.playlistUrl).toBe('/playlist.json');
  });

  it('has default max channels of 5000', () => {
    expect(appConfig.maxChannels).toBe(5000);
  });

  it('has French as default language', () => {
    expect(appConfig.defaultLanguage).toBe('fr');
  });

  it('has favorites storage key', () => {
    expect(appConfig.favoritesStorageKey).toBe('iptv-favorites');
  });

  it('has API timeout', () => {
    expect(appConfig.apiTimeout).toBeGreaterThan(0);
  });
});
