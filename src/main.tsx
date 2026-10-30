import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Immediately retrieve Google Maps Platform API key from Supabase system variables on app open
try {
  fetch('/api/maps-key')
    .then(r => r.json())
    .then(data => {
      if (data?.key && data.key.trim().length > 5) {
        const k = data.key.trim();
        (window as any).GOOGLE_MAPS_PLATFORM_KEY = k;
        (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY = k;
        try {
          localStorage.setItem('GOOGLE_MAPS_PLATFORM_KEY', k);
          if (data.source) {
            localStorage.setItem('GOOGLE_MAPS_KEY_SOURCE', data.source);
          }
        } catch (e) {}
      }
    })
    .catch(() => {});
} catch (e) {}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
