import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // На Windows host по умолчанию поднимается только на ::1, и localhost по IPv4
    // оказывается недоступен. Явный 127.0.0.1 лечит это.
    // Открыть с телефона в той же сети: npm run dev -- --host
    host: '127.0.0.1',
    port: 5173,
  },
  build: {
    outDir: 'dist',
  },
});
