import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authErrorMessage, loginWithPhone } from '../lib/auth.js';
import { isValidPhone } from '../lib/phone.js';

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
    <main className="screen auth-screen">
      <h1 className="screen-title">Вход</h1>
      <p className="muted">Телефон и пароль, без SMS.</p>

      <form className="form" onSubmit={handleSubmit}>
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
    </main>
  );
}
