import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'logo.png'],
      manifest: {
        name: 'Karachi Dash',
        short_name: 'KarachiDash',
        description: 'Fast one-thumb endless runner through the streets of Karachi',
        theme_color: '#0B1C2C',
        background_color: '#0B1C2C',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        icons: [
          {
            src: 'pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
        ],
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
  },
  build: {
    target: 'es2020',
  },
});
