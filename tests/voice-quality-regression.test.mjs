import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const session = await readFile('supabase/functions/planes-voice-session/index.ts', 'utf8');
const tts = await readFile('supabase/functions/planes-voice-tts/index.ts', 'utf8');

test('Realtime accepts microphone input and replies with text only', () => {
  assert.match(session, /output_modalities:\s*\["text"\]/);
  assert.match(session, /transcription:\s*\{ model: "gpt-4o-mini-transcribe", language: "pt" \}/);
  assert.match(session, /type: "semantic_vad"/);
  assert.match(session, /create_response: true/);
  assert.doesNotMatch(session, /output_modalities:\s*\["audio"\]/);
  assert.doesNotMatch(session, /output:\s*\{\s*voice\s*\}/);
});

test('Brita and Castanha are text-only personas', () => {
  assert.match(session, /persona === "brita" \? "Brita" : "Castanha"/);
  assert.match(session, /persona textual oficial/);
  assert.match(session, /Responda exclusivamente por texto/);
});

test('Existing permissions and explicit mutation confirmations are preserved', () => {
  assert.match(session, /voiceCapabilities = serverPolicies\[effectiveRole\]/);
  assert.match(session, /prepare_\*/);
  assert.match(session, /Somente após confirmação explícita use confirm_pending_action/);
  assert.match(session, /Nunca diga que uma alteração foi concluída antes do retorno da ferramenta/);
  assert.match(session, /tools: planesTools/);
});

test('Legacy assistant speech synthesis endpoint fails closed', () => {
  assert.match(tts, /assistant_audio_disabled/);
  assert.match(tts, /status: 410/);
  assert.doesNotMatch(tts, /api\.openai\.com\/v1\/audio\/speech/);
  assert.doesNotMatch(tts, /audio\/wav/);
});

test('Existing Planes Intelligence chat has silent dictation and audio fail-closed guards', async () => {
  const html = await readFile('index.html', 'utf8');
  assert.match(html, /<!DOCTYPE html>/i);
  assert.match(html, /id="planes-v2-mic"/);
  assert.match(html, /id="planes-v2-input"/);
  assert.match(html, /Planes Intelligence candidate: text-only dictation/);
  assert.match(html, /stopImmediatePropagation/);

  for (const name of ['startRealtimeVoiceAssistant', 'speakText', 'startVoiceAssistant', 'toggleVoiceAssistant']) {
    const match = html.match(new RegExp('(?:async )?function ' + name + '\\([^)]*\\) \\{'));
    assert.ok(match, name + ' must be present');
    const firstLines = html.slice(match.index, match.index + 650);
    assert.match(firstLines, /return(?: (?:false|true))?;/, name + ' should stop before legacy audio code');
  }
});
