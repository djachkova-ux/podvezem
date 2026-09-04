// Телефон используется как логин. Firebase Auth не поддерживает вход по
// паролю без email или SMS, поэтому под капотом это email вида
// "<цифры телефона>@transfer.local".

export function digitsOnly(value) {
  return (value || '').replace(/\D/g, '');
}

export function isValidPhone(value) {
  return digitsOnly(value).length === 11;
}

export function phoneToEmail(value) {
  return `${digitsOnly(value)}@transfer.local`;
}

/**
 * Маска для поля ввода телефона: приводит любой ввод (8900…, 900…, +7900…)
 * к единому виду "+7 900 123-45-67". Код страны всегда 7 — ведущие 7 и 8
 * из введённых цифр отбрасываются и заменяются собственным "+7", поэтому
 * итоговый email в phoneToEmail не расходится в зависимости от того, как
 * пользователь набрал номер при регистрации и при входе.
 */
export function formatPhoneInput(rawValue) {
  let national = digitsOnly(rawValue);
  if (national.startsWith('7') || national.startsWith('8')) {
    national = national.slice(1);
  }
  national = national.slice(0, 10);

  let result = '+7';
  if (national.length > 0) result += ` ${national.slice(0, 3)}`;
  if (national.length > 3) result += ` ${national.slice(3, 6)}`;
  if (national.length > 6) result += `-${national.slice(6, 8)}`;
  if (national.length > 8) result += `-${national.slice(8, 10)}`;
  return result;
}
