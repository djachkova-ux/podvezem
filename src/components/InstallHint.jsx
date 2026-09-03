import { useEffect, useState } from 'react';
import Icon from './Icon.jsx';

// Подсказка «добавить на экран» (S11). Два разных пути, потому что установка
// PWA устроена по-разному:
//   • Chrome/Android — событие beforeinstallprompt, установку запускает сам сайт;
//   • Safari/iOS — программного API нет вообще, пользователь обязан пройти
//     «Поделиться» → «На экран „Домой“» руками, поэтому там только инструкция.
// На iOS это не косметика: пока приложение не добавлено на экран, push из S10
// не работают в принципе — Safari выдаёт токен только установленному PWA.

const DISMISSED_KEY = 'podvezem:install-hint-dismissed';

function isInstalled() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // проприетарный флаг Safari — единственный способ узнать это на iOS
    window.navigator.standalone === true
  );
}

function isIosSafari() {
  const ua = navigator.userAgent;
  const ios =
    /iPad|iPhone|iPod/.test(ua) ||
    // iPad с iPadOS 13+ представляется как Mac, отличается только тачем
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  // Chrome, Firefox и Edge на iOS добавлять на экран не умеют — им подсказка
  // не поможет, только собьёт с толку.
  const otherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return ios && !otherBrowser;
}

export default function InstallHint() {
  const [promptEvent, setPromptEvent] = useState(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (isInstalled() || localStorage.getItem(DISMISSED_KEY)) return undefined;

    if (isIosSafari()) {
      setShowIosHint(true);
      setHidden(false);
      return undefined;
    }

    const onPrompt = (event) => {
      // Без этого Chrome покажет свою мини-плашку вместо нашей
      event.preventDefault();
      setPromptEvent(event);
      setHidden(false);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  // Установили из нашей кнопки или из меню браузера — подсказка больше не нужна
  useEffect(() => {
    const onInstalled = () => setHidden(true);
    window.addEventListener('appinstalled', onInstalled);
    return () => window.removeEventListener('appinstalled', onInstalled);
  }, []);

  function dismiss() {
    setHidden(true);
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
  }

  async function install() {
    if (!promptEvent) return;
    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    // Событие одноразовое: второй prompt() на нём браузер уже отклонит
    setPromptEvent(null);
    setHidden(true);
    if (outcome === 'dismissed') localStorage.setItem(DISMISSED_KEY, String(Date.now()));
  }

  if (hidden) return null;

  return (
    <div className="install-hint" role="note">
      <span className="install-hint-mark">
        <Icon name="brand" width="20" height="20" />
      </span>

      <div className="install-hint-body">
        <p className="install-hint-title">Добавьте «Подвезём» на экран</p>
        {showIosHint ? (
          <p className="install-hint-text">
            Нажмите «Поделиться» внизу, затем «На экран „Домой“». Так приложение откроется без
            адресной строки, а уведомления о поездках начнут приходить.
          </p>
        ) : (
          <p className="install-hint-text">
            Откроется без адресной строки, как обычное приложение.
          </p>
        )}
        {!showIosHint && (
          <button type="button" className="btn btn-primary install-hint-action" onClick={install}>
            Установить
          </button>
        )}
      </div>

      <button type="button" className="install-hint-close" onClick={dismiss} aria-label="Скрыть подсказку">
        <Icon name="close" width="18" height="18" />
      </button>
    </div>
  );
}
