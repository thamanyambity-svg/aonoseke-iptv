import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';

const trackAdEvent = vi.fn().mockResolvedValue(undefined);
vi.mock('../../hooks/useAds.ts', () => ({ trackAdEvent: (...a: unknown[]): unknown => trackAdEvent(...a) }));
vi.mock('../../hooks/useAnalytics.ts', () => ({ trackEvent: vi.fn() }));
vi.mock('../../lib/adTracking.ts', () => ({ detectDevice: () => 'desktop' }));

import { AdBanner } from '../AdBanner.tsx';
import type { AdCampaign } from '../../hooks/useAdMatrix';

const campaign = {
  id: 'c1',
  advertiser_name: 'Alpha Import Exchange',
  name: 'Alpha Import — Fret Maritime (banner)',
  type: 'banner',
  content: { title: 'Vos conteneurs, de l’Asie à Kinshasa', subtitle: 'Suivi complet', cta: 'Voir le circuit', url: 'https://example.com' },
  weight: 10,
  frequency_cap_per_user: 0,
} as unknown as AdCampaign;

describe('AdBanner (bandeau bas d’écran)', () => {
  beforeEach(() => { vi.useFakeTimers(); trackAdEvent.mockClear(); });
  afterEach(() => { vi.useRealTimers(); });

  it('affiche annonceur, titre, sous-titre et appel à l’action', () => {
    render(<AdBanner campaign={campaign} />);
    expect(screen.getByText('Pub')).toBeTruthy();
    expect(screen.getByText(campaign.content.title)).toBeTruthy();
    expect(screen.getByText('Suivi complet')).toBeTruthy();
    expect(screen.getByText('Voir le circuit')).toBeTruthy();
  });

  it('enchaîne entrée → affichage → sortie puis appelle onDone', () => {
    const onDone = vi.fn();
    const { container } = render(<AdBanner campaign={campaign} visibleMs={5000} onDone={onDone} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain('ad-lt--in');
    act(() => { vi.advanceTimersByTime(1100); });
    expect(root.className).toContain('ad-lt--show');
    act(() => { vi.advanceTimersByTime(5000); });
    expect(root.className).toContain('ad-lt--out');
    expect(onDone).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(800); });
    expect(onDone).toHaveBeenCalledWith('timeout');
  });

  it('enregistre une impression une seule fois', () => {
    render(<AdBanner campaign={campaign} />);
    act(() => { vi.advanceTimersByTime(3000); });
    expect(trackAdEvent.mock.calls.filter((c) => c[1] === 'impression')).toHaveLength(1);
  });

  it('un clic enregistre le clic et ouvre le lien', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    render(<AdBanner campaign={campaign} />);
    fireEvent.click(screen.getByText('Voir le circuit'));
    expect(trackAdEvent).toHaveBeenCalledWith('c1', 'click', expect.anything());
    await vi.waitFor(() => expect(open).toHaveBeenCalledWith('https://example.com', '_blank', 'noopener,noreferrer'));
    open.mockRestore();
  });

  it('la fermeture lance la sortie puis onDone("closed") sans doublon', () => {
    const onDone = vi.fn();
    render(<AdBanner campaign={campaign} visibleMs={1000} onDone={onDone} />);
    fireEvent.click(screen.getByLabelText('Fermer'));
    act(() => { vi.advanceTimersByTime(800); });
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onDone).toHaveBeenCalledWith('closed');
    act(() => { vi.advanceTimersByTime(5000); });
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
