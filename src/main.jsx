import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import './styles/tokens.css';
import './styles/base.css';
import './styles/forms.css';
import './styles/board.css';

// Сервис-воркер регистрируем сразу при запуске, а не при включении
// уведомлений (S10 делал только так): Chrome предлагает установку лишь когда
// воркер с обработчиком fetch уже активен. В dev не регистрируем — кэш
// воркера конфликтует с HMR Vite, проверять установку нужно на `npm run
// preview` или на боевой сборке.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/firebase-messaging-sw.js').catch(() => {});
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
