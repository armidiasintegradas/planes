import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Brita and Castanha use distinct natural GPT-Live Brazilian voices', async () => {
  const src = await readFile('supabase/functions/planes-voice-session/index.ts', 'utf8');
  assert.match(src, /model: "gpt-live-1"/);
  assert.match(src, /persona === "brita" \? "bossa" : "tempo"/);
  assert.match(src, /model: "gpt-5\.6-terra"/);
  assert.match(src, /timbre inequivocamente feminino/);
  assert.match(src, /timbre inequivocamente masculino/);
  assert.match(src, /pausas, ritmo e entonação naturais/);
  assert.match(src, /Se o usuário interromper, pare e escute imediatamente/);
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
