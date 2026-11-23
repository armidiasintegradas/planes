import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../public/planes-universal-preview.js',import.meta.url),'utf8');
function harness({valid=true,client=true,token='staging-token',success=true}={}){
  const nodes=[];
  class Node {
    constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.style={};this.value='';this.textContent='';this.attributes={};this.events={};this.disabled=false;this.scrollTop=0;this.scrollHeight=0;}
    append(...children){this.children.push(...children);}
    appendChild(child){this.children.push(child);nodes.push(child);return child;}
    setAttribute(k,v){this.attributes[k]=v;}
    addEventListener(name,callback){this.events[name]=callback;}
    focus(){}
  }
  const document={head:new Node('head'),body:new Node('body'),createElement:t=>new Node(t)};
  const calls=[];
  const cfg={enabled:true,supabaseProjectRef:valid?'aaaaaaaaaaaaaaaaaaaa':'xfgcbxppsbwmxwsuajou',
    supabaseUrl:valid?'https://aaaaaaaaaaaaaaaaaaaa.supabase.co':'https://xfgcbxppsbwmxwsuajou.supabase.co',
    publishableKey:'public-test-key'};
  const win={PLANES_UNIVERSAL_PREVIEW:cfg,
    ...(client?{PLANES_UNIVERSAL_STAGING_CLIENT:{supabaseUrl:cfg.supabaseUrl,
      auth:{getSession:async()=>({data:{session:{access_token:token}},error:null})}}}:{})};
  vm.runInNewContext(source,{document,window:win,console,fetch:async(url,options)=>{
    calls.push({url,options});
    return {ok:success,status:success?200:503,json:async()=>success?
      {ok:true,answer:'Resposta exclusiva à pergunta.',sources:[{url:'https://example.org/article',title:'Pesquisa externa'}]}:
      {ok:false,error:'assistant_disabled'}};
  }});
  return {document,win,calls,nodes,find:(t)=>nodes.find(n=>n.tag===t)};
}
test('never activates preview against production Supabase',()=>{
  const h=harness({valid:false});
  assert.equal(h.win.planesUniversalPreview,undefined);
  assert.equal(h.document.body.children.length,0);
});
test('sends exact question to isolated endpoint with staging JWT',async()=>{
  const h=harness();
  const root=h.win.planesUniversalPreview.root;
  const field=root.children.find(x=>x.tag==='textarea');
  field.value='Que horas são?';
  await h.win.planesUniversalPreview.submit();
  assert.equal(h.calls.length,1);
  assert.equal(h.calls[0].url,'https://aaaaaaaaaaaaaaaaaaaa.supabase.co/functions/v1/planes-universal-assistant');
  assert.equal(h.calls[0].options.headers.Authorization,'Bearer staging-token');
  assert.equal(JSON.parse(h.calls[0].options.body).message,'Que horas são?');
  assert.equal(field.value,'');
  const log=root.children.find(x=>x.attributes.role==='log');
  assert.equal(log.children[0].textContent,'Que horas são?');
  assert.equal(log.children[1].textContent,'Resposta exclusiva à pergunta.');
});
test('missing staging session does not call endpoint and preserves question',async()=>{
  const h=harness({client:false});
  const field=h.win.planesUniversalPreview.root.children.find(x=>x.tag==='textarea');
  field.value='Nova tarefa';
  await h.win.planesUniversalPreview.submit();
  assert.equal(h.calls.length,0);
  assert.equal(field.value,'Nova tarefa');
});
test('backend error preserves user question and does not claim success',async()=>{
  const h=harness({success:false});
  const field=h.win.planesUniversalPreview.root.children.find(x=>x.tag==='textarea');
  field.value='Explique a curva S';
  await h.win.planesUniversalPreview.submit();
  assert.equal(field.value,'Explique a curva S');
  const log=h.win.planesUniversalPreview.root.children.find(x=>x.attributes.role==='log');
  assert.match(log.children.at(-1).textContent,/Não foi possível/);
});
