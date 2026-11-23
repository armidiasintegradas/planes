import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const url = process.env.PLANES_E2E_URL || 'http://127.0.0.1:4184/';
const port = 9328;
const chrome = spawn('google-chrome', [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=' + port,
  '--user-data-dir=/tmp/planes-intelligence-e2e-' + process.pid, 'about:blank'
], { stdio: ['ignore', 'ignore', 'inherit'] });

async function connect() {
  for (let n = 0; n < 100; n++) {
    try {
      const pages = await (await fetch('http://127.0.0.1:' + port + '/json')).json();
      const endpoint = pages.find(p => p.type === 'page')?.webSocketDebuggerUrl;
      if (endpoint) {
        const socket = new WebSocket(endpoint);
        await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
        return socket;
      }
    } catch {}
    await delay(200);
  }
  throw new Error('Chrome debugging interface unavailable');
}

let socket;
let next = 0;
const pending = new Map();
function cdp(method, params = {}) {
  const id = ++next;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}
async function evaluate(expression) {
  const response = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (response.exceptionDetails) throw Error(JSON.stringify(response.exceptionDetails));
  return response.result?.value;
}

try {
  socket = await connect();
  socket.onmessage = (event) => {
    const item = JSON.parse(event.data);
    if (!item.id) return;
    const p = pending.get(item.id);
    if (!p) return;
    pending.delete(item.id);
    if (item.error) p.reject(Error(JSON.stringify(item.error)));
    else p.resolve(item.result);
  };

  await cdp('Page.enable');
  await cdp('Runtime.enable');
  await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await cdp('Page.navigate', { url });
  await delay(4500);
  const result = await evaluate(`(async () => {
    if (typeof window.openPlanesIntelligenceV2 !== 'function') {
      return { ok: false, reason: 'overlay_entry_missing' };
    }
    // This is a deterministic test: no real microphone, no credentials and no API calls.
    let recognition;
    let speechOutput = 0;
    window.SpeechRecognition = class {
      constructor() { recognition = this; }
      start() { this.onstart?.(); }
      stop() { this.onend?.(); }
      abort() { this.onend?.(); }
    };
    window.Audio = class { constructor() { speechOutput++; } };
    window.speechSynthesis = { speak() { speechOutput++; }, cancel() {} };
    window.openPlanesIntelligenceV2();
    const input = document.getElementById('planes-v2-input');
    const mic = document.getElementById('planes-v2-mic');
    if (!input || !mic) return { ok: false, reason: 'composer_missing' };
    input.value = 'Antes:';
    mic.click();
    const started = Boolean(recognition) && mic.getAttribute('aria-pressed') === 'true';
    if (!recognition) return { ok: false, reason: 'recognizer_missing' };
    recognition.onresult({
      resultIndex: 0, results: [
        { 0: { transcript: ' Qual o avanço da obra?' }, isFinal: true }
      ]
    });
    mic.click();
    const stopped = mic.getAttribute('aria-pressed') === 'false';
    const transcript = input.value;
    const review = input.getAttribute('aria-description') || '';
    return {
      ok: started && stopped && transcript === 'Antes: Qual o avanço da obra?' &&
        review.includes('Revise antes de enviar') && speechOutput === 0,
      started, stopped, transcript, review, speechOutput,
      chatVisible: Boolean(document.querySelector('#planes-intelligence-v2-overlay.open'))
    };
  })()`);
  console.log('PLANES_INTELLIGENCE_MIC_E2E=' + JSON.stringify(result));
  if (!result?.ok) process.exitCode = 1;
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  try { socket?.close(); } catch {}
  chrome.kill('SIGTERM');
}
