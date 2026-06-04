import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'playlist.json'],
      manifest: {
        name: 'IPTV Premium Player',
        short_name: 'IPTV Player',
        description: 'Lecteur IPTV avec support HLS, favoris et mode hors-ligne',
        theme_color: '#080a12',
        background_color: '#080a12',
        display: 'standalone',
        orientation: 'any',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg}'],
        runtimeCaching: [
          {
            urlPattern: /\.json$/,
            handler: 'NetworkFirst',
            options: { cacheName: 'playlist-cache', expiration: { maxAgeSeconds: 300 } },
          },
        ],
      },
    }),
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
