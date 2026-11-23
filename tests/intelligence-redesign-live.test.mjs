import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const js=readFileSync(new URL('../intelligence-redesign-live.js',import.meta.url),'utf8');
const auth=readFileSync(new URL('../auth-gate-live.js',import.meta.url),'utf8');
const order=readFileSync(new URL('../intelligence-panel-order-live.js',import.meta.url),'utf8');

test('new UI script parses as JavaScript and is loaded by the authenticated app',()=>{
  new vm.Script(js);
  assert.match(auth,/intelligence-redesign-live\.js\?v=20261123-1/);
  assert.match(auth,/intelligence-panel-order-live\.js\?v=20261123-1/);
});
test('live UI preserves authoritative chat and is restricted to Intelligence module',()=>{
  assert.match(js,/\.planes-ai-redesign \.planes-ai-chat/);
  assert.match(js,/\.planes-ai-redesign \.planes-ai-hero/);
  assert.match(js,/\.planes-ai-redesign \.planes-ai-support-grid/);
  assert.match(js,/render.*legacy|legacy.*render|presentation layer/i);
  assert.doesNotMatch(js,/\b(?:fetch|supabase|localStorage|sessionStorage|innerHTML|replaceWith)\s*\(/);
  assert.match(order,/replaceChild\(chat,memory\)/);
});
test('redesign styles have responsive and accessible fallbacks',()=>{
  assert.match(js,/@media \(max-width:767px\)/);
  assert.match(js,/@media \(prefers-reduced-motion:reduce\)/);
  assert.match(js,/data-intelligence-input="true"/);
  assert.match(js,/CENTRAL DE CONVERSA/);
});
