/* Planes Intelligence Universal — isolated staging preview ONLY.
 * Inject separately into candidate HTML; never load on published gh-pages.
 * Requires a staging Supabase client whose URL matches the config project.
 */
(() => {
  'use strict';
  const cfg = window.PLANES_UNIVERSAL_PREVIEW;
  if (!cfg || cfg.enabled !== true) return;
  const projectRef = String(cfg.supabaseProjectRef || '');
  const origin = String(cfg.supabaseUrl || '');
  if (!/^[a-z0-9]{20}$/.test(projectRef) ||
      projectRef === 'xfgcbxppsbwmxwsuajou' ||
      origin !== 'https://' + projectRef + '.supabase.co') {
    console.error('Planes Universal: isolated Supabase staging URL required');
    return;
  }

  const style = document.createElement('style');
  style.textContent = `
  #planes-universal-preview{position:fixed;right:18px;bottom:18px;z-index:2147482000;display:flex;flex-direction:column;gap:10px;width:min(440px,calc(100vw - 36px));max-height:min(690px,calc(100dvh - 36px));background:#fff;border:1px solid #dce4ef;border-radius:20px;box-shadow:0 20px 60px #09172b33;padding:16px;color:#0b1427;font:14px system-ui,sans-serif}
  #planes-universal-preview[hidden]{display:none}
  #planes-universal-preview .pu-log{overflow:auto;min-height:120px;flex:1;display:flex;flex-direction:column;gap:10px;white-space:pre-wrap}
  #planes-universal-preview .pu-msg{padding:10px 12px;border-radius:14px;background:#f2f5f9;overflow-wrap:anywhere}
  #planes-universal-preview .pu-msg[data-sender="user"]{background:#0a1225;color:#fff;align-self:flex-end}
  #planes-universal-preview .pu-controls{display:flex;gap:7px;align-items:center;flex-wrap:wrap}
  #planes-universal-preview textarea{min-height:68px;resize:vertical;width:100%;border-radius:12px;border:1px solid #cbd5e1;padding:10px;box-sizing:border-box;font:inherit}
  #planes-universal-preview input,#planes-universal-preview select{border:1px solid #cbd5e1;border-radius:8px;padding:8px;min-width:0}
  #planes-universal-preview button{cursor:pointer;border:0;border-radius:10px;background:#101827;color:#fff;padding:10px 14px;font-weight:600}
  #planes-universal-preview button:disabled{opacity:.55;cursor:not-allowed}
  #planes-universal-preview a{color:#164eb2}
  #planes-universal-preview .pu-status{font-size:12px;color:#516178}
  `;
  document.head.appendChild(style);

  const root = document.createElement('section');
  root.id = 'planes-universal-preview';
  root.setAttribute('aria-label','Planes Intelligence — homologação');
  const heading = document.createElement('div');
  heading.textContent = 'Planes Intelligence · HOMOLOGAÇÃO';
  heading.style.fontWeight = '800';
  const log = document.createElement('div');
  log.className = 'pu-log';
  log.setAttribute('role','log');
  log.setAttribute('aria-live','polite');
  const controls = document.createElement('div');
  controls.className = 'pu-controls';
  const mode = document.createElement('select');
  mode.setAttribute('aria-label','Modo de consulta');
  for (const [value, text] of [['general','Perguntar'],['research','Pesquisar na web']]) {
    const opt = document.createElement('option'); opt.value=value; opt.textContent=text;mode.appendChild(opt);
  }
  const project = document.createElement('input');
  project.placeholder = 'Código da obra (opcional)';
  project.setAttribute('aria-label','Código da obra');
  project.maxLength=80;
  const field=document.createElement('textarea');
  field.placeholder='Pergunte qualquer coisa ou solicite uma ação…';
  field.setAttribute('aria-label','Pergunta para o Intelligence');
  field.maxLength=3000;
  const send=document.createElement('button');
  send.type='button';send.textContent='Consultar';
  const status=document.createElement('div');
  status.className='pu-status';
  status.textContent='Ambiente isolado. Ações dependem de confirmação; nenhuma alteração será executada.';
  controls.append(mode,project);
  root.append(heading,log,controls,field,send,status);
  document.body.appendChild(root);

  const addMessage=(text,sender='assistant')=>{
    const item=document.createElement('div');
    item.className='pu-msg';
    item.dataset.sender=sender;
    item.textContent=String(text || '');
    log.appendChild(item);
    log.scrollTop=log.scrollHeight;
    return item;
  };
  let inflight=false;
  async function submit() {
    if(inflight)return;
    const message=field.value.trim();
    if(!message)return;
    // Never silently reuse production sessions.
    const client=window.PLANES_UNIVERSAL_STAGING_CLIENT;
    if(!client || client.supabaseUrl !== origin || typeof client.auth?.getSession !== 'function') {
      status.textContent='Entre na instância de homologação antes de consultar.';
      return;
    }
    inflight=true;send.disabled=true;
    addMessage(message,'user');
    status.textContent='Consultando homologação…';
    try {
      const {data,error}=await client.auth.getSession();
      const jwt=data?.session?.access_token;
      if(error || !jwt) throw Error('Sessão de homologação ausente ou expirada.');
      const path=origin+'/functions/v1/planes-universal-assistant';
      const response=await fetch(path,{
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+jwt,
          'apikey':String(cfg.publishableKey || '')},
        body:JSON.stringify({message,mode:mode.value,
          ...(project.value.trim()?{project_code:project.value.trim()}:{})})
      });
      const payload=await response.json();
      if(!response.ok || payload.ok!==true){
        throw Error(payload.error || 'Resposta indisponível');
      }
      addMessage(payload.answer || 'Sem resposta.');
      if(payload.kind==='action_proposal'){
        addMessage('AÇÃO NÃO EXECUTADA — é necessário confirmar no fluxo seguro do sistema.');
      }
      // Render links by DOM properties only; never inject model text as HTML.
      if(Array.isArray(payload.sources)){
        for(const source of payload.sources.slice(0,10)){
          if(typeof source?.url!=='string' || !/^https:\/\//.test(source.url))continue;
          const link=document.createElement('a');
          link.href=source.url;
          link.target='_blank';link.rel='noopener noreferrer';
          link.textContent=String(source.title||source.url).slice(0,180);
          log.appendChild(link);
        }
      }
      field.value='';
      status.textContent='Resposta recebida. Nenhuma ação executada automaticamente.';
    }catch(e){
      addMessage('Não foi possível concluir: '+String(e?.message||'erro de comunicação'));
      status.textContent='A pergunta foi preservada para nova tentativa.';
    }finally{inflight=false;send.disabled=false;field.focus();}
  }
  send.addEventListener('click',submit);
  field.addEventListener('keydown',event=>{
    if(event.key==='Enter' && !event.shiftKey){
      event.preventDefault();void submit();
    }
  });
  window.planesUniversalPreview={submit,root};
})();
