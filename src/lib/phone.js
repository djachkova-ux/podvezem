// Телефон используется как логин. Firebase Auth не поддерживает вход по
// паролю без email или SMS, поэтому под капотом это email вида
// "<цифры телефона>@transfer.local".

export function digitsOnly(value) {
  return (value || '').replace(/\D/g, '');
}

export function isValidPhone(value) {
  return digitsOnly(value).length >= 10;
}

export function phoneToEmail(value) {
  return `${digitsOnly(value)}@transfer.local`;
}
