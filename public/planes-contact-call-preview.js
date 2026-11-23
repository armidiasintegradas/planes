/* Planes staging-only contact dialer. Requires a user-owned RLS contact directory.
 * A human must select an exact result and click "Abrir discador".
 * This widget cannot confirm a call actually connected.
 */
(() => {
  'use strict';
  const preview=window.planesUniversalPreview;
  const cfg=window.PLANES_UNIVERSAL_PREVIEW;
  const client=window.PLANES_UNIVERSAL_STAGING_CLIENT;
  if (!preview || !cfg || cfg.enabled!==true || !client ||
      client.supabaseUrl!==cfg.supabaseUrl ||
      cfg.supabaseProjectRef==='xfgcbxppsbwmxwsuajou' ||
      typeof client.from!=='function') return;

  const wrapper=document.createElement('section');
  wrapper.setAttribute('aria-label','Ligação para contato autorizado');
  wrapper.style.cssText='border-top:1px solid #dce4ef;padding-top:10px;display:grid;gap:7px';
  const heading=document.createElement('strong'); heading.textContent='Ligar para contato';
  const search=document.createElement('input');
  search.placeholder='Nome do contato';
  search.maxLength=120;
  search.setAttribute('aria-label','Buscar contato');
  const searchButton=document.createElement('button');
  searchButton.type='button';searchButton.textContent='Buscar contato';
  const results=document.createElement('div');
  results.setAttribute('role','listbox');
  const status=document.createElement('div');
  status.setAttribute('role','status');
  status.textContent='Nenhum contato selecionado.';
  const call=document.createElement('button');
  call.type='button';call.textContent='Abrir discador';
  call.disabled=true;
  wrapper.append(heading,search,searchButton,results,status,call);
  preview.root.appendChild(wrapper);
  let chosen=null;
  const phonePattern=/^\+[1-9][0-9]{7,14}$/;

  function clear(){
    chosen=null;
    call.disabled=true;
    results.replaceChildren();
  }
  search.addEventListener('input',()=>{clear(); status.textContent='Busque e selecione um contato autorizado.';});
  async function findContacts(){
    clear();
    const name=search.value.trim();
    if(name.length<2){status.textContent='Informe pelo menos dois caracteres.';return;}
    if(typeof client.auth?.getSession!=='function'){
      status.textContent='Faça login na homologação.';return;
    }
    const {data:auth,error:authError}=await client.auth.getSession();
    const userId=auth?.session?.user?.id;
    if(authError || !userId){status.textContent='Sessão de homologação inválida.';return;}
    searchButton.disabled=true;
    try{
      // Exact name, no interpolation into SQL, RLS plus explicit ownership.
      const query=client.from('planes_user_contacts').select('id,display_name,phone_e164')
        .eq('user_id',userId).eq('display_name',name).limit(10);
      const {data,error}=await query;
      if(error)throw Error(error.message || 'Consulta recusada');
      const records=Array.isArray(data)?data.filter(item=>
        item && typeof item.display_name==='string' &&
        typeof item.phone_e164==='string' && phonePattern.test(item.phone_e164)):[];
      if(records.length===0){status.textContent='Contato não localizado na sua lista.';return;}
      for(const record of records){
        const choice=document.createElement('button');
        choice.type='button';
        choice.textContent=record.display_name+' · '+record.phone_e164;
        choice.addEventListener('click',()=>{
          chosen={id:record.id,name:record.display_name,phone:record.phone_e164};
          call.disabled=false;
          status.textContent='Contato selecionado: '+chosen.name+' ('+chosen.phone+'). Confirme para abrir o discador.';
        });
        results.appendChild(choice);
      }
      status.textContent='Selecione o contato correto antes de abrir o discador.';
    }catch(error){status.textContent='Falha na busca: '+String(error?.message||error);}
    finally{searchButton.disabled=false;}
  }
  function openDialer(){
    // This function is reachable only via the real user's click on the call button.
    if(!chosen || !phonePattern.test(chosen.phone))return;
    window.location.href='tel:'+chosen.phone;
    status.textContent='Discador solicitado. A ligação depende de confirmação no dispositivo.';
  }
  searchButton.addEventListener('click',()=>{void findContacts();});
  call.addEventListener('click',openDialer);
  function suggestContact(target){
    clear();
    search.value=String(target || '').trim().slice(0,120);
    status.textContent='Nome sugerido. Busque, selecione e confirme antes de ligar.';
  }
  window.planesStagingContacts={findContacts,suggestContact,wrapper};
})();
