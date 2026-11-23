import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import vm from 'node:vm';

const typescript = await readFile(new URL('../supabase/functions/planes-intelligence-text/index.ts', import.meta.url), 'utf8');
const transpiled = ts.transpileModule(typescript, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  reportDiagnostics: true,
});
const critical = (transpiled.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error);
assert.deepEqual(critical.map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n')), []);

const runnable = transpiled.outputText.replace(
  /import \{ createClient \} from ["']npm:@supabase\/supabase-js@[^"']+["'];?\s*/,
  'const createClient = __createClient;\n'
);
assert.doesNotMatch(runnable, /^import\s/m, 'Mock harness must replace external SDK import');

function harness({
  token = 'test-token',
  role = 'engenharia',
  approved = true,
  accessible = true,
  providerStatus = 200,
  origin = 'https://armidiasintegradas.github.io',
  supplies = [{ name: 'Aço', supplier: 'Fornecedor de teste', status: 'Programado' }],
} = {}) {
  let handler;
  const queried = [];
  const calls = [];
  const errors = [];
  const rows = {
    profiles: { id: 'demo-user', role, status: approved ? 'approved' : 'pending' },
    projects: accessible ? { id: 'demo-project', code: 'obra_demo', name: 'Obra demonstrativa', status: 'Ativa' } : null,
    project_metrics: [{ physical_progress: 0, target_progress: 10, pac_score: 80, financial_spent_m: 3, workers_count: 0 }],
    project_supplies: supplies,
    project_validations: [{ item: 'Laje', status: 'Pendente', front: 'F1' }],
    project_tasks: [{ title: 'Verificar obra', done: false }],
  };

  const createClient = () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'demo-user' } }, error: null }) },
    from(table) {
      queried.push(table);
      const q = {
        select(cols) { queried.push([table, cols]); return q; },
        eq(key, val) { queried.push([table, key, val]); return q; },
        order() { return q; },
        limit() { return Promise.resolve({ data: rows[table], error: null }); },
        single() {
          return Promise.resolve(rows[table] ? { data: rows[table], error: null } : { data: null, error: { code: 'PGRST116' } });
        },
      };
      return q;
    },
  });

  const ctx = {
    __createClient: createClient,
    Deno: {
      env: { get: key => ({ SUPABASE_URL: 'https://demo.supabase.co', SUPABASE_ANON_KEY: 'public-key', OPENAI_API_KEY: 'test-secret' })[key] },
      serve(fn) { handler = fn; },
    },
    Response, Headers, AbortController, setTimeout, clearTimeout, Date,
    console: { warn(...args) { errors.push(args); } },
    fetch: async (url, options) => {
      calls.push({ url, options, body: JSON.parse(options.body) });
      if (providerStatus !== 200) return { ok: false, status: providerStatus };
      return { ok: true, json: async () => ({ output: [{ content: [{ type: 'output_text', text: 'Análise baseada na obra autorizada.' }] }] }) };
    },
  };
  vm.runInNewContext(runnable, ctx, { timeout: 1500 });

  return {
    queried, calls, errors,
    async post(payload = { message: 'Qual o estado da obra?', project_code: 'obra_demo', persona: 'brita' }, auth = token) {
      const headers = new Headers({ Origin: origin, ...(auth ? { Authorization: 'Bearer ' + auth } : {}) });
      const response = await handler({ method: 'POST', headers, json: async () => payload });
      return { status: response.status, body: JSON.parse(await response.text()) };
    },
  };
}

test('mock Edge Function: denies missing token before reading project or invoking model', async () => {
  const h = harness();
  const r = await h.post(undefined, '');
  assert.equal(r.status, 401);
  assert.equal(r.body.error, 'authentication_required');
  assert.equal(h.calls.length, 0);
  assert.equal(h.queried.length, 0);
});

test('mock Edge Function: denies unapproved users without invoking model', async () => {
  const h = harness({ approved: false });
  const r = await h.post();
  assert.equal(r.status, 403);
  assert.equal(r.body.error, 'access_not_approved');
  assert.equal(h.calls.length, 0);
  assert.equal(h.queried.includes('projects'), false);
});

test('mock Edge Function: denies an inaccessible project without reading its data', async () => {
  const h = harness({ accessible: false });
  const r = await h.post();
  assert.equal(r.status, 403);
  assert.equal(r.body.error, 'project_not_accessible');
  assert.equal(h.calls.length, 0);
  assert.equal(h.queried.includes('project_metrics'), false);
});

test('mock Edge Function: successful scoped response uses text only and store:false', async () => {
  const h = harness();
  const r = await h.post();
  assert.equal(r.status, 200);
  assert.equal(r.body.persona, 'Brita');
  assert.equal(r.body.project_code, 'obra_demo');
  assert.equal(r.body.answer, 'Análise baseada na obra autorizada.');
  assert.equal(r.body.source, 'supabase_rls');
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].body.store, false);
  assert.deepEqual(Object.keys(h.calls[0].body).sort(), ['input', 'instructions', 'max_output_tokens', 'model', 'store']);
  const reference = h.calls[0].body.input[0].content;
  assert.match(reference, /"physical_progress":0/);
  assert.match(reference, /"workers_count":0/);
  assert.ok(h.queried.some(x => Array.isArray(x) && x[1] === 'project_id' && x[2] === 'demo-project'));
});

test('mock Edge Function: client role cannot expose supplier, tasks, PAC or validation details', async () => {
  const h = harness({ role: 'cliente' });
  const r = await h.post();
  assert.equal(r.status, 200);
  const reference = h.calls[0].body.input[0].content;
  assert.doesNotMatch(reference, /Fornecedor de teste|Laje|Verificar obra|"pac_score"|financial_spent_m/);
  assert.match(reference, /"physical_progress":0/);
  assert.equal(h.queried.includes('project_supplies'), false);
  assert.equal(h.queried.includes('project_tasks'), false);
});

test('mock Edge Function: upstream errors fail closed, never invent answers', async () => {
  const h = harness({ providerStatus: 503 });
  const r = await h.post();
  assert.equal(r.status, 503);
  assert.equal(r.body.error, 'intelligence_provider_unavailable');
});
