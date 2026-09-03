import { useEffect, useRef, useState } from 'react';

const SCROLL_THRESHOLD = 24;

/**
 * Модалка «прочитай до конца → поставь галочку → подтверди». Используется
 * для двух разных по смыслу согласий на регистрации (пользовательское
 * соглашение об ответственности и согласие на обработку персональных
 * данных) — тексты передаются через children, сама модалка не знает про их
 * содержимое.
 */
export default function ConsentModal({
  title,
  children,
  checkboxLabel,
  confirmLabel,
  checked,
  onCheckedChange,
  onConfirm,
  onCancel,
  confirming,
}) {
  const bodyRef = useRef(null);
  const [scrolledToEnd, setScrolledToEnd] = useState(false);

  function checkScrolledToEnd() {
    const el = bodyRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - SCROLL_THRESHOLD) {
      setScrolledToEnd(true);
    }
  }

  // Короткий текст без прокрутки (узкий экран) — не требуем скроллить то,
  // чего физически нет.
  useEffect(() => {
    checkScrolledToEnd();
  }, []);

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="consent-modal-title">
      <div className="modal-card">
        <div className="modal-header">
          <h2 id="consent-modal-title">{title}</h2>
        </div>

        <div className="modal-body agreement-text" ref={bodyRef} onScroll={checkScrolledToEnd}>
          {children}
        </div>

        <div className="modal-footer">
          {!scrolledToEnd && (
            <p className="field-hint">Долистайте текст до конца, чтобы поставить галочку.</p>
          )}
          <label className={`checkbox-row${!scrolledToEnd ? ' checkbox-row-disabled' : ''}`}>
            <input
              type="checkbox"
              checked={checked}
              disabled={!scrolledToEnd}
              onChange={(event) => onCheckedChange(event.target.checked)}
            />
            {checkboxLabel}
          </label>

          <div className="modal-actions">
            <button className="btn btn-ghost" type="button" onClick={onCancel} disabled={confirming}>
              Отмена
            </button>
            <button
              className="btn btn-primary"
              type="button"
              onClick={onConfirm}
              disabled={!checked || confirming}
            >
              {confirming ? 'Создаём…' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
