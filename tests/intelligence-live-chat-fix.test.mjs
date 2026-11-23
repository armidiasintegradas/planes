import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const script=readFileSync(new URL('../intelligence-live-chat-fix.js',import.meta.url),'utf8');
const auth=readFileSync(new URL('../auth-gate-live.js',import.meta.url),'utf8');

function fixture(){
  const old=async()=>'Oi, AR. Leitura integrada do empreendimento: Japaratinga Lounge Resort, PAC 78%.';
  let spoke=0;
  const window={
    askPlanesIntelligence:old,
    speakText:async()=>{spoke++;throw Error('TTS should be muted');},
    stopSpeaking:()=>{},
    setInterval:()=>1,
    clearInterval:()=>{}
  };
  vm.runInNewContext(script,{window,Date,Intl,console});
  return {window,getSpoke:()=>spoke};
}

test('hotfix autoload is included in production Auth runtime without touching login',()=>{
  assert.match(auth,/intelligence-live-chat-fix\.js\?v=20261123-2/);
  assert.match(auth,/void boot\(\)\.catch/);
});

test('greeting returns a greeting, not the static project summary',async()=>{
  const {window}=fixture();
  const answer=await window.askPlanesIntelligence('ola');
  assert.match(answer,/Olá/);
  assert.doesNotMatch(answer,/Japaratinga Lounge Resort|PAC 78%/);
  assert.equal(window.__PLANES_CHAT_PATCH_STATUS__,'active');
});

test('direct time question is precise and independent of project data',async()=>{
  const {window}=fixture();
  const answer=await window.askPlanesIntelligence('que horas sao?');
  assert.match(answer,/horário de Recife/);
  assert.doesNotMatch(answer,/Japaratinga|PAC 78%/);
});

test('unsupported general question fails honestly instead of fabricating project analysis',async()=>{
  const {window}=fixture();
  const answer=await window.askPlanesIntelligence('qual é a capital da França?');
  assert.match(answer,/ainda não está conectada/);
  assert.doesNotMatch(answer,/Japaratinga|PAC 78%/);
});

test('existing engineering questions are not changed by this scoped hotfix',async()=>{
  const {window}=fixture();
  const answer=await window.askPlanesIntelligence('qual o PAC da obra?');
  assert.match(answer,/Japaratinga Lounge Resort/);
});

test('realtime voice output is muted while text remains usable',async()=>{
  const {window,getSpoke}=fixture();
  await window.speakText('Olá');
  assert.equal(getSpoke(),0);
});
