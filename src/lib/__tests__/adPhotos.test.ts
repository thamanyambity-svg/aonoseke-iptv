import { describe, it, expect } from 'vitest';
import { adPhoto } from '../adPhotos.ts';
import { BAR_ENTER, BAR_EXIT, CARD_ENTER, CARD_EXIT, pick } from '../adAnimations.ts';

describe('adPhoto', () => {
  it('déduit la photo du service depuis les anciens visuels', () => {
    expect(adPhoto('/ads/sectors/maritime-banner.jpg')).toBe('/ads/photos/maritime.jpg');
    expect(adPhoto('/ads/sectors/solaire-preroll.jpg')).toBe('/ads/photos/solaire.jpg');
    expect(adPhoto('/ads/sectors/btp-portrait.jpg')).toBe('/ads/photos/btp.jpg');
  });
  it('ignore les images inconnues ou absentes', () => {
    expect(adPhoto(undefined)).toBeUndefined();
    expect(adPhoto('https://exemple.com/pub.jpg')).toBeUndefined();
    expect(adPhoto('/ads/sectors/inconnu-banner.jpg')).toBeUndefined();
  });
});

describe('adAnimations', () => {
  it('pick renvoie toujours un élément de la liste', () => {
    for (let i = 0; i < 50; i++) {
      expect(CARD_ENTER).toContain(pick(CARD_ENTER));
      expect(CARD_EXIT).toContain(pick(CARD_EXIT));
      expect(BAR_ENTER).toContain(pick(BAR_ENTER));
      expect(BAR_EXIT).toContain(pick(BAR_EXIT));
    }
  });
});
