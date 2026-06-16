import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    // KILL-SWITCH : service worker auto-destructeur. L'ancien SW « collant »
    // (qui servait un vieux bundle SANS le heartbeat, et que mon précédent
    // correctif NetworkFirst avait empêché de se faire remplacer) se désinscrit
    // de lui-même + vide tous les caches sur chaque appareil. L'app charge
    // ensuite TOUJOURS le code frais depuis le réseau → fin définitive du cache
    // bloqué, et le heartbeat (présence + activité) s'exécute enfin.
    VitePWA({ selfDestroying: true }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('hls.js')) return 'hls';
          if (id.includes('react')) return 'react';
        },
      },
    },
  },
});
