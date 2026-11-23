/* Planes OS: synchronize the three semi-circular Rhythm Global arcs with
 * their actual SVG path lengths and endpoint markers.
 * Read-only visual fix. Preserves user data and the dashboard's 92/74/62 values.
 */
(() => {
  'use strict';
  const PROGRESS = [0.92, 0.74, 0.62];
    const REDUCED = typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = value => Math.min(1, Math.max(0, value));

  function geometry(path, proportion) {
    const length = path.getTotalLength();
    const fraction = clamp(proportion);
    if (!Number.isFinite(length) || length <= 0) return null;
    const pos = path.getPointAtLength(length * fraction);
    if (!Number.isFinite(pos.x) || !Number.isFinite(pos.y)) return null;
    return {length, offset:length*(1-fraction), x:pos.x, y:pos.y};
  }

  function sync(svg) {
    if (!svg || svg.dataset.planesRhythmFixed === '1') return false;
    const tracks = Array.from(svg.querySelectorAll('path.anim-radial-ring'));
    const markers = Array.from(svg.querySelectorAll('circle'));
    if (tracks.length !== 3 || markers.length < 3 ||
        tracks.some(p => typeof p.getTotalLength !== 'function' ||
                         typeof p.getPointAtLength !== 'function')) return false;

    const values = tracks.map((p,i)=>geometry(p,PROGRESS[i]));
    if (values.some(v=>v===null)) return false;
    svg.dataset.planesRhythmFixed='1';
    svg.setAttribute('role','img');
    svg.setAttribute('aria-label',
      'Ritmo global de produção: Arena 92%, Apartamentos 74%, Infraestrutura 62%');

    tracks.forEach((p,i)=>{
      const length=values[i].length;
      // Legacy CSS/JS uses hard-coded 283/220/163 and unrelated marker coords.
      // Disconnect that animation to avoid two competing stroke animations.
      p.classList.remove('anim-radial-ring');
      p.classList.remove('transition-all');
      p.classList.remove('duration-1200');
      p.style.transition='none';
      p.style.strokeDasharray=String(length)+' '+String(length);
      p.style.strokeDashoffset=String(length);
      p.removeAttribute('data-offset');
      p.setAttribute('data-rhythm-progress',String(PROGRESS[i]));
      // The outer lime marker originally has anim-pulse-slow. That CSS
      // animation transforms the entire circle away from its SVG cx/cy,
      // independently of our path-following animation. Disable every
      // marker-level transform/animation so the points stay on their arcs.
      markers[i].classList.remove('anim-pulse-slow');
      markers[i].style.animation='none';
      markers[i].style.transform='none';
      markers[i].style.transition='none';
      markers[i].setAttribute('cx',String(p.getPointAtLength(0).x));
      markers[i].setAttribute('cy',String(p.getPointAtLength(0).y));
    });

    const duration=REDUCED?0:1250;
    const started=performance.now();
    function step(now) {
      if (!svg.isConnected) return;
      const t=duration===0?1:clamp((now-started)/duration);
      const ease=1-Math.pow(1-t,3);
      for(let i=0;i<3;i++){
        const progress=PROGRESS[i]*ease;
        const length=values[i].length;
        tracks[i].style.strokeDashoffset=String(length*(1-progress));
        const point=tracks[i].getPointAtLength(length*progress);
        markers[i].setAttribute('cx',String(point.x));
        markers[i].setAttribute('cy',String(point.y));
      }
      if(t<1) window.requestAnimationFrame(step);
    }
    window.requestAnimationFrame(step);
    return true;
  }

  function apply() {
    const center=document.getElementById('anim-frentes-avg');
    const svg=center?.parentElement?.parentElement?.querySelector('svg');
    return sync(svg);
  }

  window.__PLANES_RHYTHM_GAUGE_FIX__={version:'1.0.0',apply,geometry};

  let scheduled=false;
  function schedule() {
    if(scheduled)return;
    scheduled=true;
    window.requestAnimationFrame(()=>{scheduled=false;apply();});
  }
  if(document.readyState==='loading')
    document.addEventListener('DOMContentLoaded',schedule,{once:true});
  else schedule();

  const observer=new MutationObserver(changes=>{
    if(changes.some(m=>m.type==='childList'))schedule();
  });
  observer.observe(document.documentElement,{subtree:true,childList:true});
})();
