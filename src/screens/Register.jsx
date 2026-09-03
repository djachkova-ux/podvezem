import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { deleteUser } from 'firebase/auth';
import { serverTimestamp } from 'firebase/firestore';
import { authErrorMessage, registerWithPhone } from '../lib/auth.js';
import { createUserProfile } from '../lib/db.js';
import { isValidPhone } from '../lib/phone.js';
import { AGREEMENT_VERSION, PRIVACY_VERSION, QUEUES } from '../lib/constants.js';
import ConsentModal from '../components/ConsentModal.jsx';
import TermsAgreementText from '../components/TermsAgreementText.jsx';
import PrivacyConsentText from '../components/PrivacyConsentText.jsx';

// Регистрация требует двух раздельных согласий (юридически разные вещи):
// сперва — пользовательское соглашение об ответственности за поездки,
// затем — согласие на обработку персональных данных. 'terms' | 'privacy' | null.
const STEP_TERMS = 'terms';
const STEP_PRIVACY = 'privacy';

const emptyCar = { plate: '', brand: '', color: '' };

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [address, setAddress] = useState('');
  const [homeQueue, setHomeQueue] = useState(1);
  const [isDriver, setIsDriver] = useState(false);
  const [car, setCar] = useState(emptyCar);
  const [startStreet, setStartStreet] = useState('');
  const [pickupQueues, setPickupQueues] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(null);
  const [termsChecked, setTermsChecked] = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(false);

  function togglePickupQueue(queue) {
    setPickupQueues((prev) =>
      prev.includes(queue) ? prev.filter((item) => item !== queue) : [...prev, queue].sort(),
    );
  }

  function handleFormSubmit(event) {
    event.preventDefault();
    if (!isValidPhone(phone)) {
      setError('Введите номер телефона полностью.');
      return;
    }
    setError('');
    setStep(STEP_TERMS);
  }

  function handleStepCancel() {
    setStep(null);
    setTermsChecked(false);
    setPrivacyChecked(false);
  }

  function handleTermsConfirm() {
    if (!termsChecked) return;
    setStep(STEP_PRIVACY);
  }

  async function handlePrivacyConfirm() {
    if (!privacyChecked) return;

    setSubmitting(true);
    setError('');

    let user;
    try {
      user = await registerWithPhone(phone, password);
    } catch (err) {
      setStep(null);
      setError(authErrorMessage(err));
      setSubmitting(false);
      return;
    }

    try {
      await createUserProfile(user.uid, {
        name: name.trim(),
        phone: phone.trim(),
        isCustomer: true,
        address: address.trim(),
        homeQueue: Number(homeQueue),
        children: [],
        isDriver,
        agreementAccepted: true,
        agreementVersion: AGREEMENT_VERSION,
        agreementAcceptedAt: serverTimestamp(),
        privacyAccepted: true,
        privacyVersion: PRIVACY_VERSION,
        privacyAcceptedAt: serverTimestamp(),
        ...(isDriver
          ? {
              car: { plate: car.plate.trim(), brand: car.brand.trim(), color: car.color.trim() },
              startStreet: startStreet.trim(),
              pickupQueues,
            }
          : {}),
      });
      navigate('/board/drivers', { replace: true });
    } catch {
      await deleteUser(user).catch(() => {});
      setStep(null);
      setError('Не удалось создать профиль. Попробуйте ещё раз.');
      setSubmitting(false);
    }
  }

  return (
    <main className="screen auth-screen">
      <h1 className="screen-title">Регистрация</h1>
      <p className="muted">Телефон работает как логин, SMS не нужен.</p>

      <form className="form" onSubmit={handleFormSubmit}>
        <div className="field">
          <label htmlFor="reg-name">Имя</label>
          <input id="reg-name" value={name} onChange={(event) => setName(event.target.value)} required />
        </div>

        <div className="field">
          <label htmlFor="reg-phone">Телефон</label>
          <input
            id="reg-phone"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+7 900 123-45-67"
            required
          />
        </div>

        <div className="field">
          <label htmlFor="reg-password">Пароль</label>
          <input
            id="reg-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={6}
            required
          />
          <span className="field-hint">Минимум 6 символов.</span>
        </div>

        <div className="field">
          <label htmlFor="reg-address">Адрес, откуда забирать ребёнка</label>
          <input id="reg-address" value={address} onChange={(event) => setAddress(event.target.value)} required />
        </div>

        <div className="field">
          <label htmlFor="reg-queue">Очередь проживания</label>
          <select id="reg-queue" value={homeQueue} onChange={(event) => setHomeQueue(event.target.value)}>
            {QUEUES.map((queue) => (
              <option key={queue} value={queue}>
                Очередь {queue}
              </option>
            ))}
          </select>
        </div>

        <label className="checkbox-row">
          <input type="checkbox" checked={isDriver} onChange={(event) => setIsDriver(event.target.checked)} />
          Я тоже вожу — готов подвозить чужих детей
        </label>

        {isDriver && (
          <>
            <div className="field">
              <label htmlFor="reg-plate">Гос. номер</label>
              <input
                id="reg-plate"
                value={car.plate}
                onChange={(event) => setCar({ ...car, plate: event.target.value })}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="reg-brand">Марка автомобиля</label>
              <input
                id="reg-brand"
                value={car.brand}
                onChange={(event) => setCar({ ...car, brand: event.target.value })}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="reg-color">Цвет автомобиля</label>
              <input
                id="reg-color"
                value={car.color}
                onChange={(event) => setCar({ ...car, color: event.target.value })}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="reg-start-street">Улица отправления</label>
              <input
                id="reg-start-street"
                value={startStreet}
                onChange={(event) => setStartStreet(event.target.value)}
                placeholder="Откуда выезжаете утром"
                required
              />
            </div>

            <p className="section-title">Забирает из очередей</p>
            <div className="checkbox-group">
              {QUEUES.map((queue) => (
                <label className="checkbox-chip" key={queue}>
                  <input
                    type="checkbox"
                    checked={pickupQueues.includes(queue)}
                    onChange={() => togglePickupQueue(queue)}
                  />
                  Очередь {queue}
                </label>
              ))}
            </div>
          </>
        )}

        {error && <p className="form-error">{error}</p>}

        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? 'Создаём…' : 'Зарегистрироваться'}
        </button>
      </form>

      <p className="auth-switch">
        Уже есть аккаунт? <Link to="/login">Войти</Link>
      </p>

      {step === STEP_TERMS && (
        <ConsentModal
          title="Пользовательское соглашение"
          checkboxLabel="Я прочитал(а) и подтверждаю своё согласие с условиями использования"
          confirmLabel="Согласен, продолжить"
          checked={termsChecked}
          onCheckedChange={setTermsChecked}
          onConfirm={handleTermsConfirm}
          onCancel={handleStepCancel}
          confirming={false}
        >
          <TermsAgreementText />
        </ConsentModal>
      )}

      {step === STEP_PRIVACY && (
        <ConsentModal
          title="Согласие на обработку персональных данных"
          checkboxLabel="Я прочитал(а) и даю согласие на обработку персональных данных"
          confirmLabel="Согласен и регистрируюсь"
          checked={privacyChecked}
          onCheckedChange={setPrivacyChecked}
          onConfirm={handlePrivacyConfirm}
          onCancel={handleStepCancel}
          confirming={submitting}
        >
          <PrivacyConsentText />
        </ConsentModal>
      )}
    </main>
  );
}
