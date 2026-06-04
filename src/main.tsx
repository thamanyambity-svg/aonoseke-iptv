import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

// Detect Smart TV user agents (VIDAA, Tizen, WebOS, Android TV…)
const TV_UA = /VIDAA|HbbTV|SmartTV|Tizen|WebOS|SMART-TV|Android.*TV|TV\s*Safari|NetCast|PHILIPS|Viera|Roku/i;
const isTV = TV_UA.test(navigator.userAgent)
  || window.matchMedia('(hover: none) and (pointer: coarse)').matches
  || window.screen.width >= 1920 && !navigator.maxTouchPoints;

if (isTV) {
  document.documentElement.classList.add('tv-mode');
  // Disable context menu on TV (no right-click)
  document.addEventListener('contextmenu', (e) => e.preventDefault());
}

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
