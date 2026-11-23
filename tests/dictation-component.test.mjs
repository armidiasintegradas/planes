import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const src = await readFile(new URL('../components/PlanesDictationButton.tsx', import.meta.url), 'utf8');

test('microphone supports start, stop and automatic pause termination', () => {
  assert.match(src, /recognizer\.current\?\.stop\(\)/);
  assert.match(src, /current\.start\(\)/);
  assert.match(src, /current\.continuous = false/);
  assert.match(src, /current\.onend = /);
});

test('dictation is text only and lets user review before submitting', () => {
  assert.match(src, /onTranscriptRef\.current\(text\)/);
  assert.match(src, /Transcrição adicionada à mensagem\. Revise antes de enviar/);
  assert.doesNotMatch(src, /speechSynthesis|SpeechSynthesisUtterance|new Audio\(/);
  assert.doesNotMatch(src, /\.submit\(/);
});

test('microphone permission and browser fallback are explicit', () => {
  assert.match(src, /webkitSpeechRecognition/);
  assert.match(src, /not-allowed/);
  assert.match(src, /audio-capture/);
  assert.match(src, /role="status"/);
});

test('recognizer releases resources when component is unmounted', () => {
  assert.match(src, /recognizer\.current\?\.abort\(\)/);
  assert.match(src, /recognizer\.current = null/);
});
