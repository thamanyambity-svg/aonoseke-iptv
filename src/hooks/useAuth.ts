import { useState, useCallback } from 'react';

export interface AuthUser {
  name: string;
  email: string;
  avatar?: string;
  provider: 'demo' | 'google' | 'facebook' | 'email';
}

const STORAGE_KEY = 'iptv-auth-user';

export function useAuth(): {
  user: AuthUser | null;
  login: (user: AuthUser) => void;
  logout: () => void;
} {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  });

  const login = useCallback((u: AuthUser) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  return { user, login, logout };
}
