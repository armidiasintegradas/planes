export const PLANES_AUTH_REDIRECT = 'https://armidiasintegradas.github.io/planes/';

export function getAuthCapabilities(settings = {}) {
  const external = settings?.external || {};
  return {
    email: external.email === true,
    google: external.google === true,
    apple: external.apple === true,
    passkeys: settings?.passkeys_enabled === true,
  };
}

export function validateSignupPassword(password) {
  const errors = [];
  if (password.length < 12) errors.push('Use pelo menos 12 caracteres.');
  if (!/[a-z]/.test(password)) errors.push('Inclua ao menos uma letra minúscula.');
  if (!/[A-Z]/.test(password)) errors.push('Inclua ao menos uma letra maiúscula.');
  if (!/[0-9]/.test(password)) errors.push('Inclua ao menos um número.');
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('Inclua ao menos um símbolo.');
  return { ok: errors.length === 0, errors };
}
