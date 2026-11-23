import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

const source = await readFile(new URL('../supabase/functions/planes-universal-assistant/index.ts', import.meta.url), 'utf8');
const transpilation = ts.transpileModule(source,{
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext},
  reportDiagnostics:true
});
const failures=(transpilation.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error);
assert.deepEqual(failures.map(d=>ts.flattenDiagnosticMessageText(d.messageText,'\n')),[]);
const runnable=transpilation.outputText.replace(
  /import \{ createClient \} from ["']npm:@supabase\/supabase-js@[^"']+["'];?\s*/,
  'const createClient = __createClient;\n'
);
assert.doesNotMatch(runnable,/^import\s/m);

function harness({enabled=true,quotas=true,approved=true,project=true,allowWeb=true,quotaDenied=false,quotaUnavailable=false,role='engenharia'}={}){
  let handler;
  const calls=[];
  const quotaCalls=[];
  const queried=[];
  const rows={
    profiles:approved?{id:'user',role,status:'approved'}:{id:'user',role,status:'pending'},
    projects:project?{id:'project-id',code:'obraA',name:'Obra A',status:'Ativa'}:null,
    project_metrics:[{physical_progress:0,target_progress:15,pac_score:80,workers_count:0,financial_spent_m:5}],
    project_supplies:[{name:'Material A',status:'Programado',supplier:'Fornecedor privado',quantity_text:'2',delivery_text:'Amanhã'}],
    project_tasks:[{title:'Tarefa interna',responsible:'Engenheiro',deadline_text:'Amanhã',done:false}],
    project_validations:[{item:'Validação interna',status:'Pendente'}]
  };
  const createClient=()=>({
    rpc:async(name,args)=>{
      quotaCalls.push({name,args});
      if(quotaUnavailable) return {data:null,error:{message:'rpc_not_available'}};
      if(quotaDenied) return {data:{allowed:false},error:null};
      return {data:{allowed:true,minute_used:1,day_used:1},error:null};
    },
    auth:{getUser:async(jwt)=>jwt==='test-token'?{data:{user:{id:'user'}},error:null}:{data:null,error:{}}},
    from(table) {
      const q={select(columns){queried.push({table,columns});return q;},eq(){return q;},limit:async()=>({data:rows[table]||[],error:null}),single:async()=>rows[table]?{data:rows[table],error:null}:{data:null,error:{}}};
      return q;
    }
  });
  const env={SUPABASE_URL:'https://test.supabase.co',SUPABASE_ANON_KEY:'public-key',SUPABASE_SERVICE_ROLE_KEY:'server-only-test-key',OPENAI_API_KEY:'mock-key',
    PLANES_ASSISTANT_ENABLED:enabled?'true':'false',
    PLANES_ASSISTANT_QUOTAS_VERIFIED:quotas?'true':'false',
    PLANES_ASSISTANT_WEB_ENABLED:allowWeb?'true':'false'};
  vm.runInNewContext(runnable,{
    __createClient:createClient,
    Deno:{env:{get:k=>env[k]},serve:fn=>{handler=fn;}},
    console,Response,Headers,AbortController,setTimeout,clearTimeout,Date,
    fetch:async(url,options)=>{
      calls.push({url,body:JSON.parse(options.body)});
      return {ok:true,json:async()=>({output:[{content:[{type:'output_text',text:'Resposta específica da pergunta.'}]}]})};
    }
  });
  return {calls,quotaCalls,queried,async post(body,auth='test-token'){
    const result=await handler({method:'POST',headers:new Headers({
      Origin:'https://armidiasintegradas.github.io',
      ...(auth?{Authorization:'Bearer '+auth}:{})
    }),text:async()=>JSON.stringify(body)});
    return {status:result.status,body:JSON.parse(await result.text())};
  }};
}
test('general question is sent to LLM without forced project overview',async()=>{
  const h=harness();
  const r=await h.post({message:'Que horas são?'});
  assert.equal(r.status,200);
  assert.equal(r.body.mode,'general');
  assert.equal(r.body.answer,'Resposta específica da pergunta.');
  assert.equal(h.calls.length,1);
  assert.equal(h.calls[0].body.store,false);
  assert.equal(h.calls[0].body.tools,undefined);
});
test('research uses web search only when explicitly requested',async()=>{
  const h=harness();
  await h.post({message:'Pesquise materiais reciclados',mode:'research'});
  assert.equal(h.calls[0].body.tools[0].type,'web_search');
});
test('research cannot bypass server flag',async()=>{
  const h=harness({allowWeb:false});
  const r=await h.post({message:'Pesquise materiais reciclados',mode:'research'});
  assert.equal(r.status,503);
  assert.equal(h.calls.length,0);
});
test('call request is only a proposal, never a phone call',async()=>{
  const h=harness();
  const r=await h.post({message:'Ligue para João'});
  assert.equal(r.body.kind,'action_proposal');
  assert.equal(r.body.proposal.type,'call_contact');
  assert.equal(r.body.proposal.executed,false);
  assert.equal(h.calls.length,0);
});
test('database mutation is only a proposal',async()=>{
  const h=harness();
  const r=await h.post({message:'Adicione uma tarefa para verificar o concreto'});
  assert.equal(r.body.proposal.type,'database_change');
  assert.equal(r.body.executed,false);
  assert.equal(h.calls.length,0);
});
test('deny unavailable quota service, unapproved profile and unknown project',async()=>{
  const a=harness({quotas:false});
  assert.equal((await a.post({message:'Olá'})).status,503);
  const b=harness({approved:false});
  assert.equal((await b.post({message:'Olá'})).status,403);
  const c=harness({project:false});
  assert.equal((await c.post({message:'PAC da obra',project_code:'obraB'})).status,403);
});


