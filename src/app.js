import { project, initialState } from './data.js';
import { calculateKpis, calculateExecutiveMetrics, updateProgress, addRestriction, closeRestriction } from './domain.js';

const STORAGE_KEY = 'planes-japaratinga-mvp-v1';
const app = document.querySelector('#app');
const title = document.querySelector('#page-title');
const budgetStatusEl = document.querySelector('#header-budget-status');
const scheduleStatusEl = document.querySelector('#header-schedule-status');
let state = loadState();

const EXECUTIVE_SCENARIO = {
  budget: { baseline: 42800000, forecast: 41900000, actual: 24600000, plannedToDate: 25400000 },
  schedule: { plannedStart:'2026-03-02', contractualEnd:'2026-11-30', forecastEnd:'2026-12-12', asOf:'2026-09-01', plannedProgress:63, actualProgress:57 }
};

function loadState(){
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || structuredClone(initialState); }
  catch { return structuredClone(initialState); }
}
function persist(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function pct(v){ return `${Math.round(v)}%`; }
function statusClass(status){ return status === 'Em atraso' ? 'bad' : status === 'Concluída' ? 'good' : ''; }
function brl(v){ return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}).format(v); }
function compactBrl(v){ return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',notation:'compact',maximumFractionDigits:1}).format(v); }
function datePt(iso){ return new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'UTC'}).format(new Date(`${iso}T00:00:00Z`)); }
function signedPct(v){ return `${v > 0 ? '+' : ''}${Number(v).toLocaleString('pt-BR',{maximumFractionDigits:1})}%`; }
function signedDays(v){ return v < 0 ? `${Math.abs(v)} dias adiantada` : v > 0 ? `${v} dias de atraso` : 'no prazo'; }
function toneFromVariance(v, inverse=false){ const good=inverse ? v<=0 : v>=0; return v===0 ? '' : good ? 'good' : 'bad'; }

