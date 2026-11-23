import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Schema-only reference generated read-only from Supabase production.
// This is NOT a substitute for authentic migration history, RLS tests or a deployed test environment.
const schema = await readFile(new URL('../types/supabase-production-baseline.ts', import.meta.url), 'utf8');
const edge = await readFile(new URL('../supabase/functions/planes-intelligence-text/index.ts', import.meta.url), 'utf8');
function rowFor(table) {
  const match = schema.match(new RegExp('\\n      ' + table + ': \\{\\s*Row: \\{([\\s\\S]*?)\\n        \\}\\s*Insert:'));
  assert.ok(match, 'Missing production table: ' + table);
  return match[1];
}
function expectColumns(table, columns) {
  const row = rowFor(table);
  for (const col of columns) assert.match(row, new RegExp('\\n          ' + col + ': '), table + '.' + col);
}
test('baseline is schema-only and retains deployed enum values', () => {
  assert.match(schema, /GENERATED REFERENCE: schema types from connected Planes OS production Supabase/);
  assert.match(schema, /planes_user_role:/);
  for (const role of ['super_admin', 'admin', 'gestor', 'engenharia', 'campo', 'financeiro', 'cliente']) {
    assert.match(schema, new RegExp('"' + role + '"'));
  }
  assert.doesNotMatch(schema, /\n      roles: \{/);
});
test('all operational tables queried by Intelligence exist in the deployed schema', () => {
  expectColumns('profiles', ['id', 'role', 'status']);
  expectColumns('projects', ['id', 'code', 'name', 'location', 'status', 'deadline_text']);
  expectColumns('project_metrics', ['project_id', 'physical_progress', 'target_progress', 'pac_score', 'financial_spent_m', 'workers_count']);
  expectColumns('project_supplies', ['project_id', 'name', 'supplier', 'quantity_text', 'delivery_text', 'sector', 'status']);
  expectColumns('project_validations', ['project_id', 'item', 'front', 'status', 'quantity_text', 'recorded_at_text']);
  expectColumns('project_tasks', ['project_id', 'title', 'responsible', 'deadline_text', 'done']);
});
test('Edge Function remains fail-closed and scoped by active authenticated project', () => {
  assert.match(edge, /\.eq\("code", projectCode\)\.single\(\)/);
  assert.match(edge, /\.eq\("id", identity\.user\.id\)\.single\(\)/);
  assert.match(edge, /\.eq\("project_id", project\.id\)/);
  assert.match(edge, /project_not_accessible/);
  assert.match(edge, /project_data_unavailable/);
  assert.match(edge, /safeMetrics/);
  assert.match(edge, /safeSupplies/);
});
