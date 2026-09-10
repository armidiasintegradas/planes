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

test('auth gate is Google-first with passkey and admin email fallback', async () => {
  const source = await readFile(new URL('../components/AuthGate.tsx', import.meta.url), 'utf8');
  assert.match(source, /getAuthCapabilities/);
  assert.match(source, /auth\/v1\/settings/);
  assert.match(source, /Continuar com Google/);
  assert.match(source, /Acesso administrativo de contingência/);
  assert.match(source, /signInWithPasskey/);
  assert.match(source, /registerPasskey/);
  assert.doesNotMatch(source, /auth\.signUp\s*\(/);
  assert.doesNotMatch(source, /handleOAuth\('apple'\)/);
  assert.doesNotMatch(source, /Solicitar cadastro/);
});

test('auth gate always bypasses cache when reading live provider settings', async () => {
  const source = await readFile(new URL('../components/AuthGate.tsx', import.meta.url), 'utf8');
  assert.match(source, /cache\s*:\s*['"]no-store['"]/);
  assert.match(source, /Date\.now\(\)/);
});

test('production Pages adapter supports the three-login contract', async () => {
  const source = await readFile(new URL('../public/auth-gate-live.js', import.meta.url), 'utf8');
  assert.match(source, /auth\/v1\/settings\?ts=/);
  assert.match(source, /cache\s*:\s*['"]no-store['"]/);
  assert.match(source, /experimental\s*:\s*\{\s*passkey\s*:\s*true\s*\}/s);
  assert.match(source, /passkeys_enabled/);
  assert.match(source, /signInWithPasskey/);
  assert.match(source, /registerPasskey/);
  assert.match(source, /passkey\.list/);
  assert.match(source, /signInWithOAuth/);
  assert.match(source, /provider\s*:\s*['"]google['"]/);
  assert.match(source, /signInWithPassword/);
  assert.match(source, /profiles/);
  assert.match(source, /pending/);
  assert.match(source, /approved/);
  assert.match(source, /rejected/);
  assert.match(source, /suspended/);
  assert.match(source, /postgres_changes/);
  assert.match(source, /https:\/\/armidiasintegradas\.github\.io\/planes\//);
  assert.doesNotMatch(source, /\.signUp\s*\(/);
  assert.doesNotMatch(source, /provider\s*:\s*['"]apple['"]/);
});

test('live publisher tracks main and patches gh-pages idempotently', async () => {
  const source = await readFile(new URL('../.github/workflows/publish-live-auth.yml', import.meta.url), 'utf8');
  assert.match(source, /contents\s*:\s*write/);
  assert.match(source, /branches:\s*\n\s*- main/);
  assert.match(source, /ref:\s*main/);
  assert.doesNotMatch(source, /feat\/planes-iam-real/);
  assert.match(source, /ref:\s*gh-pages/);
  assert.match(source, /public\/auth-gate-live\.js/);
  assert.match(source, /PLANES_AUTH_GATE_START/);
  assert.match(source, /PLANES_AUTH_GATE_END/);
  assert.match(source, /index\.html/);
  assert.match(source, /auth-gate-live\.js/);
  assert.match(source, /git push/);
});

test('account security page supports passkey enrollment and management', async () => {
  const source = await readFile(new URL('../app/account/security/page.tsx', import.meta.url), 'utf8');
  assert.match(source, /registerPasskey/);
  assert.match(source, /passkey\.list/);
  assert.match(source, /passkey\.delete/);
});

test('transactional email worker is Planes-branded, retryable and secret-safe', async () => {
  const source = await readFile(new URL('../supabase/functions/planes-email-worker/index.ts', import.meta.url), 'utf8');
  assert.match(source, /Deno\.env\.get\(['"]RESEND_API_KEY['"]\)/);
  assert.match(source, /Deno\.env\.get\(['"]PLANES_EMAIL_FROM['"]\)/);
  assert.match(source, /api\.resend\.com\/emails/);
  assert.match(source, /private_email_claim_batch/);
  assert.match(source, /private_email_mark_sent/);
  assert.match(source, /private_email_mark_failed/);
  assert.match(source, /https:\/\/armidiasintegradas\.github\.io\/planes\/brand\/planes-logo\.png/);
  assert.match(source, /access_request_received/);
  assert.match(source, /admin_access_request/);
  assert.match(source, /access_approved/);
  assert.match(source, /access_rejected/);
  assert.match(source, /access_suspended/);
  assert.match(source, /email_not_configured/);
  assert.doesNotMatch(source, /re_[A-Za-z0-9_-]{12,}/);
});

test('pending users can only kick email intents associated with their own lifecycle', async () => {
  const workerSource = await readFile(new URL('../supabase/functions/planes-email-worker/index.ts', import.meta.url), 'utf8');
  const reactGate = await readFile(new URL('../components/AuthGate.tsx', import.meta.url), 'utf8');
  const liveGate = await readFile(new URL('../public/auth-gate-live.js', import.meta.url), 'utf8');
  assert.match(workerSource, /private_email_claim_for_user/);
  assert.match(reactGate, /functions\.invoke\(['"]planes-email-worker['"]/);
  assert.match(liveGate, /functions\.invoke\(['"]planes-email-worker['"]/);
});

test('admin review backend kicks email delivery after IAM decision without coupling success', async () => {
  const source = await readFile(new URL('../supabase/functions/admin-review-access/index.ts', import.meta.url), 'utf8');
  assert.match(source, /admin_review_access_request/);
  assert.match(source, /functions\/v1\/planes-email-worker/);
  assert.match(source, /email kick/i);
  assert.match(source, /return Response\.json\(\{ ok: true/);
});
