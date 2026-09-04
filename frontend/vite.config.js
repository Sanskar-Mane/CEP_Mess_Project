import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['vite.svg'],
      manifest: {
        name: 'Avasari Connect',
        short_name: 'Avasari',
        description: 'Your campus dining and living network',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'vite.svg', // Using your existing Vite logo as a placeholder
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: 'vite.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
          }
        ]
      }
    })
  ],
});