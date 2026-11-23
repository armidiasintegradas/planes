import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';

const base = process.env.PLANES_ISOLATED_API || 'http://127.0.0.1:3333';
const secret = process.env.PLANES_ISOLATED_JWT_SECRET || 'planes-ci-jwt-secret-not-for-any-real-environment-2026';
function sign(sub) {
  const json = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const unsigned = [
    json({ alg: 'HS256', typ: 'JWT' }),
    json({ role: 'authenticated', sub, iat: now, exp: now + 300 }),
  ].join('.');
  const signature = createHmac('sha256', secret).update(unsigned).digest('base64url');
  return unsigned + '.' + signature;
}
async function request(path, user, init = {}) {
  const headers = {
    ...(user ? { Authorization: 'Bearer ' + sign(user) } : {}),
    ...init.headers,
  };
  const res = await fetch(base + path, { ...init, headers });
  const text = await res.text();
  let payload = null;
  try { payload = JSON.parse(text); } catch { payload = text; }
  return { status: res.status, payload };
}
function ids(result) {
  assert.equal(result.status, 200, JSON.stringify(result));
  assert.ok(Array.isArray(result.payload), JSON.stringify(result));
  return result.payload.map(x => x.code);
}

const roles = {
  admin: '11111111-1111-4111-8111-111111111111',
  engineering: '22222222-2222-4222-8222-222222222222',
  field: '33333333-3333-4333-8333-333333333333',
  financial: '44444444-4444-4444-8444-444444444444',
  client: '55555555-5555-4555-8555-555555555555',
  suspended: '66666666-6666-4666-8666-666666666666',
  pending: '77777777-7777-4777-8777-777777777777',
  manager: '88888888-8888-4888-8888-888888888888',
};

for (const role of ['engineering', 'field', 'financial', 'client', 'manager']) {
  assert.deepEqual(ids(await request('/projects?select=code&order=code.asc', roles[role])), ['obra_a']);
  console.log('PASS JWT/PostgREST: ' + role + ' is scoped to A');
}
for (const role of ['pending', 'suspended']) {
  assert.deepEqual(ids(await request('/projects?select=code', roles[role])), []);
  console.log('PASS JWT/PostgREST: ' + role + ' sees zero projects');
}
assert.deepEqual(ids(await request('/projects?select=code&order=code.asc', roles.admin)), ['obra_a', 'obra_b']);
console.log('PASS JWT/PostgREST: admin sees A and B');

for (const [name, user] of Object.entries(roles)) {
  const result = await request('/project_metrics?select=project_id,physical_progress', user);
  assert.equal(result.status, 200, name + ': ' + JSON.stringify(result));
  assert.equal(result.payload.length, name === 'admin' ? 2 :
    name === 'pending' || name === 'suspended' ? 0 : 1);
  if (result.payload.length === 1) assert.equal(result.payload[0].physical_progress, 0);
  console.log('PASS JWT/PostgREST: ' + name + ' metric visibility');
}

const denied = await request('/projects?select=code');
assert.ok([401, 403].includes(denied.status), JSON.stringify(denied));
console.log('PASS JWT/PostgREST: anonymous request denied');

const altered = await fetch(base + '/projects?select=code', {
  headers: { Authorization: 'Bearer ' + sign(roles.client).slice(0, -2) + 'AA' },
});
assert.ok([401, 403].includes(altered.status), 'Invalid JWT accepted: ' + altered.status);
console.log('PASS JWT/PostgREST: forged signature denied');

const patchOptions = {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
  body: JSON.stringify({ pac_score: 99 }),
};
const deniedPatch = await request(
  '/project_metrics?project_id=eq.aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa&select=pac_score',
  roles.field, patchOptions
);
assert.ok([200, 204].includes(deniedPatch.status), JSON.stringify(deniedPatch));
assert.ok(deniedPatch.status === 204 || deniedPatch.payload.length === 0, JSON.stringify(deniedPatch));
console.log('PASS JWT/PostgREST: field metrics PATCH is blocked');

const allowedPatch = await request(
  '/project_metrics?project_id=eq.aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa&select=pac_score',
  roles.engineering,
  { ...patchOptions, body: JSON.stringify({ pac_score: 81 }) }
);
assert.equal(allowedPatch.status, 200, JSON.stringify(allowedPatch));
assert.equal(allowedPatch.payload.length, 1);
assert.equal(allowedPatch.payload[0].pac_score, 81);
console.log('PASS JWT/PostgREST: engineer PATCH A is authorized');

const wrongProject = await request(
  '/project_metrics?project_id=eq.bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb&select=pac_score',
  roles.engineering,
  { ...patchOptions, body: JSON.stringify({ pac_score: 12 }) }
);
assert.ok([200, 204].includes(wrongProject.status), JSON.stringify(wrongProject));
assert.ok(wrongProject.status === 204 || wrongProject.payload.length === 0);
console.log('PASS JWT/PostgREST: engineer PATCH B is denied');
console.log('ALL ISOLATED JWT/POSTGREST TESTS PASSED (synthetic profiles & projects).');
