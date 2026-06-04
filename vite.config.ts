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
        name: 'Aonoseke IPTV Player Pro',
        short_name: 'Aonoseke IPTV',
        description: 'Aonoseke IPTV Player Pro — 3400+ chaînes gratuites par Aonoseke House Investment RDC',
        theme_color: '#0d0a04',
        background_color: '#0d0a04',
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
