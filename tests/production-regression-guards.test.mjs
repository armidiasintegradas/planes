import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('service worker keeps auth and HTML network-first', async () => {
  const sw = await readFile(new URL('../sw.js', import.meta.url), 'utf8');

  assert.match(sw, /const CACHE_NAME = 'planes-os-v12'/);
  assert.match(sw, /auth-gate-live\.js/);
  assert.match(sw, /cache:\s*'no-store'/);
  assert.match(sw, /event\.request\.mode === 'navigate'/);
});

test('production source keeps mobile viewport stability guards', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(html, /planes-mobile-sheet-overlay/);
  assert.match(html, /safe-area-inset-bottom/);
  assert.match(html, /planes-mobile-sheet-panel/);
  assert.match(html, /planes-intel-v2-shell/);
  assert.match(html, /height:100dvh/);
});

test('production source keeps Supabase-first auth hardening', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(html, /supabaseClient\.auth\.signOut\(\)/);
  assert.match(html, /fetchProfileForAuthUser/);
  assert.match(html, /persistSession:\s*true/);
  assert.match(html, /detectSessionInUrl:\s*true/);
});


test('admin review RPC stays behind private hardened implementation', async () => {
  const migration = await readFile(
    new URL('../supabase/migrations/20260922190320_harden_admin_review_rpc_private_impl.sql', import.meta.url),
    'utf8'
  );

  assert.match(migration, /private\.admin_review_access_request_impl/);
  assert.match(migration, /security definer/i);
  assert.match(migration, /create or replace function public\.admin_review_access_request/);
  assert.match(migration, /security invoker/i);
  assert.match(migration, /revoke all on function public\.admin_review_access_request[\s\S]*from public, anon/i);
});


test('voice session requires validated Supabase user and server-side role', async () => {
  const source = await readFile(
    new URL('../supabase/functions/planes-voice-session/index.ts', import.meta.url),
    'utf8'
  );

  assert.match(source, /auth\.getUser\(\)/);
  assert.match(source, /voice_access_not_approved/);
  assert.match(source, /serverPolicies/);
  assert.doesNotMatch(source, /function getJwtSub/);
  assert.doesNotMatch(source, /Preferir autorização persistida no servidor\. O payload do navegador é apenas fallback/);
});
