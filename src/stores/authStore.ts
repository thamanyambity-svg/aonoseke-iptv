import { create } from 'zustand';
import type { AuthUser } from '../hooks/useAuth';

/** Actions fournies par le hook d'auth (enregistrées par AuthGate) pour que l'UI profonde puisse se déconnecter. */
export interface AuthActions {
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<{ error?: string }>;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  actions: AuthActions | null;
  setActions: (actions: AuthActions | null) => void;
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  isAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  actions: null,
  setActions: (actions) => set({ actions }),
  setUser: (user) => set({ user, loading: false }),
  setLoading: (loading) => set({ loading }),
  isAdmin: () => get().user?.role === 'admin',
}));
