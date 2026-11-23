import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const server = await readFile(new URL('../supabase/functions/planes-intelligence-text/index.ts', import.meta.url), 'utf8');
const client = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('Intelligence text endpoint verifies JWT, approved profile and project RLS', () => {
  assert.match(server, /auth\.getUser\(\)/);
  assert.match(server, /profile\.status !== "approved"/);
  assert.match(server, /\.from\("projects"\)[\s\S]*?\.eq\("code", projectCode\)\.single\(\)/);
  assert.match(server, /global: \{ headers: \{ Authorization: tokenHeader \} \}/);
  assert.doesNotMatch(server, /SUPABASE_SERVICE_ROLE_KEY|service_role/);
  assert.match(server, /project_not_accessible/);
});

test('Intelligence text endpoint has no write tools or output audio', () => {
  for (const pattern of [/\.insert\(/, /\.update\(/, /\.delete\(/, /\.upsert\(/, /speechSynthesis/, /audio\/speech/, /output_modalities:\s*\["audio"\]/]) {
    assert.doesNotMatch(server, pattern);
  }
  assert.match(server, /store: false/);
  assert.match(server, /max_output_tokens: 750/);
  assert.match(server, /"https:\/\/api\.openai\.com\/v1\/responses"/);
  assert.match(server, /No model tools, no writes, no service-role key/);
});

test('Intelligence endpoint limits data by role and bounds user data', () => {
  assert.match(server, /isClient = role === "cliente"/);
  assert.match(server, /isFinancial = role === "financeiro"/);
  assert.match(server, /partial_lists_capped_at: 25/);
  assert.match(server, /\.limit\(25\)/);
  assert.match(server, /question = compactText\(request\.message, 2000\)/);
  assert.match(server, /allowedOrigins\.has\(origin\)/);
  assert.match(server, /project_data_unavailable/);
});

test('Chat uses the new endpoint only by explicit feature flag and never hides failures', () => {
  assert.match(client, /intelligenceTextApiEnabled === true/);
  assert.match(client, /\/functions\/v1\/planes-intelligence-text/);
  assert.match(client, /session\.access_token/);
  assert.match(client, /response\?\.project_code !== projectCode/);
  assert.match(client, /Não vou apresentar uma análise alternativa/);
  assert.match(client, /getAssistantPersona\(\) \|\| 'brita'/);
});
