import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { Landing } from './Landing.tsx';
import { useAuth } from './hooks/useAuth.ts';

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

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
