/* Planes Intelligence · UI Refresh 2026-11
 * A presentation layer over the existing, authenticated legacy module.
 * Never changes messages, Supabase calls, actions, permission checks or event handlers.
 * Works with rerenders and the separate live panel-order swap.
 */
(() => {
  'use strict';

  const STYLE_ID = 'planes-intelligence-redesign-css-v1';
  const CSS = String.raw`
/* Only the Plans Intelligence module is styled; other modules are untouched. */
.planes-ai-redesign {
  --planes-ink: #0b1527; --planes-accent: #c6fb35;
  --planes-border: #e3e9f2; --planes-muted: #64748b;
  color: var(--planes-ink);
}
.planes-ai-redesign .planes-ai-hero {
  position: relative;
  overflow: hidden;
  min-height: 0 !important;
  padding: clamp(22px, 3vw, 36px) !important;
  border-radius: 26px !important;
  border: 1px solid #1f314a !important;
  background: radial-gradient(circle at 86% -30%, #2a4664 0, transparent 42%),linear-gradient(120deg,#091223 0%,#101e33 67%,#13283c 100%) !important;
  box-shadow: 0 20px 46px -30px #10274480 !important;
  gap: 22px !important;
}
.planes-ai-redesign .planes-ai-hero::after {
  content: "";position: absolute;right:-75px;bottom:-105px;
  width:310px;height:310px;border:1px solid #c6fb3524;border-radius:50%;
  box-shadow: 0 0 0 47px #c6fb3508,0 0 0 94px #c6fb3506;
  pointer-events:none;
}
.planes-ai-redesign .planes-ai-hero > * {position:relative;z-index:1;}
.planes-ai-redesign .planes-ai-hero h2 {
  font-size: clamp(23px, 2.4vw, 32px) !important;
  font-weight: 800 !important;
  letter-spacing: -.04em !important;
  line-height:1.18 !important;
}
.planes-ai-redesign .planes-ai-hero p {line-height:1.55;}
.planes-ai-redesign .planes-ai-hero .planes-ai-hero-status {
  margin-top: 12px;
  display: inline-flex;align-items:center;gap:8px;
  border:1px solid #54708a78;background:#20375294;
  border-radius:99px;padding:7px 12px;
  color:#cde1ee;font-size:11px;font-weight:650;
}
.planes-ai-redesign .planes-ai-hero .planes-ai-hero-status::before {
  content:"";display:block;width:7px;height:7px;border-radius:50%;background:var(--planes-accent);
  box-shadow:0 0 0 3px #c6fb3524;
}
.planes-ai-redesign .planes-ai-hero .planes-ai-project {
  border-radius:16px;border:1px solid #607b9636;
  padding:14px 16px;background:#ffffff0a;
  max-width:min(320px,100%);text-align:left;
}
.planes-ai-redesign .planes-ai-hero .planes-ai-project strong {
  color:#e5ff88 !important;line-height:1.4;font-size:13px !important;
}
.planes-ai-redesign .planes-ai-hero .planes-ai-project .planes-ai-sync-claim {
  font-size:11px !important;color:#b6c5d6 !important;
}
.planes-ai-redesign .planes-ai-chat {
  background: #fff !important;border:1px solid #dce5ef !important;
  border-radius: 26px !important; padding:0 !important;overflow:hidden;
  box-shadow: 0 18px 38px -30px #23385750 !important;
  min-height: 490px !important; gap:0 !important;
}
.planes-ai-redesign .planes-ai-chat > .planes-ai-chat-header {
  padding:24px 28px 20px !important; margin:0 !important;
  border-bottom:1px solid #e5ebf2 !important;
  background:linear-gradient(180deg,#fbfdff,#fff);
}
.planes-ai-redesign .planes-ai-chat .planes-ai-eyebrow {
  display:block; font-size:10px;font-weight:800;
  text-transform:uppercase;letter-spacing:.14em;
  color:#586f8b;margin-bottom:6px;
}
.planes-ai-redesign .planes-ai-chat .planes-ai-chat-header strong {
  font-size:clamp(17px,2vw,22px) !important;
  line-height:1.25;letter-spacing:-.035em !important;
  text-transform:none !important;color:#0c1b30 !important;
}
.planes-ai-redesign .planes-ai-chat .planes-ai-chat-header button {
  background:#f1f5fa !important;border:1px solid #e4eaf2 !important;
  color:#5b6c84 !important;border-radius:12px !important;
  padding:10px 12px !important;font-size:11px !important;
}
.planes-ai-redesign .planes-ai-chat .planes-ai-chat-history {
  min-height:300px;max-height:500px !important;
  padding:24px 28px !important;background: #fff;
  scrollbar-width:thin;scrollbar-color:#c8d4e3 transparent;
}
.planes-ai-redesign .planes-ai-chat .planes-ai-chat-history > * {
  max-width:100%;
}
.planes-ai-redesign .planes-ai-chat .planes-ai-chat-history [class*="bg-slate-50"] {
  background:#f3f7fb !important;border-color:#e1e8f0 !important;
  border-radius:16px !important;color:#17253b !important;
}
.planes-ai-redesign .planes-ai-chat .planes-ai-chat-history [class*="bg-slate-950"] {
  background:#0b162b !important;border-radius:16px !important;
  border-color:#0b162b !important;
}
.planes-ai-redesign .planes-ai-chat [data-intelligence-input="true"] {
  border:1px solid #d8e1ec !important;
  background:#f7f9fc !important;border-radius:16px !important;
  font-size:14px !important;color:#152037 !important;
  padding:14px 16px !important;
  min-width:0 !important;
}
.planes-ai-redesign .planes-ai-chat [data-intelligence-input="true"]:focus {
  outline:0 !important;border-color:#6d8ca8 !important;
  box-shadow:0 0 0 3px #a5bace30 !important;
}
.planes-ai-redesign .planes-ai-chat .planes-ai-chat-compose {
  border-top:1px solid #edf1f5 !important;
  padding:18px 24px 24px !important;
  background:#fff;
}
.planes-ai-redesign .planes-ai-chat .planes-ai-chat-compose button {
  border-radius:14px !important;
}
.planes-ai-redesign .planes-ai-chat .planes-ai-chat-compose [class*="bg-slate-950"] {
  background:#0b162b !important;
}
.planes-ai-redesign .planes-ai-chat .planes-ai-chat-compose [class*="d4ff00"] {
  color:#d1ff48 !important;
}
.planes-ai-redesign .planes-ai-support-grid {
  align-items:start;gap:18px !important;
}
.planes-ai-redesign .planes-ai-support-grid .white-bento-card,
.planes-ai-redesign .planes-ai-support-grid > section {
  border-radius:22px !important;
  border:1px solid #e2e9f2 !important;box-shadow:0 10px 24px -25px #1c365c40 !important;
}
.planes-ai-redesign .planes-ai-support-grid > section {
  padding:24px !important;
}
.planes-ai-redesign .planes-ai-support-grid [class*="lg:col-span-4"] .white-bento-card {
  padding:24px !important;
}
.planes-ai-redesign .planes-ai-support-grid button {
  transition: transform .17s ease, background-color .17s ease, border-color .17s ease;
}
.planes-ai-redesign .planes-ai-support-grid button:hover {
  transform:translateY(-1px);
}
@media (min-width:1024px) {
 .planes-ai-redesign .planes-ai-chat .planes-ai-chat-history {min-height:355px;}
 .planes-ai-redesign .planes-ai-support-grid {grid-template-columns: minmax(0, 5fr) minmax(0, 7fr) !important;}
 .planes-ai-redesign .planes-ai-support-grid > :first-child {grid-column:1 / 2 !important;}
 .planes-ai-redesign .planes-ai-support-grid > section {grid-column:2 / 3 !important;}
}
@media (max-width:767px){
 .planes-ai-redesign .planes-ai-hero {border-radius:19px !important;padding:21px !important;}
 .planes-ai-redesign .planes-ai-hero .planes-ai-project {max-width:100%;}
 .planes-ai-redesign .planes-ai-chat{border-radius:20px !important;min-height:400px !important;}
 .planes-ai-redesign .planes-ai-chat > .planes-ai-chat-header {padding:19px !important;gap:10px;}
 .planes-ai-redesign .planes-ai-chat .planes-ai-chat-history {padding:17px !important;min-height:240px;}
 .planes-ai-redesign .planes-ai-chat .planes-ai-chat-compose {padding:14px !important;}
 .planes-ai-redesign .planes-ai-support-grid > section {padding:19px !important;}
}
@media (prefers-reduced-motion:reduce){
 .planes-ai-redesign * {animation-duration:.01ms !important;transition-duration:.01ms !important;}
}
`;
  const clean=v=>String(v||'').normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'').toLowerCase()
    .replace(/\s+/g,' ').trim();

  function installStyle() {
    if(document.getElementById(STYLE_ID))return;
    const el=document.createElement('style');
    el.id=STYLE_ID;
    el.textContent=CSS;
    (document.head||document.documentElement).appendChild(el);
  }

  function rootOf(chat) {
    // Chat is moved to top level by the independent panel-order adapter.
    const parent=chat.parentElement;
    if(!parent || !parent.classList.contains('animate-card-fade'))return null;
    return parent;
  }
  function refresh() {
    const chatTitle=Array.from(document.querySelectorAll('strong')).find(el=>
      clean(el.textContent)==='painel de respostas & diagnosticos de engenharia');
    const chat=chatTitle?.closest('.white-bento-card');
    if(!chat)return false;
    // Preserve the existing swapping logic and avoid redesigning other modules.
    const swap=window.__PLANES_INTELLIGENCE_LAYOUT_SWAP__;
    if(swap?.apply)swap.apply();
    const root=rootOf(chat);
    if(!root)return false;
    installStyle();
    root.classList.add('planes-ai-redesign');

    const hero=Array.from(root.querySelectorAll('span')).find(el=>
      clean(el.textContent)==='modelo analitico conectado')?.closest('.bg-slate-950');
    if(hero){
      hero.classList.add('planes-ai-hero');
      const projectLabel=Array.from(hero.querySelectorAll('span')).find(el=>
        clean(el.textContent)==='empreendimento ativo:');
      const project=projectLabel?.parentElement;
      if(project)project.classList.add('planes-ai-project');
      const sync=Array.from(hero.querySelectorAll('span')).find(el=>
        clean(el.textContent).includes('100% dos indicadores sincronizados'));
      if(sync){
        sync.classList.add('planes-ai-sync-claim');
        sync.textContent='Contexto da obra selecionada';
      }
      const badge=Array.from(hero.querySelectorAll('span')).find(el=>clean(el.textContent)==='planes intelligence os');
      if(badge)badge.textContent='PLANES · ASSISTENTE DE ENGENHARIA';
      const model=Array.from(hero.querySelectorAll('span')).find(el=>clean(el.textContent)==='modelo analitico conectado');
      if(model)model.textContent='Análise e acompanhamento de obras';
      const heading=hero.querySelector('h2');
      if(heading && heading.textContent?.startsWith('Oi,')){
        // Keep personalized greeting; alter its hierarchy only via CSS.
      }
    }

    chat.classList.add('planes-ai-chat');
    const header=chat.querySelector(':scope > div');
    if(header){
      header.classList.add('planes-ai-chat-header');
      if(!header.querySelector('.planes-ai-eyebrow')){
        const label=document.createElement('span');
        label.className='planes-ai-eyebrow';
        label.textContent='CENTRAL DE CONVERSA';
        const titleHolder=chatTitle.parentElement;
        if(titleHolder)titleHolder.insertBefore(label,chatTitle);
      }
      chatTitle.textContent='Converse com seu assistente';
    }
    const history=Array.from(chat.children).find(el=>
      el.classList?.contains('flex-1') && el.classList?.contains('overflow-y-auto'));
    if(history)history.classList.add('planes-ai-chat-history');
    const input=chat.querySelector('[data-intelligence-input="true"]');
    if(input){
      const composer=input.closest('.flex');
      if(composer && chat.contains(composer)) {
        // Find only the composer container, do not change nested message boxes.
        const group=composer.parentElement;
        if(group && chat.contains(group) && group!==history)group.classList.add('planes-ai-chat-compose');
      }
    }
    const supportGrid=Array.from(root.children).find(el=>
      el.classList?.contains('lg:grid-cols-12') && el.querySelector('.white-bento-card'));
    if(supportGrid)supportGrid.classList.add('planes-ai-support-grid');
    root.dataset.planesIntelligenceUi='redesign-2026-11';
    return true;
  }

  window.__PLANES_INTELLIGENCE_REDESIGN__={version:'1.0.0',apply:refresh};
  let scheduled=false;
  const schedule=()=>{
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;refresh();});
  };
  if(document.readyState==='loading')
    document.addEventListener('DOMContentLoaded',schedule,{once:true});
  else schedule();

  const observer=new MutationObserver(mutations=>{
    if(mutations.some(m=>m.type==='childList'))schedule();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
})();