function renderDashboard(){
  const k = calculateKpis(state);
  const executive = calculateExecutiveMetrics({
    budget: EXECUTIVE_SCENARIO.budget,
    schedule: { ...EXECUTIVE_SCENARIO.schedule, actualProgress:k.physicalProgress }
  });
  const budgetTone = toneFromVariance(executive.budgetVariance,true);
  const scheduleTone = toneFromVariance(executive.scheduleVarianceDays,true);
  const progressTone = toneFromVariance(executive.progressVariancePct);
  if(budgetStatusEl){ budgetStatusEl.textContent=executive.budgetStatus; budgetStatusEl.className=budgetTone; }
  if(scheduleStatusEl){ scheduleStatusEl.textContent=executive.scheduleStatus; scheduleStatusEl.className=scheduleTone; }

  const fronts = [...new Set(state.activities.map(a=>a.front))].map(front=>{
    const items=state.activities.filter(a=>a.front===front);
    return {front,progress:items.reduce((s,a)=>s+a.progress,0)/items.length};
  }).sort((a,b)=>a.progress-b.progress);
  const critical = state.activities.filter(a=>a.priority==='Crítica' || a.status==='Em atraso').slice(0,4);
  const financialProgress = Math.round((EXECUTIVE_SCENARIO.budget.actual / EXECUTIVE_SCENARIO.budget.baseline) * 100);

  app.innerHTML = `
    <div class="executive-hero">
      <div class="executive-hero-main">
        <span class="badge">Visão executiva · cenário demonstrativo</span>
        <h2>${project.name}</h2>
        <p>Prazo, orçamento e produção reunidos em uma leitura única para apoiar decisões de engenharia e gestão.</p>
      </div>
      <div class="executive-summary">
        <div class="summary-item"><span>Orçamento</span><strong class="${budgetTone}">${executive.budgetStatus}</strong></div>
        <div class="summary-item"><span>Prazo</span><strong class="${scheduleTone}">${signedDays(executive.scheduleVarianceDays)}</strong></div>
        <div class="summary-item"><span>Avanço</span><strong class="${progressTone}">${signedPct(executive.progressVariancePct)} vs. planejado</strong></div>
      </div>
    </div>

    <div class="exec-grid">
      <div class="card exec-card"><div class="label">Orçamento contratado</div><div class="value">${compactBrl(EXECUTIVE_SCENARIO.budget.baseline)}</div><div class="sub">meta financeira de referência</div></div>
      <div class="card exec-card"><div class="label">Previsão ao término</div><div class="value">${compactBrl(EXECUTIVE_SCENARIO.budget.forecast)}</div><div class="sub">estimativa atual do custo final</div></div>
      <div class="card exec-card"><div class="label">Variação orçamentária</div><div class="value ${budgetTone}">${executive.budgetVariance < 0 ? '−' : '+'}${compactBrl(Math.abs(executive.budgetVariance))}</div><div class="sub">${signedPct(executive.budgetVariancePct)} sobre o orçamento geral</div></div>
      <div class="card exec-card"><div class="label">Custo realizado</div><div class="value">${compactBrl(EXECUTIVE_SCENARIO.budget.actual)}</div><div class="sub">planejado até hoje: ${compactBrl(EXECUTIVE_SCENARIO.budget.plannedToDate)}</div></div>
      <div class="card exec-card"><div class="label">Previsão de término</div><div class="value ${scheduleTone}">${datePt(EXECUTIVE_SCENARIO.schedule.forecastEnd)}</div><div class="sub">contratual: ${datePt(EXECUTIVE_SCENARIO.schedule.contractualEnd)}</div></div>
      <div class="card exec-card"><div class="label">Desvio de prazo</div><div class="value ${scheduleTone}">${executive.scheduleVarianceDays > 0 ? '+' : ''}${executive.scheduleVarianceDays} dias</div><div class="sub">${executive.remainingDays} dias restantes na projeção</div></div>
    </div>

    <div class="executive-strip">
      <div class="card executive-block">
        <div class="executive-block-head"><div><span>Meta financeira</span><strong>Orçamento geral</strong></div><strong class="${budgetTone}">${executive.budgetStatus}</strong></div>
        <div class="metric-line"><label>Orçamento total</label><div class="metric-track"><span style="width:100%"></span></div><strong>100%</strong></div>
        <div class="metric-line financial"><label>Custo realizado</label><div class="metric-track"><span style="width:${Math.min(100,financialProgress)}%"></span></div><strong>${financialProgress}%</strong></div>
        <div class="metric-line actual"><label>Planejado até hoje</label><div class="metric-track"><span style="width:${Math.min(100,Math.round(EXECUTIVE_SCENARIO.budget.plannedToDate/EXECUTIVE_SCENARIO.budget.baseline*100))}%"></span></div><strong>${Math.round(EXECUTIVE_SCENARIO.budget.plannedToDate/EXECUTIVE_SCENARIO.budget.baseline*100)}%</strong></div>
        <div class="executive-note">Diferença entre custo realizado e planejado até a data: <strong>${executive.spendVariance <= 0 ? '−' : '+'}${brl(Math.abs(executive.spendVariance))}</strong>. Valores financeiros desta tela são demonstrativos até integração com orçamento/medições oficiais.</div>
      </div>
      <div class="card executive-block">
        <div class="executive-block-head"><div><span>Tempo de execução</span><strong>Planejado × realizado</strong></div><strong class="${scheduleTone}">${executive.scheduleStatus}</strong></div>
        <div class="metric-line"><label>Avanço planejado</label><div class="metric-track"><span style="width:${EXECUTIVE_SCENARIO.schedule.plannedProgress}%"></span></div><strong>${EXECUTIVE_SCENARIO.schedule.plannedProgress}%</strong></div>
        <div class="metric-line actual"><label>Avanço realizado</label><div class="metric-track"><span style="width:${k.physicalProgress}%"></span></div><strong>${k.physicalProgress}%</strong></div>
        <div class="metric-line financial"><label>Tempo transcorrido</label><div class="metric-track"><span style="width:${Math.min(100,Math.round(executive.elapsedDays/executive.totalPlannedDays*100))}%"></span></div><strong>${Math.round(executive.elapsedDays/executive.totalPlannedDays*100)}%</strong></div>
        <div class="executive-note">Início planejado em ${datePt(EXECUTIVE_SCENARIO.schedule.plannedStart)}. A projeção indica <strong class="${scheduleTone}">${signedDays(executive.scheduleVarianceDays)}</strong> frente ao término contratual.</div>
      </div>
    </div>

    <div class="section-title"><h3>Indicadores operacionais</h3><span>estrutura real + cenário demonstrativo</span></div>
    <div class="kpi-grid">
      <div class="card kpi"><div class="label">Avanço físico</div><div class="value">${pct(k.physicalProgress)}</div><div class="sub">realizado atual</div></div>
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
document.querySelectorAll('.nav-item').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.nav-item').forEach(b=>b.classList.remove('active'));btn.classList.add('active');title.textContent=btn.querySelector('.nav-text')?.textContent||btn.textContent.trim();views[btn.dataset.view]();}));
persist(); renderDashboard();
