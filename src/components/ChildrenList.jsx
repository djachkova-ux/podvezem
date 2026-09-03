// Список детей заказчика: добавление, редактирование имени/возраста, удаление.
// Управляется снаружи через children + onChange (используется в Profile.jsx).

import { useEffect, useRef } from 'react';

export default function ChildrenList({ children, onChange }) {
  // Автофокус на имя только что добавленного ребёнка — иначе непонятно,
  // сработало ли нажатие «Добавить»: строка просто молча появлялась внизу.
  const newNameRef = useRef(null);
  const prevCount = useRef(children.length);

  useEffect(() => {
    if (children.length > prevCount.current) newNameRef.current?.focus();
    prevCount.current = children.length;
  }, [children.length]);

  function updateChild(id, patch) {
    onChange(children.map((child) => (child.id === id ? { ...child, ...patch } : child)));
  }

  function removeChild(id) {
    onChange(children.filter((child) => child.id !== id));
  }

  function addChild() {
    onChange([...children, { id: crypto.randomUUID(), name: '', age: '' }]);
  }

  return (
    <div className="form" role="group" aria-label="Дети">
      {children.length === 0 && <p className="muted">Пока никого не добавили.</p>}

      {children.map((child, index) => (
        <div className="child-row" key={child.id}>
          <div className="field">
            <label htmlFor={`child-name-${child.id}`}>Имя</label>
            <input
              id={`child-name-${child.id}`}
              ref={index === children.length - 1 ? newNameRef : null}
              value={child.name}
              onChange={(event) => updateChild(child.id, { name: event.target.value })}
              placeholder="Имя ребёнка"
            />
          </div>
          <div className="field field-age">
            <label htmlFor={`child-age-${child.id}`}>Возраст</label>
            <input
              id={`child-age-${child.id}`}
              type="number"
              min="0"
              max="18"
              value={child.age}
              onChange={(event) => updateChild(child.id, { age: event.target.value })}
            />
          </div>
          <button
            type="button"
            className="child-remove"
            onClick={() => removeChild(child.id)}
            aria-label={`Удалить ${child.name || 'ребёнка'}`}
          >
            ×
          </button>
        </div>
      ))}

      <button type="button" className="btn btn-primary" onClick={addChild}>
        Добавить ребёнка
      </button>
    </div>
  );
}
