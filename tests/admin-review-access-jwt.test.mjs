import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

const file=readFileSync(new URL('../supabase/functions/admin-review-access/index.ts',import.meta.url),'utf8');
const transpiled=ts.transpileModule(file,{
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext},
  reportDiagnostics:true
});
const errors=(transpiled.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error);
assert.equal(errors.length,0,errors.map(x=>ts.flattenDiagnosticMessageText(x.messageText,'\n')).join('\n'));
const script=transpiled.outputText.replace(
  /import \{ createClient \} from [^\n]+\n/,
  'const createClient=__createClient;\n'
);
assert.doesNotMatch(script,/^import /m);

function harness({role='admin',rpcError=null}={}){
 let handler;
 const calls=[];
 const userId='11111111-1111-4111-8111-111111111111';
 function createClient(url,key,options={}){
   const type=key==='service-key'?'service':'user';
   const client={
     auth:{getUser:async()=>({data:{user:{id:userId}},error:null})},
     from(table){
       const query={
         select(){return query;},
         eq(){return query;},
         single:async()=>({
           data:table==='profiles'?{id:userId,status:'approved',role}:
             table==='access_requests'?{id:'request-id',user_id:'22222222-2222-4222-8222-222222222222',status:'pending'}:null,
           error:null
         })
       };
       return query;
     },
     rpc:async(name,body)=>{
       calls.push({type,auth:options.global?.headers?.Authorization, name,body});
       return rpcError?{data:null,error:{code:'42501',message:rpcError}}:
         {data:{ok:true,request_id:'request-id',status:'approved'},error:null};
     }
   };
   return client;
 }
 vm.runInNewContext(script,{
   __createClient:createClient,
   Response,Request,AbortSignal,console,
   Deno:{env:{get:k=>({
     SUPABASE_URL:'https://example.supabase.co',
     SUPABASE_ANON_KEY:'anon-public',
     SUPABASE_SERVICE_ROLE_KEY:'service-key'
   })[k]},serve:fn=>{handler=fn;}},
   fetch:async()=>({ok:true,status:200})
 });
 async function invoke(){
   const req=new Request('https://example.supabase.co/functions/v1/admin-review-access',{
     method:'POST',headers:{
       Authorization:'Bearer authenticated-user-jwt',
       Origin:'https://armidiasintegradas.github.io',
       'Content-Type':'application/json'
     },
     body:JSON.stringify({requestId:'request-id',decision:'approve',role:'engenharia',projectIds:[],workIds:[]})
   });
   const response=await handler(req);
   return {status:response.status,body:await response.json()};
 }
 return {invoke,calls};
}

test('administrator approval RPC is invoked with verified user JWT, not service role',async()=>{
  const h=harness();
  const r=await h.invoke();
  assert.equal(r.status,200);
  assert.equal(r.body.ok,true);
  assert.equal(h.calls.length,1);
  assert.equal(h.calls[0].type,'user');
  assert.equal(h.calls[0].auth,'Bearer authenticated-user-jwt');
  assert.equal(h.calls[0].name,'admin_review_access_request');
  assert.equal(h.calls[0].body.p_actor_id,'11111111-1111-4111-8111-111111111111');
});

test('nonadmin cannot execute RPC',async()=>{
  const h=harness({role:'engenharia'});
  const r=await h.invoke();
  assert.equal(r.status,403);
  assert.equal(h.calls.length,0);
});

test('database error cannot report success or trigger mutation outside RPC',async()=>{
  const h=harness({rpcError:'Actor/session mismatch'});
  const r=await h.invoke();
  assert.equal(r.status,400);
  assert.equal(r.body.error,'Unable to review access request');
  assert.equal(h.calls.length,1);
  assert.equal(h.calls[0].type,'user');
});

test('service-role client is used only for authorization check, never review RPC',()=>{
  assert.doesNotMatch(file,/await adminClient\.rpc\("admin_review_access_request"/);
  assert.match(file,/await userClient\.rpc\("admin_review_access_request"/);
  assert.match(file,/auth\.getUser\(token\)/);
});
