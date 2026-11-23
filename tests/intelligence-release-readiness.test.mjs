import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const script = 'scripts/check-intelligence-release-readiness.mjs';
const ids = [
  'supabase_schema_parity', 'supabase_auth_real_jwt',
  'edge_function_deployed_staging', 'openai_real_call_staging',
  'rate_limit_persistent', 'provider_privacy_review',
  'microphone_ios_physical', 'microphone_android_physical',
  'microphone_desktop_physical', 'negative_auth_project_scope',
  'no_audio_output', 'write_requires_confirmation',
  'backup_and_rollback', 'administrator_release_approval'
];
function run(evidence) {
  const dir = mkdtempSync(join(tmpdir(), 'planes-rc06-gate-'));
  const file = join(dir, 'evidence.json');
  try {
    writeFileSync(file, JSON.stringify(evidence));
    return spawnSync(process.execPath, [script, file], { encoding: 'utf8' });
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
const allChecks = Object.fromEntries(ids.map(id => [id, {
  status: 'passed', evidence_url: 'https://github.com/example/example/actions/runs/1',
  verified_at: '2026-11-23T14:00:00Z', verified_by: 'test-only'
}]));
const example = {
  environment: {kind: 'isolated-supabase', project_ref:'staging-fixture-not-real'},
  commit_sha:'a'.repeat(40), checks:allChecks
};

test('NO-GO when attestation is missing', () => {
  const result = spawnSync(process.execPath, [script, '/does/not/exist.json'], { encoding:'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stdout, /NO-GO/);
});
test('NO-GO for production Supabase project ref', () => {
  const result = run({...example,environment:{kind:'isolated-supabase',project_ref:'xfgcbxppsbwmxwsuajou'}});
  assert.equal(result.status,1);
});
test('NO-GO without real integration evidence', () => {
  const checks = {...allChecks};
  delete checks.openai_real_call_staging;
  const result = run({...example,checks});
  assert.equal(result.status,1);
});
test('synthetic schema-only input is recognized by parser, NOT a real go decision', () => {
  const result=run(example);
  assert.equal(result.status,0);
  assert.match(result.stdout,/READY FOR ADMINISTRATIVE REVIEW/);
});
