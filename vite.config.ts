import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'pwa-icon.svg'],
      manifest: {
        name: 'Coldview — private crypto portfolio',
        short_name: 'Coldview',
        description: 'A private, read-only, keyless crypto portfolio dashboard. Your data never leaves your device.',
        theme_color: '#070a0e',
        background_color: '#070a0e',
        display: 'standalone',
        start_url: './',
        scope: './',
        icons: [
          { src: 'pwa-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'pwa-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        // Show the last-loaded portfolio/prices when offline; refresh when back online.
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              /(blockscout\.com|coins\.llama\.fi|publicnode\.com|blockstream\.info|ensideas\.com)/.test(url.host),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'coldview-api',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    exclude: ['**/node_modules/**', '**/tests/e2e/**'],
  },
});
