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


test('semantic VAD keeps natural interruption and streaming response behavior', async () => {
  const src = await readFile('supabase/functions/planes-voice-session/index.ts', 'utf8');
  assert.match(src, /type:\s*"semantic_vad"/);
  assert.match(src, /eagerness:\s*"auto"/);
  assert.match(src, /create_response:\s*true/);
  assert.match(src, /interrupt_response:\s*true/);
  assert.match(src, /output_modalities:\s*\["audio"\]/);
});

test('voice identity stays personalized and operationally grounded', async () => {
  const src = await readFile('supabase/functions/planes-voice-session/index.ts', 'utf8');
  assert.match(src, /Chame \$\{firstName\} pelo primeiro nome apenas quando soar natural/);
  assert.match(src, /Use as ferramentas do Planes para consultar dados atuais; nunca invente números/);
  assert.match(src, /Somente após confirmação explícita use confirm_pending_action/);
});


test('Realtime voice UI exposes every operational state and safe fallback', async () => {
  const html = await readFile('index.html', 'utf8');

  assert.match(html, /idle:\s*'Online'/);
  assert.match(html, /connecting:\s*'Conectando'/);
  assert.match(html, /listening:\s*'Ouvindo'/);
  assert.match(html, /speaking:\s*'Falando'/);
  assert.match(html, /reconnecting:\s*'Reconectando'/);
  assert.match(html, /error:\s*'Voz alternativa'/);
  assert.match(html, /Reconectando a voz neural/);
  assert.match(html, /Ativando voz OpenAI alternativa/);
  assert.match(html, /audio\.playsInline = true/);
});

test('daily persona greeting persists per user and stays interruption-friendly', async () => {
  const html = await readFile('index.html', 'utf8');

  assert.match(html, /assistant_last_daily_greeting_at/);
  assert.match(html, /shouldSendDailyPersonaGreeting/);
  assert.match(html, /markDailyPersonaGreetingUsed/);
  assert.match(html, /Oi, \$\{firstName\}, tudo bem\?/);
  assert.match(html, /output_modalities:\s*\['audio'\]/);
  assert.match(html, /sem soar como leitura/);
});

test('voice fallback keeps high-quality OpenAI audio and never speaks with browser synthesis', async () => {
  const html = await readFile('index.html', 'utf8');
  const start = html.indexOf('async function speakText(text)');
  const end = html.indexOf('function stopSpeaking()', start);
  const block = html.slice(start, end);

  assert.match(block, /planes-voice-tts/);
  assert.match(block, /new Audio\(/);
  assert.match(block, /audio\.playsInline = true/);
  assert.doesNotMatch(block, /SpeechSynthesisUtterance/);
  assert.doesNotMatch(block, /speechSynthesis\.speak/);
});
