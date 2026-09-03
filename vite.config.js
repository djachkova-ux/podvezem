import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // На Windows host по умолчанию поднимается только на ::1, и localhost по IPv4
    // оказывается недоступен. Явный 127.0.0.1 лечит это.
    // Открыть с телефона в той же сети: npm run dev -- --host
    host: '127.0.0.1',
    port: Number(process.env.PORT) || 5173,
    // Vite по умолчанию отклоняет запросы с чужим Host-заголовком (защита от
    // DNS rebinding) — без этого ngrok-туннель для теста push на телефоне
    // (S10) получает "Blocked request". Домен ngrok меняется при каждом
    // перезапуске (бесплатный тариф), поэтому разрешаем любой хост, а не
    // конкретное имя; это dev-only настройка, на прод-сборку не влияет.
    allowedHosts: true,
  },
  build: {
    outDir: 'dist',
  },
});
