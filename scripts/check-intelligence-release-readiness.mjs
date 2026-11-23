#!/usr/bin/env node
/**
 * RC-06 release gate. Offline, read-only and intentionally fail-closed.
 * Usage: node scripts/check-intelligence-release-readiness.mjs [evidence.json]
 * Evidence MUST come from a non-production Supabase instance.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const filename = resolve(process.argv[2] || 'docs/intelligence-rc06-evidence.json');
const required = [
  ['supabase_schema_parity', 'Full schema, functions, triggers and RLS recreated in isolated Supabase'],
  ['supabase_auth_real_jwt', 'Real Supabase Auth test users and negative cross-project access'],
  ['edge_function_deployed_staging', 'Text Edge Function deployed in isolated environment only'],
  ['openai_real_call_staging', 'Successful provider call with staging key and spending limits'],
  ['rate_limit_persistent', 'Persistent server-side rate limits and quota enforcement verified'],
  ['provider_privacy_review', 'Approved data-minimization and privacy review'],
  ['microphone_ios_physical', 'Physical iOS microphone, stop and keyboard fallback'],
  ['microphone_android_physical', 'Physical Android microphone, stop and keyboard fallback'],
  ['microphone_desktop_physical', 'Physical desktop microphone, stop and keyboard fallback'],
  ['negative_auth_project_scope', 'Cross-project and unapproved-role access rejected'],
  ['no_audio_output', 'No generated audio on any supported device'],
  ['write_requires_confirmation', 'Persisted writes require explicit approval and correct permissions'],
  ['backup_and_rollback', 'Restore point and tested rollback plan'],
  ['administrator_release_approval', 'Recorded administrative authorization for release']
];
let evidence = {};
if (existsSync(filename)) {
  try { evidence = JSON.parse(readFileSync(filename, 'utf8')); }
  catch (error) { console.error('Invalid evidence JSON:', error.message); process.exit(2); }
}
const failures = [];
if (evidence.environment?.kind !== 'isolated-supabase') failures.push('Environment is not attested as isolated Supabase');
if (!evidence.environment?.project_ref || evidence.environment.project_ref === 'xfgcbxppsbwmxwsuajou') failures.push('Missing isolated project ref or production ref used');
if (!evidence.commit_sha || !/^[a-f0-9]{40}$/.test(evidence.commit_sha)) failures.push('Missing validated commit SHA');
for (const [id, description] of required) {
  const check = evidence.checks?.[id];
  if (check?.status !== 'passed' || !check?.evidence_url || !check?.verified_at || !check?.verified_by) failures.push(id + ': ' + description);
}
console.log('Planes Intelligence RC-06 release gate:', failures.length ? 'NO-GO' : 'READY FOR ADMINISTRATIVE REVIEW');
for (const item of failures) console.log(' -', item);
process.exit(failures.length ? 1 : 0);
