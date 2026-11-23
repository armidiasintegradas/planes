import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const code=readFileSync(new URL('../rhythm-gauge-live.js',import.meta.url),'utf8');
const auth=readFileSync(new URL('../auth-gate-live.js',import.meta.url),'utf8');
function setup({reduced=false}={}){
  let now=0, callback;
  const queue=[];
  const paths=[90,70,52].map(radius=>{
    const classes=new Set(['anim-radial-ring','transition-all','duration-1200']);
    const attrs={};
    return {
      radius,dataset:{},style:{},attrs,
      classList:{remove:x=>classes.delete(x),contains:x=>classes.has(x)},
      getTotalLength:()=>Math.PI*radius,
      getPointAtLength:distance=>{
        const portion=Math.max(0,Math.min(1,distance/(Math.PI*radius)));
        const angle=Math.PI*(1-portion);
        return {x:110+radius*Math.cos(angle),y:120-radius*Math.sin(angle)};
      },
      setAttribute(k,v){attrs[k]=v;},
      removeAttribute(k){delete attrs[k];}
    };
  });
  const markers=paths.map(()=>({attrs:{},setAttribute(k,v){this.attrs[k]=v;}}));
  const svg={
    dataset:{},attrs:{},isConnected:true,
    querySelectorAll(selector){
      if(selector==='path.anim-radial-ring')return paths.filter(p=>p.classList.contains('anim-radial-ring'));
      if(selector==='circle')return markers;
      return [];
    },
    setAttribute(k,v){this.attrs[k]=v;}
  };
  const center={parentElement:{parentElement:{querySelector:selector=>selector==='svg'?svg:null}}};
  const document={readyState:'complete',documentElement:{},
    getElementById:id=>id==='anim-frentes-avg'?center:null};
  const window={
    requestAnimationFrame:fn=>queue.push(fn),
    matchMedia:()=>({matches:reduced})
  };
  class Observer{
    constructor(fn){callback=fn;}
    observe(){}
  }
  vm.runInNewContext(code,{document,window,MutationObserver:Observer,
    performance:{now:()=>now},console,Math,Number});
  function frame(timestamp){
    now=timestamp;
    const work=queue.splice(0);
    for(const cb of work)cb(now);
  }
  return {paths,markers,svg,window,frame,
    get pending(){return queue.length;},
    notify:()=>callback([{type:'childList'}])};
}
test('live loader exists and gauge script parses',()=>{
  new vm.Script(code);
  assert.match(auth,/rhythm-gauge-live\.js\?v=20261123-1/);
});
test('initial and final marker locations precisely match each gauge arc',()=>{
  const h=setup();
  h.frame(0); // attach and start
  for(let i=0;i<3;i++){
    assert.equal(h.paths[i].classList.contains('anim-radial-ring'),false);
    assert.equal(Number(h.markers[i].attrs.cx).toFixed(4),(110-h.paths[i].radius).toFixed(4));
  }
  h.frame(1250);
  const fractions=[.92,.74,.62];
  for(let i=0;i<3;i++){
    const p=h.paths[i],total=p.getTotalLength();
    const end=p.getPointAtLength(total*fractions[i]);
    assert.ok(Math.abs(Number(h.markers[i].attrs.cx)-end.x)<0.001,'x of marker '+i);
    assert.ok(Math.abs(Number(h.markers[i].attrs.cy)-end.y)<0.001,'y of marker '+i);
    assert.ok(Math.abs(Number(p.style.strokeDashoffset)-total*(1-fractions[i]))<0.001,'dash offset '+i);
    assert.match(p.style.strokeDasharray,/\d/);
  }
  assert.equal(h.svg.dataset.planesRhythmFixed,'1');
  assert.match(h.svg.attrs['aria-label'],/Arena 92%.*Apartamentos 74%.*Infraestrutura 62%/);
});
test('existing progress information and CSS palette are preserved',()=>{
  const h=setup();
  h.frame(0);h.frame(1250);
  assert.deepEqual(h.paths.map(x=>Number(x.dataset.planesRhythmFixed||0)),[0,0,0]);
  assert.deepEqual(h.paths.map(x=>Number(x.attrs['data-rhythm-progress'])),[.92,.74,.62]);
});
test('reduced motion jumps to accurate final values without animation',()=>{
  const h=setup({reduced:true});
  h.frame(0);h.frame(0);
  assert.equal(h.pending,0);
  for(let i=0;i<3;i++){
    const p=h.paths[i],len=p.getTotalLength(),fraction=[.92,.74,.62][i];
    assert.ok(Math.abs(Number(p.style.strokeDashoffset)-len*(1-fraction))<0.001);
  }
});
test('subsequent mutation does not reanimate an already aligned gauge',()=>{
  const h=setup();
  h.frame(0);h.frame(1250);
  h.notify();h.frame(1500);
  assert.equal(h.pending,0);
});
