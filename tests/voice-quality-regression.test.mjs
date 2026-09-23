import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Brita and Castanha use distinct natural Realtime voices', async () => {
  const src = await readFile('supabase/functions/planes-voice-session/index.ts', 'utf8');
  assert.match(src, /model: "gpt-realtime-1\.5"/);
  assert.match(src, /persona === "brita" \? "marin" : "cedar"/);
  assert.match(src, /cadência humana/);
  assert.match(src, /micro-pausas naturais/);
  assert.match(src, /Se o usuário interromper, pare imediatamente e escute/);
});

test('high quality fallback uses distinct OpenAI TTS voices', async () => {
  const src = await readFile('supabase/functions/planes-voice-tts/index.ts', 'utf8');
  assert.match(src, /gpt-4o-mini-tts/);
  assert.match(src, /persona === "brita" \? "marin" : "cedar"/);
  assert.match(src, /cadência humana/);
  assert.match(src, /fala espontânea/);
  assert.match(src, /response_format: "wav"/);
});

test('browser speech synthesis is not used for assistant output', async () => {
  const html = await readFile('index.html', 'utf8');
  const start = html.indexOf('async function speakText(text)');
  const end = html.indexOf('function stopSpeaking()', start);
  assert.ok(start >= 0 && end > start, 'speakText block must exist');
  const block = html.slice(start, end);
  assert.match(block, /planes-voice-tts/);
  assert.doesNotMatch(block, /SpeechSynthesisUtterance/);
  assert.doesNotMatch(block, /speechSynthesis\.speak/);
});


test('Realtime UI confirmations use conversation item events', async () => {
  const html = await readFile('index.html', 'utf8');
  const start = html.indexOf('async function confirmPendingVoiceMutationFromUI');
  const end = html.indexOf('async function executePendingRealtimeVoiceMutation', start);
  assert.ok(start >= 0 && end > start, 'UI confirmation block must exist');
  const block = html.slice(start, end);
  assert.match(block, /type: 'conversation\.item\.create'/);
  assert.match(block, /type: 'response\.create'/);
  assert.doesNotMatch(block, /type: 'response\.item\.create'/);
});
