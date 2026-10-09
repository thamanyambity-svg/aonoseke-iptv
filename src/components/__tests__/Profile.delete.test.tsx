import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Profile from '../Profile';
import type { AuthUser } from '../../hooks/useAuth';

const user: AuthUser = { name: 'Aboubacar', email: 'a@x.com', provider: 'google', role: 'user' };
const base = { user, favoritesCount: 2, onClose: vi.fn(), onLogout: vi.fn() };

describe('Profile — suppression de compte', () => {
  it('n’affiche pas le bouton sans onDeleteAccount (démo, administrateur)', () => {
    render(<Profile {...base} />);
    expect(screen.queryByText('Supprimer mon compte')).toBeNull();
  });

  it('exige de taper SUPPRIMER avant d’activer la suppression', async () => {
    const onDeleteAccount = vi.fn().mockResolvedValue({});
    render(<Profile {...base} onDeleteAccount={onDeleteAccount} />);
    fireEvent.click(screen.getByText('Supprimer mon compte'));

    const confirm = screen.getByRole('button', { name: 'Supprimer définitivement' });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Tapez/), { target: { value: 'oui' } });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Tapez/), { target: { value: 'supprimer' } });
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);
    await waitFor(() => expect(onDeleteAccount).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Supprimer définitivement' })).toBeInTheDocument());
  });

  it('affiche l’erreur renvoyée et reste sur l’écran', async () => {
    const onDeleteAccount = vi.fn().mockResolvedValue({ error: 'Service indisponible' });
    render(<Profile {...base} onDeleteAccount={onDeleteAccount} />);
    fireEvent.click(screen.getByText('Supprimer mon compte'));
    fireEvent.change(screen.getByLabelText(/Tapez/), { target: { value: 'SUPPRIMER' } });
    fireEvent.click(screen.getByRole('button', { name: 'Supprimer définitivement' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Service indisponible'));
  });

  it('Annuler referme la confirmation sans rien supprimer', () => {
    const onDeleteAccount = vi.fn();
    render(<Profile {...base} onDeleteAccount={onDeleteAccount} />);
    fireEvent.click(screen.getByText('Supprimer mon compte'));
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(screen.getByText('Supprimer mon compte')).toBeInTheDocument();
    expect(onDeleteAccount).not.toHaveBeenCalled();
  });
});
