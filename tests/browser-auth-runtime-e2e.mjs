import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const targetUrl = process.env.PLANES_E2E_URL || 'https://armidiasintegradas.github.io/planes/';

const chrome = spawn('google-chrome', [
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu',
  '--remote-debugging-port=9222',
  '--user-data-dir=/tmp/planes-auth-runtime-e2e',
  'about:blank'
], { stdio: ['ignore', 'ignore', 'inherit'] });

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function waitForDebugger() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const pages = await getJson('http://127.0.0.1:9222/json');
      const page = pages.find(p => p.type === 'page');
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {}
    await delay(250);
  }
  throw new Error('Chrome debugger unavailable');
}

function createCdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  const events = [];
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (!msg.id) {
      if (msg.method === 'Runtime.exceptionThrown' || msg.method === 'Runtime.consoleAPICalled') {
        events.push(msg);
      }
      return;
    }
    const waiter = pending.get(msg.id);
    if (!waiter) return;
    pending.delete(msg.id);
    if (msg.error) waiter.reject(new Error(JSON.stringify(msg.error)));
    else waiter.resolve(msg.result);
  };
  const ready = new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  return {
    ready,
    async call(method, params = {}) {
      await ready;
      const callId = ++id;
      ws.send(JSON.stringify({ id: callId, method, params }));
      return new Promise((resolve, reject) => pending.set(callId, { resolve, reject }));
    },
    events,
    close() { ws.close(); }
  };
}

async function main() {
  let cdp;
  try {
    const wsUrl = await waitForDebugger();
    const runtimeExceptions = [];
    const consoleErrors = [];
    cdp = createCdp(wsUrl, (msg) => {
      if (msg.method === 'Runtime.exceptionThrown') {
        const ex = msg.params?.exceptionDetails || {};
        runtimeExceptions.push({
          text: ex.text || null,
          url: ex.url || null,
          lineNumber: ex.lineNumber,
          columnNumber: ex.columnNumber,
          description: ex.exception?.description || ex.exception?.value || null
        });
      }
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params?.type === 'error') {
        consoleErrors.push((msg.params.args || []).map(a => a.value || a.description || '').join(' '));
      }
    });
    await cdp.ready;
    await cdp.call('Page.enable');
    await cdp.call('Runtime.enable');
    await cdp.call('Page.navigate', { url: targetUrl });
    await delay(7000);

    const preflight = await cdp.call('Runtime.evaluate', {
      expression: `({
        readyState: document.readyState,
        authHydratorType: typeof window.applySupabaseAuthPayload,
        supabaseType: typeof window.supabase,
        appPresent: !!document.getElementById('app'),
        appLength: document.getElementById('app')?.innerHTML?.length || 0,
        htmlClass: document.documentElement.className,
        authRootPresent: !!document.getElementById('planes-auth-root')
      })`,
      returnByValue: true
    });
    console.log('PLANES_AUTH_PREFLIGHT=' + JSON.stringify(preflight?.result?.value || null));

    if (cdp.events.length) {
      console.log('PLANES_AUTH_BROWSER_EVENTS=' + JSON.stringify(cdp.events.slice(-20)));
    }

    const expression = `(async () => {
      const payload = {
        user: {
          id: 'e2e-admin',
          auth_user_id: 'e2e-admin',
          name: 'Teste Admin',
          email: 'e2e@example.com',
          role: 'admin',
          role_id: 'admin',
          level: 'admin',
          status: 'Aprovado',
          avatar: 'TA'
        },
        profile: { id: 'e2e-admin', email: 'e2e@example.com', role: 'admin', status: 'approved' }
      };

      if (typeof window.applySupabaseAuthPayload !== 'function') {
        const scripts = [...document.scripts];
        const mainScript = scripts.find(s => (s.textContent || '').includes('applySupabaseAuthPayload'));
        return {
          ok:false,
          reason:'hydrator_missing',
          readyState: document.readyState,
          appExists: !!document.getElementById('app'),
          appLength: document.getElementById('app')?.innerHTML?.length || 0,
          scriptCount: scripts.length,
          mainScriptPresent: !!mainScript,
          authRootPresent: !!document.getElementById('planes-auth-root'),
          bodyClass: document.body?.className || '',
          htmlClass: document.documentElement?.className || '',
          runtimeExceptions: __RUNTIME_EXCEPTIONS__,
          consoleErrors: __CONSOLE_ERRORS__
        };
      }

      delete window.__PLANES_AUTH_INTERNAL_APPLIED__;
      delete window.__PLANES_AUTH_APPLIED_USER_ID__;
      delete window.__PLANES_AUTH_HYDRATED__;
      window.__PLANES_AUTH_BRIDGE_PAYLOAD__ = payload;

      const applied = window.applySupabaseAuthPayload(payload);
      await new Promise(resolve => setTimeout(resolve, 400));

      const app = document.getElementById('app');
      return {
        ok: applied === true &&
            window.__PLANES_AUTH_HYDRATED__ === true &&
            !!app &&
            app.innerHTML.length > 1000,
        applied,
        hydrated: window.__PLANES_AUTH_HYDRATED__ === true,
        appLength: app?.innerHTML?.length || 0,
        lastError: window.__PLANES_AUTH_LAST_ERROR__ || null
      };
    })()`;

    const enrichedExpression = expression
      .replace('__RUNTIME_EXCEPTIONS__', JSON.stringify(runtimeExceptions))
      .replace('__CONSOLE_ERRORS__', JSON.stringify(consoleErrors));

    const result = await cdp.call('Runtime.evaluate', {
      expression: enrichedExpression,
      awaitPromise: true,
      returnByValue: true
    });
    const value = result?.result?.value;
    console.log('PLANES_AUTH_RUNTIME_E2E=' + JSON.stringify(value));
    if (!value?.ok) process.exitCode = 1;
  } finally {
    try { cdp?.close(); } catch {}
    chrome.kill('SIGTERM');
  }
}

main().catch(error => {
  console.error(error);
  chrome.kill('SIGTERM');
  process.exit(1);
});

// rerun marker: consolidated auth runtime v2
