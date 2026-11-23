import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../public/intelligence-dictation-preview.js', import.meta.url), 'utf8');

test('legacy V2 microphone dictates into editable chat, without submission or sound', async () => {
  const listeners = [];
  const mic = { attributes: {}, setAttribute(k, v) { this.attributes[k] = v; }, textContent: '', title: '' };
  const input = { value: 'Resumo:', events: [], setAttribute() {}, dispatchEvent(e) { this.events.push(e.type); }, focus() {} };
  const document = {
    getElementById(id) { return id === 'planes-v2-mic' ? mic : id === 'planes-v2-input' ? input : null; },
    addEventListener(type, callback, capture) { listeners.push({ type, callback, capture }); }
  };
  let recognition;
  class FakeSpeechRecognition {
    constructor() { recognition = this; }
    start() { this.onstart?.(); }
    stop() { this.onend?.(); }
  }
  let stoppedAudio = 0;
  const window = {
    SpeechRecognition: FakeSpeechRecognition,
    speakText: async () => { throw Error('audio output should never be called'); },
    stopSpeaking: () => { stoppedAudio += 1; }
  };
  vm.runInNewContext(source, { document, window, Event: class { constructor(type) { this.type = type; } } });
  assert.equal(listeners.filter(x => x.type === 'click').length, 2);

  let intercepted = 0;
  const click = {
    target: { closest: selector => selector === '#planes-v2-mic' ? mic : null },
    preventDefault() { intercepted++; },
    stopImmediatePropagation() { intercepted++; }
  };
  listeners[0].callback(click);
  assert.equal(recognition.lang, 'pt-BR');
  assert.equal(recognition.continuous, false);
  recognition.onresult({ resultIndex: 0, results: [{ 0: { transcript: ' como está o PAC?' } }] });
  listeners[0].callback(click);
  assert.equal(input.value, 'Resumo: como está o PAC?');
  assert.deepEqual(input.events, ['input']);
  assert.equal(intercepted, 4);
  await window.speakText('mensagem');
  assert.equal(stoppedAudio, 1);
});

test('unsupported browser retains typed input and never starts speech', () => {
  const listeners = [];
  const input = { value: 'texto existente', dispatchEvent() { throw Error('must not mutate'); }, setAttribute() {} };
  const mic = { setAttribute() {}, title: '', textContent: '' };
  const document = {
    getElementById(id) { return id === 'planes-v2-mic' ? mic : id === 'planes-v2-input' ? input : null; },
    addEventListener(type, callback) { listeners.push({ type, callback }); }
  };
  const window = {};
  vm.runInNewContext(source, { document, window, Event: class {} });
  listeners[0].callback({target:{ closest: () => mic }, preventDefault() {}, stopImmediatePropagation() {}});
  assert.equal(input.value, 'texto existente');
  assert.match(mic.title, /indisponível/);
});
