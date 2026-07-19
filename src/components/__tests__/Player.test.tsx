import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Player } from '../Player';

describe('Player', () => {
  it('renders empty state when no url provided', () => {
    render(<Player url="" />);
    expect(screen.getByText('Aucune chaîne sélectionnée')).toBeInTheDocument();
  });

  it('shows hint to add favorites', () => {
    render(<Player url="" />);
    expect(screen.getByText(/Ajoutez des chaînes en favoris/)).toBeInTheDocument();
  });

  it('renders video element when url is provided', () => {
    const { container } = render(<Player url="https://test.com/stream.m3u8" />);
    const video = container.querySelector('video');
    expect(video).toBeInTheDocument();
  });

  it('renders fullscreen button when url is provided', () => {
    render(<Player url="https://test.com/stream.m3u8" />);
    expect(screen.getByLabelText('Basculer le mode plein écran')).toBeInTheDocument();
  });
});
