import { project, initialState } from './data.js';
import { calculateKpis, updateProgress, addRestriction, closeRestriction } from './domain.js';

const STORAGE_KEY = 'planes-japaratinga-mvp-v1';
const app = document.querySelector('#app');
const title = document.querySelector('#page-title');
let state = loadState();

function loadState(){
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || structuredClone(initialState); }
  catch { return structuredClone(initialState); }
}
function persist(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function pct(v){ return `${Math.round(v)}%`; }
function statusClass(status){ return status === 'Em atraso' ? 'bad' : status === 'Concluída' ? 'good' : ''; }

function renderDashboard(){
  const k = calculateKpis(state);
  const fronts = [...new Set(state.activities.map(a=>a.front))].map(front=>{
    const items=state.activities.filter(a=>a.front===front);
    return {front,progress:items.reduce((s,a)=>s+a.progress,0)/items.length};
  }).sort((a,b)=>a.progress-b.progress);
  const critical = state.activities.filter(a=>a.priority==='Crítica' || a.status==='Em atraso').slice(0,4);
  app.innerHTML = `
    <div class="hero"><div><span class="badge">Obra piloto · estrutura real + cenário demonstrativo</span><h2>${project.name}</h2><p>Uma visão única do planejamento, execução e decisões críticas da obra.</p></div><div class="badge">Baseline: ${project.baseline}</div></div>
    <div class="kpi-grid">
      <div class="card kpi"><div class="label">Avanço físico</div><div class="value">${pct(k.physicalProgress)}</div><div class="sub">indicador do cenário demonstrativo</div></div>
      <div class="card kpi"><div class="label">Aderência semanal</div><div class="value">${pct(k.weeklyAdherence)}</div><div class="sub">compromissos concluídos</div></div>
      <div class="card kpi"><div class="label">Atividades em atraso</div><div class="value trend bad">${k.delayed}</div><div class="sub">requerem ação da engenharia</div></div>
      <div class="card kpi"><div class="label">Restrições abertas</div><div class="value">${k.openRestrictions}</div><div class="sub">impedimentos registrados</div></div>
    </div>
    <div class="grid-2">
      <div class="card panel"><h3>Avanço por frente</h3>${fronts.map(f=>`<div class="progress-row"><div class="row-head"><span>${f.front}</span><strong>${pct(f.progress)}</strong></div><div class="bar"><span style="width:${f.progress}%"></span></div></div>`).join('')}</div>
      <div class="card panel"><h3>Atenções para decisão</h3>${critical.map(a=>`<div class="decision"><span class="severity ${a.priority==='Crítica'?'high':'med'}"></span><div><strong>${a.name}</strong><p>${a.location} · ${a.status} · ${a.progress}% executado</p></div><time>${a.plannedEnd}</time></div>`).join('')}</div>
    </div>`;
}

function renderLineBalance(){
  const fronts=['ARENA','INFRA','BLOCO APTOS','PRÉDIOS','ÁREA DA PISCINA'];
  const min=new Date('2026-08-01'), max=new Date('2026-10-15'), span=max-min;
  const rows=state.activities.filter(a=>fronts.includes(a.front));
  app.innerHTML=`<div class="hero"><div><span class="badge">Planejamento-base</span><h2>Linha de Balanço digital</h2><p>Atividades por frente e janela temporal, preservando a lógica visual da planilha original.</p></div></div>
  <div class="filter-row">${fronts.map(f=>`<span class="filter-chip">${f}</span>`).join('')}</div>
  <div class="card timeline"><div class="timeline-head"><span>Atividade / frente</span><span>Ago</span><span>Set</span><span>Out</span></div>${rows.map(a=>{const st=Math.max(0,(new Date(a.plannedStart)-min)/span*100);const en=Math.min(100,(new Date(a.plannedEnd)-min)/span*100);return `<div class="timeline-row"><div class="timeline-label"><strong>${a.location}</strong><span>${a.name}</span></div><div class="timeline-track"><span class="timeline-bar ${statusClass(a.status)}" style="left:${st}%;width:${Math.max(2,en-st)}%"><em>${a.progress}%</em></span></div></div>`}).join('')}</div>`;
}

function renderLookahead(){
  const weeks=[
    {label:'31 AGO — 06 SET',from:'2026-08-31',to:'2026-09-06'},
    {label:'07 — 13 SET',from:'2026-09-07',to:'2026-09-13'},
    {label:'14 — 20 SET',from:'2026-09-14',to:'2026-09-20'},
    {label:'21 — 27 SET',from:'2026-09-21',to:'2026-09-27'}
  ];
  app.innerHTML=`<div class="hero"><div><span class="badge">Lookahead 2–6 semanas</span><h2>Médio Prazo</h2><p>Compromissos, atividades e restrições das próximas semanas.</p></div></div><div class="week-grid">${weeks.map(w=>{const items=state.activities.filter(a=>a.plannedStart<=w.to&&a.plannedEnd>=w.from);return `<div class="card week-col"><h3>${w.label}</h3><span class="week-count">${items.length} atividades</span>${items.slice(0,8).map(a=>`<div class="task-card ${statusClass(a.status)}"><small>${a.front}</small><strong>${a.name}</strong><span>${a.location} · ${a.progress}%</span></div>`).join('')||'<p class="muted">Sem atividades</p>'}</div>`}).join('')}</div>`;
}

function renderWeeklyPlan(){
  const byId=Object.fromEntries(state.activities.map(a=>[a.id,a]));
  const k=calculateKpis(state);
  app.innerHTML=`<div class="hero"><div><span class="badge">Semana 31/08–06/09</span><h2>Plano Semanal</h2><p>Compromissos reais da produção e situação de cada atividade.</p></div><div class="badge">Aderência: ${k.weeklyAdherence}%</div></div><div class="card table-wrap"><table><thead><tr><th>Frente</th><th>Atividade</th><th>Compromisso</th><th>Progresso</th><th>Status</th></tr></thead><tbody>${state.weeklyPlan.map(item=>{const a=byId[item.activityId];return `<tr><td>${a.front}</td><td><strong>${a.name}</strong><small>${a.location}</small></td><td>${item.commitment}</td><td><div class="mini-progress"><span style="width:${a.progress}%"></span></div>${a.progress}%</td><td><span class="status-pill ${statusClass(a.status)}">${a.status}</span></td></tr>`}).join('')}</tbody></table></div>`;
}

function renderProduction(){
  const active=state.activities.filter(a=>a.status!=='Concluída');
  app.innerHTML=`<div class="hero"><div><span class="badge">Apontamento de campo</span><h2>Produção</h2><p>Registre avanço executado diretamente no celular ou desktop. O dado atualiza o painel do MVP.</p></div></div>
  <div class="grid-2"><form id="production-form" class="card form-card"><h3>Novo apontamento</h3><label>Atividade<select name="activityId" required>${active.map(a=>`<option value="${a.id}">${a.front} · ${a.name}</option>`).join('')}</select></label><div class="form-grid"><label>Progresso executado (%)<input name="progress" type="number" min="0" max="100" required value="50"></label><label>Responsável<input name="actor" value="Equipe de Campo" required></label></div><label>Observação<textarea name="note" rows="3" placeholder="Produção, equipe, material ou ocorrência relevante"></textarea></label><button class="primary" type="submit">Registrar produção</button><div id="form-feedback" class="feedback"></div></form>
  <div class="card panel"><h3>Últimos apontamentos</h3>${state.history.filter(h=>h.type==='production').slice(-8).reverse().map(h=>{const a=state.activities.find(x=>x.id===h.activityId);return `<div class="activity-log"><strong>${a?.name||h.activityId}</strong><span>${h.progress}% · ${h.actor}</span><small>${new Date(h.at).toLocaleString('pt-BR')}</small></div>`}).join('')||'<p class="muted">Nenhum apontamento realizado nesta sessão.</p>'}</div></div>`;
  document.querySelector('#production-form').addEventListener('submit',handleProductionSubmit);
}

function handleProductionSubmit(event){
  event.preventDefault();
  const fd=new FormData(event.currentTarget);
  state=updateProgress(state,fd.get('activityId'),Number(fd.get('progress')),fd.get('actor'));
  persist();
  renderProduction();
  const fb=document.querySelector('#form-feedback'); if(fb){fb.textContent='Apontamento registrado e indicadores atualizados.';fb.classList.add('show');}
}

function renderRestrictions(){
  const active=state.activities.filter(a=>a.status!=='Concluída');
  const open=state.restrictions.filter(r=>r.status==='Aberta');
  app.innerHTML=`<div class="hero"><div><span class="badge">Gestão por exceção</span><h2>Restrições</h2><p>Impedimentos com responsável, criticidade e prazo para liberação.</p></div><div class="badge">${open.length} abertas</div></div>
  <div class="grid-2"><div class="card panel"><h3>Restrições abertas</h3>${open.map(r=>{const a=state.activities.find(x=>x.id===r.activityId);return `<div class="restriction"><span class="severity ${r.severity==='Alta'?'high':'med'}"></span><div><strong>${r.title}</strong><p>${a?.front||''} · ${a?.location||''}</p><small>${r.owner} · prazo ${r.dueDate}</small></div><button class="ghost close-restriction" data-id="${r.id}">Encerrar</button></div>`}).join('')||'<p class="muted">Sem restrições abertas.</p>'}</div>
  <form id="restriction-form" class="card form-card"><h3>Nova restrição</h3><label>Título<input name="title" required placeholder="Ex.: material aguardando compra"></label><label>Atividade<select name="activityId" required>${active.map(a=>`<option value="${a.id}">${a.front} · ${a.name}</option>`).join('')}</select></label><div class="form-grid"><label>Criticidade<select name="severity"><option>Alta</option><option>Média</option><option>Baixa</option></select></label><label>Responsável<input name="owner" required value="Engenharia"></label></div><label>Prazo<input name="dueDate" type="date" required value="2026-09-05"></label><button class="primary" type="submit">Abrir restrição</button></form></div>`;
  document.querySelector('#restriction-form').addEventListener('submit',handleRestrictionSubmit);
  document.querySelectorAll('.close-restriction').forEach(b=>b.addEventListener('click',()=>{state=closeRestriction(state,b.dataset.id);persist();renderRestrictions();}));
}

function handleRestrictionSubmit(event){
  event.preventDefault(); const fd=new FormData(event.currentTarget);
  state=addRestriction(state,{title:fd.get('title'),activityId:fd.get('activityId'),severity:fd.get('severity'),owner:fd.get('owner'),dueDate:fd.get('dueDate')});
  persist(); renderRestrictions();
}

function renderReports(){
  const k=calculateKpis(state);
  app.innerHTML=`<div class="hero"><div><span class="badge">Relatórios executivos</span><h2>Relatórios</h2><p>Resumo consolidado do estado atual do MVP e exportação local dos dados normalizados.</p></div></div>
  <div class="grid-2"><div class="card panel"><h3>Resumo da obra</h3><div class="report-metrics"><div><span>Avanço físico</span><strong>${k.physicalProgress}%</strong></div><div><span>Aderência semanal</span><strong>${k.weeklyAdherence}%</strong></div><div><span>Em atraso</span><strong>${k.delayed}</strong></div><div><span>Restrições abertas</span><strong>${k.openRestrictions}</strong></div></div></div><div class="card panel"><h3>Ações</h3><p class="muted">Exporte as atividades atuais em CSV ou restaure o cenário inicial da demonstração.</p><div class="action-row"><button id="export-csv" class="primary">Exportar CSV</button><button id="reset-demo" class="ghost">Restaurar dados</button></div></div></div>`;
  document.querySelector('#export-csv').addEventListener('click',exportCsv);
  document.querySelector('#reset-demo').addEventListener('click',resetDemo);
}

function exportCsv(){
  const header=['Frente','Localização','Disciplina','Atividade','Início','Fim','Status','Progresso','Responsável'];
  const rows=state.activities.map(a=>[a.front,a.location,a.discipline,a.name,a.plannedStart,a.plannedEnd,a.status,a.progress,a.owner]);
  const csv=[header,...rows].map(row=>row.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(';')).join('\n');
  const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='planes-japaratinga-atividades.csv'; a.click(); URL.revokeObjectURL(url);
}

function resetDemo(){
  state=structuredClone(initialState); persist(); renderReports();
}

const views={dashboard:renderDashboard,balance:renderLineBalance,lookahead:renderLookahead,weekly:renderWeeklyPlan,production:renderProduction,restrictions:renderRestrictions,reports:renderReports};
document.querySelectorAll('.nav-item').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.nav-item').forEach(b=>b.classList.remove('active'));btn.classList.add('active');title.textContent=btn.textContent;views[btn.dataset.view]();}));
persist(); renderDashboard();
