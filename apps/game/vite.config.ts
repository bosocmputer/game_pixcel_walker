import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

// `npm run dev:lan` (mode "https") serves over HTTPS with a self-signed certificate so phones on the
// same Wi-Fi can use real GPS; the presence WebSocket is proxied on the same origin (/ws → :8787).
export default defineConfig(({ mode }) => ({
  plugins: mode === 'https' ? [basicSsl()] : [],
  server: {
    port: 5173,
    host: true,
    proxy: { '/ws': { target: 'ws://localhost:8787', ws: true } },
  },
  build: { target: 'es2022', chunkSizeWarningLimit: 2000 },
}));
