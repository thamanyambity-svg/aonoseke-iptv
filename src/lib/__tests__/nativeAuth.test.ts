import { describe, it, expect } from 'vitest';
import { parseAuthCallback, NATIVE_REDIRECT } from '../nativeAuth';

describe('parseAuthCallback', () => {
  it('ignore les liens qui ne sont pas le retour OAuth', () => {
    expect(parseAuthCallback('https://example.com/?code=abc')).toBeNull();
    expect(parseAuthCallback('com.autre.app://auth/callback?code=abc')).toBeNull();
  });
  it('lit le code PKCE dans la query', () => {
    expect(parseAuthCallback(`${NATIVE_REDIRECT}?code=abc123`)).toEqual({ code: 'abc123' });
  });
  it('lit les jetons dans le fragment (flux implicite)', () => {
    expect(parseAuthCallback(`${NATIVE_REDIRECT}#access_token=AT&refresh_token=RT&type=bearer`))
      .toEqual({ accessToken: 'AT', refreshToken: 'RT' });
  });
  it('remonte l’erreur du fournisseur', () => {
    const r = parseAuthCallback(`${NATIVE_REDIRECT}?error=access_denied&error_description=Utilisateur+annul%C3%A9`);
    expect(r?.error).toBe('Utilisateur annulé');
  });
});
