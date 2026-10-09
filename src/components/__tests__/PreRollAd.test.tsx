import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { PreRollAd } from '../PreRollAd';

const base = { id: 'a1', title: 'Titre', image: '/h.jpg' };

function renderAd(ad: Record<string, unknown>) {
  return render(<PreRollAd ad={ad as never} skipAfter={5} maxDuration={12} onComplete={() => {}} />);
}

describe('PreRollAd — image verticale', () => {
  it('propose la version verticale sur écran en portrait', () => {
    const { container } = renderAd({ ...base, imagePortrait: '/v.jpg' });
    const source = container.querySelector('picture source');
    expect(source?.getAttribute('media')).toBe('(orientation: portrait)');
    expect(source?.getAttribute('srcset')).toBe('/v.jpg');
    expect(container.querySelector('picture img')?.getAttribute('src')).toBe('/h.jpg');
  });

  it('retombe sur l’image horizontale seule quand il n’y a pas de version verticale', () => {
    const { container } = renderAd(base);
    expect(container.querySelector('picture source')).toBeNull();
    expect(container.querySelector('picture img')?.getAttribute('src')).toBe('/h.jpg');
  });
});
