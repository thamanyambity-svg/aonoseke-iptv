import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { Landing } from './Landing.tsx';
import type { AuthUser } from './hooks/useAuth.ts';

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
  // Full page reload — picks up the stored user on next mount
  window.location.reload();
}

function logout(): void {
  localStorage.removeItem(STORAGE_KEY);
  window.location.reload();
}

// Resolve current user once at module load
const currentUser: AuthUser | null = (() => {
  if (isTV) {
    const tv: AuthUser = { name: 'TV Viewer', email: 'tv@aonoseke.com', provider: 'demo' };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tv));
    return tv;
  }
  return getStoredUser();
})();

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    {currentUser
      ? <App onLogout={logout} user={currentUser} />
      : <Landing onLogin={login} />
    }
  </StrictMode>,
);