test('quota check uses authenticated user and blocks model on exhaustion',async()=>{
  const h=harness({quotaDenied:true});
  const r=await h.post({message:'Que horas são?'});
  assert.equal(r.status,429);
  assert.equal(h.calls.length,0);
  assert.equal(h.quotaCalls.length,1);
  assert.equal(h.quotaCalls[0].name,'consume_planes_assistant_quota');
  assert.equal(h.quotaCalls[0].args.p_user_id,'user');
});
test('unavailable quota service fails closed before model invocation',async()=>{
  const h=harness({quotaUnavailable:true});
  const r=await h.post({message:'Explique curva S'});
  assert.equal(r.status,503);
  assert.equal(r.body.error,'quota_service_unavailable');
  assert.equal(h.calls.length,0);
});

test('project responses contain only RLS-scoped role-limited data',async()=>{
  const h=harness({role:'cliente'});
  const r=await h.post({message:'Como anda a obra?',project_code:'obraA'});
  assert.equal(r.status,200);
  const context=JSON.stringify(h.calls[0].body.input);
  assert.match(context,/"physical_progress":0/);
  assert.doesNotMatch(context,/Fornecedor privado|Tarefa interna|Validação interna|pac_score|financial_spent_m/);
  assert.equal(h.queried.some(x=>x.table==='project_supplies'),false);
  assert.equal(h.queried.some(x=>x.table==='project_tasks'),false);
});
test('engineering role receives permitted operational context without financial values',async()=>{
  const h=harness({role:'engenharia'});
  const r=await h.post({message:'Resumo do PAC',project_code:'obraA'});
  assert.equal(r.status,200);
  const context=JSON.stringify(h.calls[0].body.input);
  assert.match(context,/pac_score/);
  assert.match(context,/Tarefa interna/);
  assert.doesNotMatch(context,/financial_spent_m/);
});
test('recent conversation is bounded and clock context is supplied',async()=>{
  const h=harness();
  const history=Array.from({length:14},(_,i)=>({role:i%2?'assistant':'user',content:'Turno '+i}));
  const r=await h.post({message:'E o que eu perguntei?',history});
  assert.equal(r.status,200);
  const req=h.calls[0].body;
  assert.equal(req.input.length,10);
  assert.match(req.instructions,/America\/Recife/);
  assert.match(JSON.stringify(req.input),/Turno 13/);
  assert.doesNotMatch(JSON.stringify(req.input),/Turno 0/);
});
