import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  PLANES_AUTH_REDIRECT,
  getAuthCapabilities,
  validateSignupPassword,
} from '../lib/auth/security.mjs';

test('uses the production Planes redirect without query parameters', () => {
  assert.equal(PLANES_AUTH_REDIRECT, 'https://armidiasintegradas.github.io/planes/');
});

test('only exposes providers that Supabase reports as enabled', () => {
  const capabilities = getAuthCapabilities({
    external: { email: true, google: false, apple: false },
    passkeys_enabled: false,
  });

  assert.deepEqual(capabilities, {
    email: true,
    google: false,
    apple: false,
    passkeys: false,
  });
});

test('enables passkeys only when Supabase reports them enabled', () => {
  const capabilities = getAuthCapabilities({
    external: { email: true, google: true, apple: true },
    passkeys_enabled: true,
  });

  assert.equal(capabilities.passkeys, true);
  assert.equal(capabilities.google, true);
  assert.equal(capabilities.apple, true);
});

test('rejects weak signup passwords on the Free plan fallback policy', () => {
  assert.equal(validateSignupPassword('password123!').ok, false);
  assert.equal(validateSignupPassword('SomenteLetras!').ok, false);
  assert.equal(validateSignupPassword('sem-maiuscula1!').ok, false);
  assert.equal(validateSignupPassword('SEM-MINUSCULA1!').ok, false);
});

test('accepts a strong signup password', () => {
  const result = validateSignupPassword('Planes#2026Seguro');
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
});

test('uses a Supabase client version that supports passkeys', async () => {
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  const version = pkg.dependencies['@supabase/supabase-js'];
  const [major, minor] = version.replace(/^[^0-9]*/, '').split('.').map(Number);
  assert.equal(major, 2);
  assert.ok(minor >= 105, `expected @supabase/supabase-js >= 2.105.0, received ${version}`);
});

test('opts into experimental passkey support in the Supabase client', async () => {
  const clientSource = await readFile(new URL('../lib/supabase/client.ts', import.meta.url), 'utf8');
  assert.match(clientSource, /experimental\s*:\s*\{\s*passkey\s*:\s*true\s*\}/s);
});
