import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { Landing } from './Landing.tsx';
import type { AuthUser } from './hooks/useAuth.ts';
import { parseOAuthRedirect, signOutRemote } from './lib/supabase.ts';

// Detect Smart TV UA
const TV_UA = /VIDAA|HbbTV|SmartTV|Tizen|WebOS|SMART-TV|Android.*TV|NetCast|PHILIPS|Viera|Roku/i;
const isTV = TV_UA.test(navigator.userAgent)
  || (window.matchMedia('(hover: none) and (pointer: coarse)').matches && !navigator.maxTouchPoints);

if (isTV) {
  document.documentElement.classList.add('tv-mode');
  document.addEventListener('contextmenu', (e) => e.preventDefault());
}

const STORAGE_KEY = 'iptv-auth-user';

function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

function login(u: AuthUser): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
  window.location.reload();
}

function logout(): void {
  signOutRemote();
  localStorage.removeItem(STORAGE_KEY);
  window.location.reload();
}

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

function render(user: AuthUser | null): void {
  createRoot(root as HTMLElement).render(
    <StrictMode>
      {user
        ? <App onLogout={logout} user={user} />
        : <Landing onLogin={login} />}
    </StrictMode>,
  );
}

// Bootstrap — gère d'abord un éventuel retour OAuth (#access_token=…)
async function bootstrap(): Promise<void> {
  // TV : connexion auto en mode démo
  if (isTV) {
    const tv: AuthUser = { name: 'TV Viewer', email: 'tv@aonoseke.com', provider: 'demo' };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tv));
    render(tv);
    return;
  }

  // Retour d'un login OAuth hébergé Supabase
  if (window.location.hash.includes('access_token=')) {
    const user = await parseOAuthRedirect();
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      render(user);
      return;
    }
  }

  render(getStoredUser());
}

void bootstrap();
