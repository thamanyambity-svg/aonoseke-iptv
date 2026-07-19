import { StrictMode, useEffect, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import App from './App.tsx';
import { Landing } from './Landing.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { useAuth } from './hooks/useAuth.ts';
import { captureUtmParams } from './utils/utmTracking.ts';
import { startPresence } from './lib/devicePresence.ts';
import { initSentry } from './lib/sentry.ts';
import { useAuthStore } from './stores/authStore.ts';

initSentry();

captureUtmParams();
startPresence();

const AdminPage = lazy(() => import('./pages/AdminPage.tsx'));

const TV_UA = /VIDAA|HbbTV|SmartTV|Tizen|WebOS|SMART-TV|Android.*TV|NetCast|PHILIPS|Viera|Roku/i;
const isTV = TV_UA.test(navigator.userAgent)
  || (window.matchMedia('(hover: none) and (pointer: coarse)').matches && !navigator.maxTouchPoints);

if (isTV) {
  document.documentElement.classList.add('tv-mode');
  document.addEventListener('contextmenu', (e) => e.preventDefault());
}

function AuthGate({ children }: { children: React.ReactNode }): JSX.Element {
  const { user, loading, signUp, signIn, signInWithProvider, signInDemo, signOut } = useAuth();
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);

  useEffect(() => {
    setUser(user);
  }, [user, setUser]);

  useEffect(() => {
    setLoading(loading);
  }, [loading, setLoading]);

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

  return <>{children}</>;
}

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
      <BrowserRouter>
        <AuthGate>
          <Routes>
            <Route path="/" element={<App />} />
            <Route
              path="/admin"
              element={
                <Suspense fallback={<div className="admin-loading"><div className="spinner" /><p>Chargement…</p></div>}>
                  <AdminPage />
                </Suspense>
              }
            />
          </Routes>
        </AuthGate>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
