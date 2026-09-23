import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('service worker keeps auth and HTML network-first', async () => {
  const sw = await readFile(new URL('../sw.js', import.meta.url), 'utf8');

  assert.match(sw, /const CACHE_NAME = 'planes-os-v17'/);
  assert.match(sw, /auth-gate-live\.js/);
  assert.doesNotMatch(sw, /auth-runtime-bridge-live\.js/);
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
  assert.match(html, /detectSessionInUrl:\s*false/);
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


test('single-source auth runtime is preserved', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const gate = await readFile(new URL('../public/auth-gate-live.js', import.meta.url), 'utf8');

  assert.match(html, /window\.applySupabaseAuthPayload = function applySupabaseAuthPayload/);
  assert.match(html, /__PLANES_AUTH_INTERNAL_APPLIED__/);
  assert.match(html, /__PLANES_AUTH_APPLIED_USER_ID__/);
  assert.doesNotMatch(html, /auth-runtime-bridge-live\.js/);
  assert.match(html, /externalAuthOwnsSession/);
  assert.match(html, /__PLANES_EXTERNAL_AUTH_OWNER__/);

  assert.match(gate, /flowType:\s*'implicit'/);
  assert.match(gate, /__PLANES_EXTERNAL_AUTH_OWNER__/);
  assert.match(gate, /supabase\.auth\.setSession/);
  assert.match(gate, /hash\.get\('access_token'\)/);
  assert.match(gate, /Authorization: \`Bearer \$\{accessToken\}\`/);
  assert.match(gate, /window\.applySupabaseAuthPayload/);
  assert.doesNotMatch(gate, /planes_pwa_auth_recovery_v1/);
});


test('auth gate avoids duplicate auth CDN and runtime callback handling', async () => {
  const gate = await readFile(new URL('../public/auth-gate-live.js', import.meta.url), 'utf8');
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.doesNotMatch(gate, /esm\.sh\/\@supabase\/supabase-js/);
  assert.match(gate, /window\.supabase\?\.createClient/);
  assert.match(html, /detectSessionInUrl:\s*false/);
});


test('authenticated render repairs stale RBAC state instead of crashing', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(html, /Object\.entries\(defaultRolePermissions\)/);
  assert.match(html, /rolePermissions\.Admin = \[\.\.\.defaultRolePermissions\.Admin\]/);
  assert.match(html, /Array\.isArray\(rolePermissions\?\.\[accessLevel\]\)/);
  assert.match(html, /defaultRolePermissions\['Campo'\]/);
});


test('operational realtime state is initialized before subscriptions', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  const timerDecl = html.indexOf('let operationalRealtimeRefreshTimer = null;');
  const firstSetup = html.indexOf('setupRealtimeSubscriptions();');

  assert.ok(timerDecl >= 0, 'operational realtime timer declaration is missing');
  assert.ok(firstSetup >= 0, 'initial setupRealtimeSubscriptions call is missing');
  assert.ok(
    timerDecl < firstSetup,
    'operational realtime state must be initialized before setupRealtimeSubscriptions runs'
  );
});


test('runtime defers realtime boot and reuses the auth Supabase client', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const gate = await readFile(new URL('../public/auth-gate-live.js', import.meta.url), 'utf8');

  assert.match(gate, /window\.__PLANES_SUPABASE_CLIENT__\s*=\s*supabase/);
  assert.match(html, /Supabase Client compartilhado com o gate de autenticação/);
  assert.doesNotMatch(
    html,
    /\/\/ Inicializa carregamento dos dados e canais\s*fetchAdminIAMData\(\);\s*setupRealtimeSubscriptions\(\);/
  );
});


test('auth flow stays single-owner without PWA auto-logout or external runtime bridge', async () => {
  const gate = await readFile(new URL('../public/auth-gate-live.js', import.meta.url), 'utf8');
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(gate, /flowType:\s*'implicit'/);
  assert.match(gate, /detectSessionInUrl:\s*false/);
  assert.match(gate, /supabase\.auth\.setSession/);
  assert.match(gate, /window\.applySupabaseAuthPayload/);
  assert.doesNotMatch(gate, /planes_pwa_auth_recovery_v1/);
  assert.doesNotMatch(gate, /signOut\(\{\s*scope:\s*'local'\s*\}\)/);

  assert.match(html, /window\.applySupabaseAuthPayload = function applySupabaseAuthPayload/);
  assert.match(html, /__PLANES_AUTH_APPLIED_USER_ID__/);
  assert.doesNotMatch(html, /auth-runtime-bridge-live\.js/);
  assert.doesNotMatch(html, /window\.window\.applySupabaseAuthPayload/);
});


test('operational mutations stay Supabase-first and refresh Intelligence after commit', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(html, /supabaseClient\.from\('project_metrics'\)\.upsert/);
  assert.match(html, /supabaseClient\.from\('project_supplies'\)\.(?:update|insert)/);
  assert.match(html, /supabaseClient\.from\('project_validations'\)\.(?:update|insert)/);
  assert.match(html, /supabaseClient\.from\('project_tasks'\)\.(?:update|insert)/);
  assert.match(html, /refreshIntelligenceOperationalData\(\)/);
  assert.match(html, /executePendingRealtimeVoiceMutation/);
  assert.match(html, /requires_confirmation:\s*true/);
});

test('operational Realtime listens to every shared Intelligence table', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(html, /supabaseClient\.channel\('planes-operational-feed'\)/);
  assert.match(html, /\['project_metrics','project_supplies','project_validations','project_tasks'\]\.forEach/);
  assert.match(html, /'postgres_changes'/);
  assert.match(html, /scheduleOperationalRealtimeRefresh\(\)/);
  assert.match(html, /setOperationalRealtimeStatus\('Ao vivo'\)/);
});

test('voice mutations expire and remain bound to the active project', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(html, /pendingAgeMs > 5 \* 60 \* 1000/);
  assert.match(html, /pending\.projectCode && currentProjectCode && pending\.projectCode !== currentProjectCode/);
  assert.match(html, /stale_pending_action/);
  assert.match(html, /confirm_pending_action/);
});


test('mobile PWA chrome keeps iOS safe areas and overlay stacking stable', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(html, /safe-area-inset-top/);
  assert.match(html, /safe-area-inset-bottom/);
  assert.match(html, /\.planes-mobile-sheet-overlay[\s\S]*z-index:\s*1100/);
  assert.match(html, /\[id\$="-modal"\]\.fixed\.inset-0[\s\S]*z-index:\s*1200/);
  assert.match(html, /#toast[\s\S]*z-index:\s*1300/);
  assert.match(html, /\.planes-intel-v2-overlay[^{]*\{[^}]*z-index:\s*1400/);
  assert.match(html, /height:100dvh/);
});

test('service worker never caches cross-origin traffic and retires old shells', async () => {
  const sw = await readFile(new URL('../sw.js', import.meta.url), 'utf8');

  assert.match(sw, /url\.origin !== self\.location\.origin/);
  assert.match(sw, /event\.respondWith\(fetch\(event\.request\)\)/);
  assert.match(sw, /caches\.keys\(\)/);
  assert.match(sw, /key === CACHE_NAME \? null : caches\.delete\(key\)/);
  assert.match(sw, /self\.clients\.claim\(\)/);
  assert.match(sw, /self\.skipWaiting\(\)/);
});

test('live auth runtime and HTML remain network-first with offline fallback', async () => {
  const sw = await readFile(new URL('../sw.js', import.meta.url), 'utf8');

  assert.match(sw, /isLiveAuthRuntime/);
  assert.match(sw, /fetch\(event\.request, \{ cache: 'no-store' \}\)/);
  assert.match(sw, /caches\.match\('\.\/index\.html'\)/);
  assert.match(sw, /Response\.error\(\)/);
});
