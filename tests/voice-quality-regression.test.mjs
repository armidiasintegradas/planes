import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Brita and Castanha use distinct natural Realtime voices', async () => {
  const src = await readFile('supabase/functions/planes-voice-session/index.ts', 'utf8');
  assert.match(src, /gpt-realtime-1\.5/);
  assert.match(src, /persona === "brita" \? "shimmer" : "echo"/);
  assert.match(src, /voiceSpeed = persona === "brita" \? 1\.02 : 0\.96/);
  assert.match(src, /timbre inequivocamente feminino/);
  assert.match(src, /timbre inequivocamente masculino/);
});

test('high quality fallback uses distinct OpenAI TTS voices', async () => {
  const src = await readFile('supabase/functions/planes-voice-tts/index.ts', 'utf8');
  assert.match(src, /gpt-4o-mini-tts/);
  assert.match(src, /persona === "brita" \? "nova" : "onyx"/);
  assert.match(src, /voice feminina claramente perceptível/);
  assert.match(src, /voice masculina claramente perceptível/);
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
