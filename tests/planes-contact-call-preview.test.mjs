import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../public/planes-contact-call-preview.js',import.meta.url),'utf8');
function setup({production=false,otherUser=false}={}){
  class Element{
    constructor(type){this.type=type;this.children=[];this.events={};this.value='';this.textContent='';this.disabled=false;this.style={};}
    append(...a){this.children.push(...a);}
    appendChild(a){this.children.push(a);}
    replaceChildren(...a){this.children=a;}
    setAttribute(){}
    addEventListener(k,fn){this.events[k]=fn;}
  }
  const root=new Element('section'),calls=[];
  const config={enabled:true,supabaseUrl:'https://aaaaaaaaaaaaaaaaaaaa.supabase.co',supabaseProjectRef:'aaaaaaaaaaaaaaaaaaaa'};
  const client={supabaseUrl:production?'https://xfgcbxppsbwmxwsuajou.supabase.co':config.supabaseUrl,
    auth:{getSession:async()=>({data:{session:{user:{id:'owned-user'}}},error:null})},
    from(table){
      calls.push({table});
      const q={select(fields){calls.push({fields});return q;},eq(k,v){calls.push({k,v});return q;},
        limit(n){calls.push({limit:n});return Promise.resolve({data:otherUser?[]:[
          {id:'contact-a',display_name:'João',phone_e164:'+5581999999999'}],error:null});}};
      return q;
    }};
  const window={location:{href:''},planesUniversalPreview:{root},
    PLANES_UNIVERSAL_PREVIEW:config,PLANES_UNIVERSAL_STAGING_CLIENT:client};
  vm.runInNewContext(source,{document:{createElement:t=>new Element(t)},window,console});
  return {window,root,calls};
}
test('does not attach if client points at production',()=>{
  const h=setup({production:true});
  assert.equal(h.window.planesStagingContacts,undefined);
});
test('contact request never calls before user selects and confirms',async()=>{
  const h=setup();
  const w=h.window.planesStagingContacts;
  w.suggestContact('João');
  assert.equal(h.window.location.href,'');
  await w.findContacts();
  const results=w.wrapper.children.find(x=>x.type==='div' && x.children.length);
  assert.equal(results.children.length,1);
  assert.equal(h.window.location.href,'');
  results.children[0].events.click();
  assert.equal(h.window.location.href,'');
  const buttons=w.wrapper.children.filter(x=>x.type==='button');
  const call=buttons.find(x=>x.textContent==='Abrir discador');
  assert.equal(call.disabled,false);
  call.events.click();
  assert.equal(h.window.location.href,'tel:+5581999999999');
  assert.ok(h.calls.some(c=>c.k==='user_id'&&c.v==='owned-user'));
});
test('unknown contact cannot trigger a call',async()=>{
  const h=setup({otherUser:true});
  const w=h.window.planesStagingContacts;
  w.suggestContact('Outro');
  await w.findContacts();
  const btn=w.wrapper.children.filter(x=>x.type==='button').find(x=>x.textContent==='Abrir discador');
  assert.equal(btn.disabled,true);
  assert.equal(h.window.location.href,'');
});
