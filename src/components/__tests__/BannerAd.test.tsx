import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { BannerAd } from '../BannerAd.tsx';

const ad = {
  id: 'b1',
  title: 'Équipez vos chantiers',
  subtitle: 'Carrelage, sanitaires, quincaillerie',
  cta: 'Demander un devis',
  url: 'https://example.com',
  image: '/ads/sectors/btp-banner.jpg',
};

describe('BannerAd (carte sponsor)', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('affiche la photo du service avec le texte superposé', () => {
    const { container } = render(<BannerAd ad={ad} />);
    expect(container.querySelector('img.sp-photo')?.getAttribute('src')).toBe('/ads/photos/btp.jpg');
    expect(screen.getByText('Équipez vos chantiers')).toBeTruthy();
    expect(screen.getByText('Alpha Import Exchange')).toBeTruthy();
    expect(screen.getByText(/Demander un devis/)).toBeTruthy();
  });

  it('enchaîne entrée → affichage → sortie puis appelle onDone une fois', () => {
    const onDone = vi.fn();
    const { container } = render(<BannerAd ad={ad} visibleMs={4000} onDone={onDone} />);
    const card = container.firstElementChild as HTMLElement;
    expect(card.className).toContain('sp-phase-in');
    act(() => { vi.advanceTimersByTime(1000); });
    expect(card.className).toContain('sp-phase-show');
    act(() => { vi.advanceTimersByTime(4000); });
    expect(card.className).toContain('sp-phase-out');
    expect(onDone).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(700); });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('compte une impression et ouvre le lien au clic', () => {
    const onImpression = vi.fn();
    const onClick = vi.fn();
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    render(<BannerAd ad={ad} onImpression={onImpression} onClick={onClick} />);
    expect(onImpression).toHaveBeenCalledWith('b1');
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledWith('b1');
    expect(open).toHaveBeenCalledWith('https://example.com', '_blank', 'noopener,noreferrer');
    open.mockRestore();
  });
});
