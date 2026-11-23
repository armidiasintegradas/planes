import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const code=readFileSync(new URL('../intelligence-panel-order-live.js',import.meta.url),'utf8');
const loader=readFileSync(new URL('../auth-gate-live.js',import.meta.url),'utf8');

function fixture({chatInput=true}={}){
 class Element{
  constructor(name,classes=[],text=''){
   this.name=name; this.textContent=text; this.classes=new Set(classes);
   this.classList={contains:x=>this.classes.has(x),add:x=>this.classes.add(x),remove:x=>this.classes.delete(x)};
   this.children=[];this.parentNode=null;this.dataset={};
  }
  appendChild(x){if(x.parentNode)x.parentNode.removeChild(x);this.children.push(x);x.parentNode=this;return x;}
  removeChild(x){let i=this.children.indexOf(x);if(i<0)throw Error('no node');this.children.splice(i,1);x.parentNode=null;}
  replaceChild(x,y){let i=this.children.indexOf(y);if(i<0)throw Error('not found');if(x.parentNode)x.parentNode.removeChild(x);i=this.children.indexOf(y);this.children[i]=x;x.parentNode=this;y.parentNode=null;}
  insertBefore(x,next){if(x.parentNode)x.parentNode.removeChild(x);let i=next?this.children.indexOf(next):-1;if(i<0)i=this.children.length;this.children.splice(i,0,x);x.parentNode=this;}
  get nextSibling(){if(!this.parentNode)return null;const p=this.parentNode.children;return p[p.indexOf(this)+1]||null;}
  closest(selector){return selector==='section'?memory:selector==='.white-bento-card'?chat:null;}
  querySelector(selector){return selector==='[data-intelligence-input="true"]'&&chatInput?input:null;}
 }
 const root=new Element('root');const heading=new Element('heading');
 const memory=new Element('memory',['rounded-[20px]','bg-white'],'Memória de decisões Seu histórico nesta obra');
 const grid=new Element('grid',['grid','grid-cols-1','lg:grid-cols-12','gap-6']);
 const diagnostics=new Element('diagnostics',['lg:col-span-4']);
 const chat=new Element('chat',['lg:col-span-8','white-bento-card']);
 const input=new Element('input');chat.appendChild(input);
 root.appendChild(heading);root.appendChild(memory);root.appendChild(grid);grid.appendChild(diagnostics);grid.appendChild(chat);
 const p=new Element('p',[],'Memória de decisões');
 const strong=new Element('strong',[],'Painel de Respostas & Diagnósticos de Engenharia');
 const document={
  readyState:'complete',documentElement:root,
  querySelectorAll(selector){return selector==='p'?[p]:selector==='strong'?[strong]:[];}
 };
 let callback;
 class Observer{constructor(f){callback=f;}observe(){}}
 const window={requestAnimationFrame:cb=>cb()};
 vm.runInNewContext(code,{window,document,MutationObserver:Observer});
 return {root,grid,memory,chat,diagnostics,input,window,mutate:()=>callback([{type:'childList'}])};
}
test('live loader references the actual published layout script',()=>{
 assert.match(loader,/intelligence-panel-order-live\.js\?v=20261123-1/);
});
test('chat is promoted above diagnostics while memory takes old chat column',()=>{
 const f=fixture();
 assert.deepEqual(f.root.children.map(x=>x.name),['heading','chat','grid']);
 assert.deepEqual(f.grid.children.map(x=>x.name),['diagnostics','memory']);
 assert.equal(f.chat.classList.contains('w-full'),true);
 assert.equal(f.chat.classList.contains('lg:col-span-8'),false);
 assert.equal(f.memory.classList.contains('lg:col-span-8'),true);
 assert.equal(f.chat.children[0],f.input);
 assert.equal(f.chat.dataset.planesChatPriority,'first');
});
test('re-render observer does not switch the layout back or duplicate nodes',()=>{
 const f=fixture();
 f.mutate();f.mutate();
 assert.deepEqual(f.root.children.map(x=>x.name),['heading','chat','grid']);
 assert.deepEqual(f.grid.children.map(x=>x.name),['diagnostics','memory']);
 assert.equal(f.root.children.length,3);
});
test('no swap if chat does not contain a valid user input',()=>{
 const f=fixture({chatInput:false});
 assert.deepEqual(f.root.children.map(x=>x.name),['heading','memory','grid']);
 assert.deepEqual(f.grid.children.map(x=>x.name),['diagnostics','chat']);
});
