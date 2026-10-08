import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Landing } from '../Landing';

function setup(overrides: Partial<React.ComponentProps<typeof Landing>> = {}) {
  const props = {
    onSignUp: vi.fn().mockResolvedValue({}),
    onSignIn: vi.fn().mockResolvedValue({}),
    onSocial: vi.fn().mockResolvedValue({}),
    onPhoneSend: vi.fn().mockResolvedValue({}),
    onPhoneVerify: vi.fn().mockResolvedValue({}),
    onDemo: vi.fn(),
    ...overrides,
  };
  render(<Landing {...props} />);
  fireEvent.click(screen.getByRole('tab', { name: 'Téléphone' }));
  return props;
}

describe('Landing — connexion par téléphone', () => {
  it('envoie le numéro au format international puis valide le code', async () => {
    const props = setup();
    fireEvent.change(screen.getByLabelText('Numéro de téléphone'), { target: { value: '081 234 56 78' } });
    fireEvent.click(screen.getByRole('button', { name: /Recevoir le code/ }));

    await waitFor(() => expect(props.onPhoneSend).toHaveBeenCalledWith('+243812345678'));
    const otpInput = await screen.findByLabelText('Code reçu par SMS');

    fireEvent.change(otpInput, { target: { value: '12 34 56' } });
    fireEvent.click(screen.getByRole('button', { name: /Valider le code/ }));
    await waitFor(() => expect(props.onPhoneVerify).toHaveBeenCalledWith('+243812345678', '123456'));
  });

  it('refuse un numéro invalide sans appeler le serveur', () => {
    const props = setup();
    fireEvent.change(screen.getByLabelText('Numéro de téléphone'), { target: { value: '12' } });
    fireEvent.click(screen.getByRole('button', { name: /Recevoir le code/ }));
    expect(screen.getByText(/Numéro invalide/)).toBeInTheDocument();
    expect(props.onPhoneSend).not.toHaveBeenCalled();
  });

  it('affiche un message clair quand les SMS ne sont pas activés', async () => {
    setup({ onPhoneSend: vi.fn().mockResolvedValue({ error: 'Unsupported phone provider' }) });
    fireEvent.change(screen.getByLabelText('Numéro de téléphone'), { target: { value: '812345678' } });
    fireEvent.click(screen.getByRole('button', { name: /Recevoir le code/ }));
    expect(await screen.findByText(/SMS n'est pas encore activé/)).toBeInTheDocument();
  });

  it('refuse un code de moins de 6 chiffres', async () => {
    const props = setup();
    fireEvent.change(screen.getByLabelText('Numéro de téléphone'), { target: { value: '812345678' } });
    fireEvent.click(screen.getByRole('button', { name: /Recevoir le code/ }));
    const otpInput = await screen.findByLabelText('Code reçu par SMS');
    fireEvent.change(otpInput, { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: /Valider le code/ }));
    expect(screen.getByText(/code à 6 chiffres/)).toBeInTheDocument();
    expect(props.onPhoneVerify).not.toHaveBeenCalled();
  });
});
