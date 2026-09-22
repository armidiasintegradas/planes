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

  assert.match(html, /planesViewportWasDesktop/);
  assert.match(html, /orientationchange/);
  assert.match(html, /max\(10px,env\(safe-area-inset-bottom\)\)/);
  assert.match(html, /planes-mobile-sheet-overlay/);
  assert.match(html, /planes-intel-v2-shell/);
});

test('production source keeps Supabase-first auth hardening', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(html, /supabase\.auth\.signOut\(\)/);
  assert.match(html, /fetchProfileForAuthUser/);
  assert.match(html, /persistSession:\s*true/);
  assert.match(html, /detectSessionInUrl:\s*true/);
});
