import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authErrorMessage, loginWithPhone } from '../lib/auth.js';
import { isValidPhone } from '../lib/phone.js';

/**
 * Знак «Подвезём» на тёмном герое — светлый бейдж с тёмным путём и золотой
 * разметкой (обратная полярность относительно .brand-mark в шапке: там знак
 * светлый на тёмном фоне, здесь фон уже тёмный, поэтому бейдж и путь наоборот).
 * Полная версия с пунктиром — размер это позволяет, в отличие от Icon.jsx.
 */
function AuthLogo() {
  return (
    <svg viewBox="0 0 64 64" width="38" height="38" fill="none" aria-hidden="true" focusable="false">
      <path
        d="M17 51 L17 21 Q17 15 23 15 L41 15 Q47 15 47 21 L47 51"
        stroke="var(--accent-deep)"
        strokeWidth="13"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17 51 L17 21 Q17 15 23 15 L41 15 Q47 15 47 21 L47 51"
        stroke="var(--gold)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="5 6"
      />
      <circle cx="47" cy="51" r="5.5" fill="var(--gold)" />
    </svg>
  );
}

export default function Login() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    if (!isValidPhone(phone)) {
      setError('Введите номер телефона полностью.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await loginWithPhone(phone, password);
      // Дальше App.jsx сам уведёт на доску по смене auth-состояния.
    } catch (err) {
      setError(authErrorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-hero">
        <div className="auth-hero-grid" />

        <svg className="auth-hero-route" viewBox="0 0 390 340" preserveAspectRatio="none" aria-hidden="true">
          <path
            className="auth-hero-route-track"
            d="M-30 300 C 90 300, 60 190, 170 176 C 285 162, 250 60, 400 52"
          />
          <path
            className="auth-hero-route-dash"
            d="M-30 300 C 90 300, 60 190, 170 176 C 285 162, 250 60, 400 52"
          />
          <circle className="auth-hero-route-dot" cx="170" cy="176" r="5.5" />
        </svg>

        <div className="auth-hero-brand">
          <span className="auth-hero-mark">
            <AuthLogo />
          </span>
          <div>
            <div className="auth-hero-name">Подвезём</div>
            <div className="auth-hero-tag">дорога до школы</div>
          </div>
        </div>

        <h1 className="auth-hero-title">Ребёнок в школе — вы спокойны</h1>
        <p className="auth-hero-text">
          Объединяемся и помогаем друг другу возить наших детей. Соседи из нашего посёлка, без коммерции.
        </p>
      </div>

      <div className="auth-card">
        <div className="auth-card-head">
          <div className="auth-card-title">Вход</div>
          <div className="auth-card-sub">Телефон и пароль, без SMS.</div>
        </div>

        <form className="form auth-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="login-phone">Телефон</label>
            <input
              id="login-phone"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+7 900 123-45-67"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="login-password">Пароль</label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          {error && <p className="form-error">{error}</p>}

          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Входим…' : 'Войти'}
          </button>
        </form>

        <p className="auth-switch">
          Ещё нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
        </p>
      </div>
    </main>
  );
}
