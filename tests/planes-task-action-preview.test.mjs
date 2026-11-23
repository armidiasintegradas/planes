import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../public/planes-task-action-preview.js',import.meta.url),'utf8');
const actionId='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const projectId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
function setup({staging=true}={}){
  class Element{
    constructor(type){this.type=type;this.children=[];this.events={};this.value='';this.textContent='';this.disabled=false;this.style={};}
    append(...items){this.children.push(...items);}
    appendChild(child){this.children.push(child);}
    setAttribute(){}
    addEventListener(name,fn){this.events[name]=fn;}
  }
  const calls=[];
  const client={supabaseUrl:staging?'https://aaaaaaaaaaaaaaaaaaaa.supabase.co':'https://xfgcbxppsbwmxwsuajou.supabase.co',
    auth:{getSession:async()=>({data:{session:{access_token:'fake-jwt'}}})},
    rpc:async(name,payload)=>{
      calls.push({name,payload});
      if(name==='prepare_planes_create_task')return {data:{state:'prepared',action_id:actionId,summary:{
        title:payload.p_title,responsible:payload.p_responsible,deadline_text:payload.p_deadline_text
      }},error:null};
      return {data:payload.p_confirm?{state:'completed',task_id:actionId}:{state:'cancelled'},error:null};
    }};
  const root=new Element('section');
  const window={planesUniversalPreview:{root},
    PLANES_UNIVERSAL_PREVIEW:{enabled:true,supabaseUrl:'https://aaaaaaaaaaaaaaaaaaaa.supabase.co',supabaseProjectRef:'aaaaaaaaaaaaaaaaaaaa'},
    PLANES_UNIVERSAL_STAGING_CLIENT:client};
  vm.runInNewContext(source,{window,document:{createElement:type=>new Element(type)},console});
  return {window,root,calls};
}
test('isolated staging prepares without writes, then confirms explicitly',async()=>{
  const h=setup();
  const section=h.window.planesStagingTaskAction.section;
  const inputs=section.children.filter(n=>n.type==='input');
  inputs[0].value=projectId;inputs[1].value='Verificar concreto';
  await h.window.planesStagingTaskAction.prepare();
  assert.equal(h.calls.length,1);
  assert.equal(h.calls[0].name,'prepare_planes_create_task');
  assert.equal(section.children.find(x=>x.type==='strong').textContent,'Criar tarefa (duas etapas)');
  await h.window.planesStagingTaskAction.confirm();
  assert.equal(h.calls.length,2);
  assert.equal(h.calls[1].name,'confirm_planes_create_task');
  assert.equal(h.calls[1].payload.p_confirm,true);
  assert.match(section.children.find(x=>x.type==='div').textContent,/Tarefa registrada/);
});
test('cancel sends explicit false instead of inserting a task',async()=>{
  const h=setup();
  const inputs=h.window.planesStagingTaskAction.section.children.filter(n=>n.type==='input');
  inputs[0].value=projectId; inputs[1].value='Teste cancelamento';
  await h.window.planesStagingTaskAction.prepare();
  await h.window.planesStagingTaskAction.cancel();
  assert.equal(h.calls.length,2);
  assert.equal(h.calls[1].payload.p_confirm,false);
});
test('invalid payload does not reach RPC',async()=>{
  const h=setup();
  const inputs=h.window.planesStagingTaskAction.section.children.filter(n=>n.type==='input');
  inputs[0].value='not-uuid';inputs[1].value='ok';
  await h.window.planesStagingTaskAction.prepare();
  assert.equal(h.calls.length,0);
});
test('refuses access to production client',()=>{
  const h=setup({staging:false});
  assert.equal(h.window.planesStagingTaskAction,undefined);
  assert.equal(h.root.children.length,0);
});

test('chat request may prefill but never prepare or save task automatically',()=>{
  const h=setup();
  const ok=h.window.planesStagingTaskAction.suggestInstruction('Adicione uma tarefa para verificar o acabamento');
  assert.equal(ok,true);
  const inputs=h.window.planesStagingTaskAction.section.children.filter(x=>x.type==='input');
  assert.equal(inputs[1].value,'verificar o acabamento');
  assert.equal(h.calls.length,0);
});
