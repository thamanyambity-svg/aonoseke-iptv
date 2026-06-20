import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { Landing } from './Landing.tsx';
import { AiAdCalendar } from './components/regie/AiAdCalendar.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { useAuth } from './hooks/useAuth.ts';
import { captureUtmParams } from './utils/utmTracking.ts';

// Capture les UTM params de l'URL d'atterrissage (Phase 1 tracking écosystème)
// À appeler le plus tôt possible, avant le rendu React.
captureUtmParams();

// Detect Smart TV UA
const TV_UA = /VIDAA|HbbTV|SmartTV|Tizen|WebOS|SMART-TV|Android.*TV|NetCast|PHILIPS|Viera|Roku/i;
const isTV = TV_UA.test(navigator.userAgent)
  || (window.matchMedia('(hover: none) and (pointer: coarse)').matches && !navigator.maxTouchPoints);

if (isTV) {
  document.documentElement.classList.add('tv-mode');
  document.addEventListener('contextmenu', (e) => e.preventDefault());
}

function Root(): JSX.Element {
  const { user, loading, signUp, signIn, signInWithProvider, signInDemo, signOut } = useAuth();

  // Point d'entrée preview de la régie IA — /#regie (bypass auth pour démo/preview).
  if (window.location.hash.toLowerCase().includes('regie')) {
    return <AiAdCalendar standalone />;
  }

  if (loading) {
    return (
      <div className="boot-screen">
        <div className="spinner" />
      </div>
    );
  }

  if (!user) {
    return (
      <Landing
        onSignUp={signUp}
        onSignIn={signIn}
        onSocial={signInWithProvider}
        onDemo={signInDemo}
      />
    );
  }

  return <App user={user} onLogout={() => void signOut()} />;
}

// PWA : recharge auto quand un nouveau service worker prend la main
// (évite de rester bloqué sur un ancien bundle en cache après un déploiement).
if ('serviceWorker' in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <Root />
    </ErrorBoundary>
  </StrictMode>,
);
