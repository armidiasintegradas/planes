/* Planes staged task action: two-step RPC, explicit user confirmation only.
 * Load after planes-universal-preview.js in an isolated staging build.
 */
(() => {
  'use strict';
  const preview = window.planesUniversalPreview;
  const config = window.PLANES_UNIVERSAL_PREVIEW;
  const client = window.PLANES_UNIVERSAL_STAGING_CLIENT;
  if (!preview || !config || config.enabled !== true || !client ||
      client.supabaseUrl !== config.supabaseUrl ||
      config.supabaseProjectRef === 'xfgcbxppsbwmxwsuajou' ||
      typeof client.rpc !== 'function') return;

  const section=document.createElement('section');
  section.setAttribute('aria-label','Criar tarefa na homologação');
  section.style.cssText='border-top:1px solid #dce4ef;padding-top:10px;display:grid;gap:7px';
  const title=document.createElement('strong');
  title.textContent='Criar tarefa (duas etapas)';
  const project=document.createElement('input');
  project.placeholder='UUID da obra autorizada';
  project.setAttribute('aria-label','UUID da obra');
  const task=document.createElement('input');
  task.placeholder='Título da tarefa';
  task.maxLength=180;
  task.setAttribute('aria-label','Título da tarefa');
  const responsible=document.createElement('input');
  responsible.placeholder='Responsável (opcional)';
  responsible.maxLength=120;
  const deadline=document.createElement('input');
  deadline.placeholder='Prazo (opcional)';
  deadline.maxLength=100;
  const summary=document.createElement('div');
  summary.setAttribute('role','status');
  summary.textContent='Nenhuma alteração preparada.';
  const prepare=document.createElement('button');
  prepare.type='button'; prepare.textContent='Preparar tarefa';
  const confirm=document.createElement('button');
  confirm.type='button'; confirm.textContent='Confirmar e salvar';
  confirm.disabled=true;
  const cancel=document.createElement('button');
  cancel.type='button'; cancel.textContent='Cancelar';
  cancel.disabled=true;
  section.append(title,project,task,responsible,deadline,summary,prepare,confirm,cancel);
  preview.root.appendChild(section);

  let pending=null;
  let busy=false;
  const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
  function controls(){
    prepare.disabled=busy;
    confirm.disabled=busy || !pending;
    cancel.disabled=busy || !pending;
  }
  function invalidate(){
    pending=null; controls();
    summary.textContent='Dados alterados. Prepare novamente antes de confirmar.';
  }
  for(const field of [project,task,responsible,deadline])field.addEventListener('input',invalidate);
  async function request(name,payload){
    if(typeof client.auth?.getSession!=='function')throw Error('Sessão de homologação indisponível');
    const {data,error}=await client.auth.getSession();
    if(error || !data?.session?.access_token)throw Error('Faça login na homologação');
    // RPC uses staging client's session and RLS. No service-role keys in browser.
    const result=await client.rpc(name,payload);
    if(result.error)throw Error(result.error.message || 'Ação rejeitada pelo servidor');
    return result.data;
  }
  async function prepareAction(){
    if(busy)return;
    pending=null;
    if(!uuid.test(project.value.trim()) || task.value.trim().length<3){
      summary.textContent='Informe o UUID da obra e um título de pelo menos 3 caracteres.';
      controls(); return;
    }
    busy=true;controls();
    try{
      const result=await request('prepare_planes_create_task',{
        p_project_id:project.value.trim(),
        p_title:task.value.trim(),
        p_responsible:responsible.value.trim(),
        p_deadline_text:deadline.value.trim()
      });
      if(result?.state!=='prepared' || !uuid.test(result.action_id))throw Error('Preparação não confirmada');
      pending={id:result.action_id,summary:result.summary};
      summary.textContent='Revise e confirme: '+result.summary.title+
        ' · responsável: '+(result.summary.responsible || 'não informado')+
        ' · prazo: '+(result.summary.deadline_text || 'não informado')+
        '. Nenhuma tarefa foi salva.';
    }catch(e){summary.textContent='Não foi possível preparar: '+String(e?.message || e);}
    finally{busy=false;controls();}
  }
  async function finish(confirmed){
    if(busy || !pending)return;
    const action=pending;
    busy=true;controls();
    try{
      const result=await request('confirm_planes_create_task',{
        p_action_id:action.id,p_confirm:confirmed
      });
      if(confirmed && result?.state!=='completed')throw Error('Gravação não confirmada');
      if(!confirmed && result?.state!=='cancelled')throw Error('Cancelamento não confirmado');
      pending=null;
      summary.textContent=confirmed
        ? 'Tarefa registrada no banco de homologação: '+String(result.task_id||'')
        : 'Solicitação cancelada. Nenhuma tarefa criada.';
    }catch(e){
      summary.textContent='Operação não confirmada: '+String(e?.message || e)+'. Verifique o histórico antes de tentar novamente.';
      // Keep idempotency token so a retry cannot create a second task.
    }finally{busy=false;controls();}
  }
  prepare.addEventListener('click',()=>{void prepareAction();});
  confirm.addEventListener('click',()=>{void finish(true);});
  cancel.addEventListener('click',()=>{void finish(false);});
  function suggestInstruction(instruction) {
    // Pre-fill only. Never prepare or confirm automatically based on AI output.
    const text=String(instruction || '').trim();
    const match=/^(?:adicione|adicionar|registre|registrar|cadastre|cadastrar|crie|criar)\\s+(?:uma?\\s+)?tarefa(?:\\s+(?:para|de|que|:))?\\s*(.+)$/i.exec(text);
    if (!match || !match[1]) return false;
    task.value=match[1].trim().slice(0,180);
    invalidate();
    summary.textContent='Título sugerido. Informe o UUID da obra e revise os campos antes de preparar.';
    return true;
  }
  window.planesStagingTaskAction={prepare:prepareAction,confirm:()=>finish(true),cancel:()=>finish(false),suggestInstruction,section};
})();
