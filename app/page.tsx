'use client';

import { FormEvent, useEffect, useState } from 'react';
import { activities as initialActivities, constraints as initialConstraints, navItems, type Activity } from './data';
import { PLANES_ICON_B64, PLANES_LOGO_B64 } from './brand-assets';

type UserRole = 'Engenharia' | 'Campo' | 'Diretoria';
type User = { name: string; role: UserRole; avatar: string };
type Entry = {
  id: string;
  activityId: string;
  quantity: number;
  kind: 'Produção' | 'Material' | 'Impedimento';
  note: string;
  status: 'Pendente' | 'Aprovado' | 'Devolvido';
  date: string;
};

const USERS_DB: Record<string, { password: string; user: User }> = {
  'engenharia@planes.demo': { password: 'Planes2026!', user: { name: 'Mariana Alves', role: 'Engenharia', avatar: 'MA' } },
  'campo@planes.demo': { password: 'Planes2026!', user: { name: 'Carlos Lima', role: 'Campo', avatar: 'CL' } },
  'diretoria@planes.demo': { password: 'Planes2026!', user: { name: 'Ricardo Nunes', role: 'Diretoria', avatar: 'RN' } }
};

// S-Curve monthly chart data points for interactive editorial inspection
const SCURVE_DATA = [
  { month: 'Mar', plan: 8.2, real: 8.0, x: 30, yPlan: 185, yReal: 185 },
  { month: 'Abr', plan: 17.5, real: 16.8, x: 105, yPlan: 168, yReal: 170 },
  { month: 'Mai', plan: 29.0, real: 27.2, x: 180, yPlan: 145, yReal: 148 },
  { month: 'Jun', plan: 42.4, real: 39.5, x: 255, yPlan: 118, yReal: 124 },
  { month: 'Jul', plan: 55.0, real: 51.0, x: 330, yPlan: 92, yReal: 100 },
  { month: 'Ago', plan: 66.4, real: 61.8, x: 405, yPlan: 70, yReal: 78, isCurrent: true },
  { month: 'Set', plan: 78.0, real: null, x: 480, yPlan: 46, yReal: null },
  { month: 'Out', plan: 90.5, real: null, x: 555, yPlan: 24, yReal: null },
  { month: 'Nov', plan: 100.0, real: null, x: 630, yPlan: 5, yReal: null }
];

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('engenharia@planes.demo');
  const [password, setPassword] = useState('Planes2026!');
  const [loginError, setLoginError] = useState('');
  const [view, setView] = useState('dashboard');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [constraints, setConstraints] = useState(initialConstraints);
  const [toast, setToast] = useState('');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [lookaheadWeeks, setLookaheadWeeks] = useState(4);
  const [modalMode, setModalMode] = useState<'Produção' | 'Material' | 'Impedimento' | 'NovaRestricao' | null>(null);
  const [selectedActivityId, setSelectedActivityId] = useState(initialActivities[4].id);
  const [entryQty, setEntryQty] = useState('10');
  const [entryNote, setEntryNote] = useState('');
  const [activeCurvePoint, setActiveCurvePoint] = useState<typeof SCURVE_DATA[0] | null>(SCURVE_DATA[5]);

  useEffect(() => {
    try {
      const rawEntries = localStorage.getItem('planes:v1:entries');
      if (rawEntries) setEntries(JSON.parse(rawEntries));
      else {
        const defaultEntries: Entry[] = [
          { id: 'e1', activityId: 'a6', quantity: 15, kind: 'Produção', note: 'Executado 15m² de alvenaria no 2º pavimento', status: 'Pendente', date: 'Hoje' },
          { id: 'e2', activityId: 'a7', quantity: 8, kind: 'Produção', note: 'Reboco iniciado no dormitório 102', status: 'Pendente', date: 'Hoje' }
        ];
        setEntries(defaultEntries);
        localStorage.setItem('planes:v1:entries', JSON.stringify(defaultEntries));
      }

      const session = localStorage.getItem('planes:v1:session');
      if (session) {
        const parsed = JSON.parse(session);
        setUser(parsed);
        setView(parsed.role === 'Campo' ? 'field' : 'dashboard');
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (entries.length > 0) {
      localStorage.setItem('planes:v1:entries', JSON.stringify(entries));
    }
  }, [entries]);

  function notify(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3200);
  }

  function login(e: FormEvent) {
    e.preventDefault();
    const found = USERS_DB[email];
    if (!found || found.password !== password) {
      setLoginError('E-mail ou senha inválidos.');
      return;
    }
    setUser(found.user);
    localStorage.setItem('planes:v1:session', JSON.stringify(found.user));
    setView(found.user.role === 'Campo' ? 'field' : 'dashboard');
    notify(`Bem-vindo, ${found.user.name}!`);
  }

  function switchRole(emailKey: string) {
    const found = USERS_DB[emailKey];
    if (found) {
      setUser(found.user);
      localStorage.setItem('planes:v1:session', JSON.stringify(found.user));
      setView(found.user.role === 'Campo' ? 'field' : 'dashboard');
      notify(`Alternado para perfil: ${found.user.name} (${found.user.role})`);
    }
  }

  function logout() {
    setUser(null);
    localStorage.removeItem('planes:v1:session');
  }

  function handleCreateEntry(e: FormEvent) {
    e.preventDefault();
    if (!modalMode || modalMode === 'NovaRestricao') return;
    const newEntry: Entry = {
      id: 'e' + Date.now(),
      activityId: selectedActivityId,
      quantity: Number(entryQty) || 1,
      kind: modalMode,
      note: entryNote || `Apontamento de ${modalMode}`,
      status: 'Pendente',
      date: 'Hoje'
    };
    setEntries([newEntry, ...entries]);
    setModalMode(null);
    setEntryQty('10');
    setEntryNote('');
    notify(`✓ Apontamento de ${modalMode} enviado para validação da Engenharia!`);
  }

  function handleDecideEntry(id: string, decision: 'Aprovado' | 'Devolvido') {
    setEntries(entries.map(e => e.id === id ? { ...e, status: decision } : e));
    notify(decision === 'Aprovado' ? '✓ Apontamento aprovado e indicadores consolidados!' : 'Apontamento devolvido ao campo.');
  }

  if (!user) {
    return <LoginView email={email} setEmail={setEmail} password={password} setPassword={setPassword} error={loginError} onLogin={login} onQuickDemo={switchRole} />;
  }

  const pendingCount = entries.filter(e => e.status === 'Pendente').length;
  const availableNav = navItems.filter(([id]) => user.role !== 'Campo' || ['field', 'weekly', 'constraints', 'lookahead'].includes(id));

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col md:flex-row text-slate-800 antialiased selection:bg-[#38bdf8] selection:text-white">
      
      {/* Sidebar */}
      <aside className={`fixed md:sticky top-0 z-40 h-screen w-64 bg-[#09202c] text-white flex flex-col shrink-0 border-r border-slate-800/80 transition-transform duration-300 ${mobileMenu ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <!-- Brand Header -->
        <div className="h-20 flex items-center justify-between px-6 border-b border-white/10 bg-[#051620]">
          <div className="flex items-center gap-3">
            <img src={PLANES_ICON_B64} alt="Planes Icon" className="w-8 h-8 rounded-lg shadow-sm" />
            <div>
              <span className="font-bold text-white text-base tracking-wider block leading-none">PLANES</span>
              <span className="text-[8px] tracking-widest text-[#38bdf8] uppercase font-bold block mt-1">Engenharia Inteligente</span>
            </div>
          </div>
          <button onClick={() => setMobileMenu(false)} className="md:hidden text-slate-400 hover:text-white text-lg">✕</button>
        </div>

        <!-- Pilot Project Box -->
        <div className="m-4 p-3.5 rounded-xl bg-white/5 border border-white/10">
          <span className="eyebrow text-[#38bdf8] block">Obra Piloto</span>
          <strong className="text-xs text-white block mt-1 font-semibold">Japaratinga Resort</strong>
          <span className="text-[10px] text-slate-400 block mt-0.5">Expansão 3 · Alagoas</span>
        </div>

        <!-- Navigation -->
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {availableNav.map(([id, label, icon]) => {
            const isActive = view === id;
            const badge = id === 'validation' && pendingCount > 0 ? (
              <span className="ml-auto bg-[#f59e0b] text-[#09202c] text-[10px] font-bold px-2 py-0.5 rounded-full">{pendingCount}</span>
            ) : null;
            return (
              <button
                key={id}
                onClick={() => { setView(id); setMobileMenu(false); }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition text-left ${
                  isActive ? 'bg-white/15 text-white font-semibold border-l-4 border-[#38bdf8] shadow-inner' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className="text-base w-5 text-center">{icon}</span>
                <span>{label}</span>
                {badge}
              </button>
            );
          })}
        </nav>

        <!-- User Profile Footer -->
        <div className="p-4 border-t border-white/10 flex items-center justify-between bg-black/20">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-cyan-200 text-[#09202c] font-bold text-xs flex items-center justify-center shrink-0">
              {user.avatar}
            </div>
            <div className="min-w-0">
              <strong className="text-xs text-white block truncate">{user.name}</strong>
              <span className="text-[10px] text-slate-400 block">{user.role}</span>
            </div>
          </div>
          <button onClick={logout} title="Sair da conta" className="text-slate-400 hover:text-white text-xs p-1.5 rounded hover:bg-white/10 transition">
            Sair ↗
          </button>
        </div>
      </aside>

      {mobileMenu && <div onClick={() => setMobileMenu(false)} className="fixed inset-0 bg-black/50 z-30 md:hidden" />}

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#f8fafc]">
        {/* Floating Top Bar */}
        <header className="h-16 bg-white border-b border-[#e2e8f0] px-4 md:px-8 flex items-center justify-between sticky top-0 z-20 shadow-xs">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileMenu(true)} className="md:hidden p-2 rounded-lg border border-slate-200 text-slate-700">☰</button>
            <div className="flex items-center gap-3">
              <img src={PLANES_LOGO_B64} alt="Planes ENG" className="h-7 w-auto hidden sm:block object-contain" />
              <span className="text-xs font-semibold text-slate-500 border-l border-slate-200 pl-3 hidden md:inline">Japaratinga Resort – Expansão 3</span>
            </div>
          </div>

          <!-- Quick Role Switcher -->
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 hidden lg:inline">Alternar Perfil:</span>
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <button
                onClick={() => switchRole('engenharia@planes.demo')}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${user.role === 'Engenharia' ? 'bg-white text-[#09202c] shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Engenharia
              </button>
              <button
                onClick={() => switchRole('campo@planes.demo')}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${user.role === 'Campo' ? 'bg-white text-[#09202c] shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Campo
              </button>
              <button
                onClick={() => switchRole('diretoria@planes.demo')}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${user.role === 'Diretoria' ? 'bg-white text-[#09202c] shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Diretoria
              </button>
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <main className="flex-1 p-4 md:p-8 max-w-6xl w-full mx-auto animate-editorial-entry">
          {view === 'dashboard' && (
            <DashboardEditorialView
              entries={entries}
              setView={setView}
              activePoint={activeCurvePoint}
              setActivePoint={setActiveCurvePoint}
            />
          )}
          {view === 'field' && <FieldView onOpenModal={(mode, actId) => { setModalMode(mode); if (actId) setSelectedActivityId(actId); }} />}
          {view === 'validation' && <ValidationView entries={entries} onDecide={handleDecideEntry} />}
          {view === 'gantt' && <GanttView />}
          {view === 'balance' && <BalanceView />}
          {view === 'lookahead' && <LookaheadView weeks={lookaheadWeeks} setWeeks={setLookaheadWeeks} onPromote={() => notify('Atividade promovida para o plano semanal!')} />}
          {view === 'weekly' && <WeeklyView />}
          {view === 'constraints' && <ConstraintsView constraints={constraints} onNew={() => setModalMode('NovaRestricao')} />}
          {view === 'estrutura' && <StructureView />}
        </main>
      </div>

      {/* Entry Modal */}
      {modalMode && modalMode !== 'NovaRestricao' && (
        <div className="fixed inset-0 bg-[#09202c]/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 relative shadow-2xl border border-slate-200">
            <button onClick={() => setModalMode(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-lg">✕</button>
            <span className="eyebrow text-[#0c6a91] block">NOVO APONTAMENTO DE CAMPO</span>
            <h3 className="text-xl text-[#09202c] font-bold mt-1 mb-4">Registrar {modalMode}</h3>

            <form onSubmit={handleCreateEntry} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Atividade</label>
                <select value={selectedActivityId} onChange={e => setSelectedActivityId(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white">
                  {initialActivities.map(a => <option value={a.id} key={a.id}>{a.name} ({a.location})</option>)}
                </select>
              </div>

              {modalMode !== 'Impedimento' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Quantidade executada</label>
                  <input type="number" step="0.1" required value={entryQty} onChange={e => setEntryQty(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs" />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Observações do Canteiro</label>
                <textarea rows={3} placeholder="Descreva os serviços realizados ou motivo do bloqueio..." value={entryNote} onChange={e => setEntryNote(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Foto da Obra</label>
                <div className="border-2 border-dashed border-slate-300 hover:border-[#0c6a91] hover:bg-cyan-50/50 rounded-xl p-3.5 text-center text-xs text-[#0c6a91] cursor-pointer transition">
                  📷 Clique para anexar registro fotográfico
                </div>
              </div>

              <button type="submit" className="w-full py-3 bg-[#0c6a91] hover:bg-[#09202c] text-white font-semibold text-xs rounded-xl transition shadow-sm mt-2">
                Enviar para Validação da Engenharia →
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#09202c] text-white px-5 py-3 rounded-xl shadow-2xl text-xs flex items-center gap-2 border border-white/10">
          <span className="text-emerald-400 font-bold text-sm">✓</span>
          <span>{toast}</span>
        </div>
      )}

    </div>
  );
}

/* =========================================================================
   EDITORIAL CHARTS SUB-VIEWS (AI in Design Report 2026 Reference)
========================================================================= */

function LoginView({ email, setEmail, password, setPassword, error, onLogin, onQuickDemo }: any) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f8fafc]">
      <div className="w-full md:w-1/2 bg-gradient-to-br from-[#051620] via-[#09202c] to-[#0e2b3b] text-white p-8 md:p-16 flex flex-col justify-between relative overflow-hidden">
        <div className="flex items-center gap-3">
          <img src={PLANES_ICON_B64} alt="Planes" className="w-10 h-10 rounded-xl shadow-md" />
          <div>
            <span className="font-bold text-white text-xl tracking-wider block leading-none font-sans">PLANES</span>
            <span className="text-[9px] tracking-widest text-[#38bdf8] uppercase font-bold block mt-1">Engenharia Inteligente</span>
          </div>
        </div>

        <div className="my-12 relative z-10">
          <span className="eyebrow text-[#38bdf8] block mb-3">PLATAFORMA DIGITAL DE GESTÃO DE OBRAS</span>
          <h1 className="text-3xl md:text-5xl leading-tight font-normal mb-4 font-editorial">
            Do planejamento ao canteiro.<br />
            <span className="text-[#38bdf8] italic">Do canteiro à decisão.</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-300 max-w-md leading-relaxed">
            Planejamento físico, fluxo contínuo de produção, gestão de restrições e inteligência operacional em tempo real.
          </p>
        </div>

        <div className="border-t border-white/15 pt-6 relative z-10">
          <span className="eyebrow text-[#38bdf8] block">Obra Piloto</span>
          <strong className="text-sm text-white block mt-1 font-semibold">Japaratinga Resort – Expansão 3</strong>
          <span className="text-xs text-slate-400 block mt-0.5">16 frentes monitoradas · Linha de balanço integrada</span>
        </div>
      </div>

      <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-12 bg-white">
        <div className="w-full max-w-md">
          <img src={PLANES_LOGO_B64} alt="Planes ENG" className="h-9 w-auto mb-6 object-contain" />
          <span className="eyebrow text-[#0c6a91] block">ACESSO RESTRITO</span>
          <h2 className="text-2xl md:text-3xl text-[#09202c] font-bold mt-1 mb-2 font-editorial">Bem-vindo à sua obra</h2>
          <p className="text-xs text-slate-500 mb-6">Acesse com suas credenciais ou selecione um perfil de demonstração:</p>

          <div className="mb-6 p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-2.5">Acesso Rápido de Demonstração</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button onClick={() => onQuickDemo('engenharia@planes.demo')} className="p-2.5 rounded-xl bg-white border border-slate-300 hover:border-[#38bdf8] hover:bg-cyan-50 text-left transition text-xs shadow-2xs">
                <strong className="block text-[#09202c]">Engenharia</strong>
                <span className="text-[10px] text-slate-500">Mariana Alves</span>
              </button>
              <button onClick={() => onQuickDemo('campo@planes.demo')} className="p-2.5 rounded-xl bg-white border border-slate-300 hover:border-[#38bdf8] hover:bg-cyan-50 text-left transition text-xs shadow-2xs">
                <strong className="block text-[#09202c]">Campo</strong>
                <span className="text-[10px] text-slate-500">Carlos Lima</span>
              </button>
              <button onClick={() => onQuickDemo('diretoria@planes.demo')} className="p-2.5 rounded-xl bg-white border border-slate-300 hover:border-[#38bdf8] hover:bg-cyan-50 text-left transition text-xs shadow-2xs">
                <strong className="block text-[#09202c]">Diretoria</strong>
                <span className="text-[10px] text-slate-500">Ricardo Nunes</span>
              </button>
            </div>
          </div>

          <form onSubmit={onLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">E-mail corporativo</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-[#0c6a91]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Senha</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-[#0c6a91]" />
            </div>
            {error && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">{error}</div>}
            <button type="submit" className="w-full py-3 bg-[#0c6a91] hover:bg-[#09202c] text-white font-semibold text-xs rounded-xl transition shadow-sm flex items-center justify-center gap-2">
              Entrar na Plataforma <span>→</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function DashboardEditorialView({ entries, setView, activePoint, setActivePoint }: any) {
  const pendingCount = entries.filter((e: any) => e.status === 'Pendente').length;
  const adherenceCircumference = 2 * Math.PI * 40; // r=40
  const adherenceOffset = adherenceCircumference * (1 - 0.78);

  return (
    <div className="space-y-6">
      {/* Title section with date filter badge */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <span className="eyebrow text-[#0c6a91] block">VISÃO EXECUTIVA · DATA STORYTELLING</span>
          <h1 className="text-2xl md:text-3xl text-[#09202c] font-bold mt-1 font-editorial">Painel Planes</h1>
        </div>
        <div className="text-xs bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-slate-600 font-medium self-start shadow-xs flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Semana 34 · 17–21 ago 2026</span>
        </div>
      </div>

      {/* Primary Status Banner */}
      <div className="editorial-dark p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="eyebrow text-slate-300">STATUS DA OBRA</span>
          <span className="bg-amber-400 text-[#051620] text-[10px] font-bold px-2.5 py-0.5 rounded-full">● Atenção</span>
        </div>
        <p className="text-xs text-slate-200 m-0">Ritmo abaixo do planejado em <strong>Bloco de Apartamentos</strong> e <strong>Área da Piscina</strong>. 4 restrições exigem decisão.</p>
        <span className="text-[10px] text-slate-400 font-mono">Consolidação: 21/08 · 17:40</span>
      </div>

      {/* Editorial Bento Metric Cards (with Animated Gauge) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: Physical Progress */}
        <div className="editorial-card p-5">
          <div className="flex justify-between text-xs text-slate-500 font-medium">
            <span>Avanço Físico Ponderado</span>
            <span className="text-slate-400 font-mono text-[10px]">EAP</span>
          </div>
          <div className="display-stat text-3xl text-[#09202c] my-2">61,8%</div>
          <div className="text-[11px] text-slate-500">Meta planejada: 66,4%</div>
          <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-rose-600 font-semibold flex items-center justify-between">
            <span>-4,6 p.p. de desvio</span>
            <span className="text-[10px] bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded">Atenção</span>
          </div>
        </div>

        {/* Metric 2: Weekly Adherence with Radial Gauge */}
        <div className="editorial-card p-5 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs text-slate-500 font-medium block">Aderência Semanal</span>
              <div className="display-stat text-3xl text-[#09202c] mt-2">78%</div>
              <span className="text-[11px] text-slate-500 block mt-0.5">18 de 23 cumpridos</span>
            </div>
            {/* SVG Mini Radial Gauge */}
            <div className="w-12 h-12 relative shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <circle cx="50" cy="50" r="40" className="gauge-circle-bg" />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className="gauge-circle-progress"
                  strokeDasharray={adherenceCircumference}
                  strokeDashoffset={adherenceOffset}
                />
              </svg>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-emerald-600 font-semibold">
            +6 p.p. vs semana anterior
          </div>
        </div>

        {/* Metric 3: Schedule Variance */}
        <div className="editorial-card p-5">
          <div className="flex justify-between text-xs text-slate-500 font-medium">
            <span>Variação de Prazo</span>
            <span className="text-slate-400 font-mono text-[10px]">GANTT</span>
          </div>
          <div className="display-stat text-3xl text-[#09202c] my-2">+18 dias</div>
          <div className="text-[11px] text-slate-500">Baseline: 30/11/2026</div>
          <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-amber-600 font-semibold">
            Tendência: 18/12/2026
          </div>
        </div>

        {/* Metric 4: Constraints & Decisions */}
        <div className="editorial-card p-5">
          <div className="flex justify-between text-xs text-slate-500 font-medium">
            <span>Restrições Abertas</span>
            <span className="text-slate-400 font-mono text-[10px]">LOOKAHEAD</span>
          </div>
          <div className="display-stat text-3xl text-[#09202c] my-2">12</div>
          <div className="text-[11px] text-slate-500">4 vencidas · 5 críticas</div>
          <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-amber-600 font-semibold">
            3 liberadas nesta semana
          </div>
        </div>

      </div>

      {/* Main Editorial Charts: Interactive S-Curve + Priority Decisions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Editorial S-Curve Chart */}
        <div className="lg:col-span-2 editorial-card p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <span className="eyebrow text-slate-400 block">EDITORIAL CHART · JSON DRIVEN</span>
              <h3 className="text-lg text-[#09202c] font-bold font-editorial">Curva S de Avanço Físico</h3>
            </div>
            
            {/* Active inspection point indicator */}
            {activePoint && (
              <div className="text-xs bg-slate-900 text-white px-3 py-1.5 rounded-lg font-mono flex items-center gap-2 shadow-xs">
                <span className="text-cyan-400 font-bold">{activePoint.month}/26:</span>
                <span>Real: {activePoint.real !== null ? activePoint.real + '%' : '—'}</span>
                <span className="text-slate-400">| Plan: {activePoint.plan}%</span>
              </div>
            )}
          </div>

          <div className="h-56 relative mt-2">
            <svg viewBox="0 0 700 220" preserveAspectRatio="none" className="w-full h-48 overflow-visible">
              <defs>
                <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              <!-- Gridlines -->
              <path className="chart-gridline" d="M0 45H700M0 90H700M0 135H700M0 180H700" />

              <!-- Gradient Area fill under actual progress -->
              <path
                className="chart-area-fill"
                d="M 30 185 L 105 170 L 180 148 L 255 124 L 330 100 L 405 78 L 405 210 L 30 210 Z"
              />

              <!-- Planned Baseline Curve -->
              <path
                className="chart-baseline-curve"
                d="M 30 185 C 80 175, 130 155, 180 145 S 280 105, 330 92 S 430 55, 480 46 S 580 15, 630 5"
              />

              <!-- Realized Actual Curve -->
              <path
                className="chart-actual-curve"
                d="M 30 185 C 80 178, 130 158, 180 148 S 280 112, 330 100 S 370 85, 405 78"
              />

              <!-- Interactive Hover Points -->
              {SCURVE_DATA.map(pt => (
                <g key={pt.month} onClick={() => setActivePoint(pt)} className="cursor-pointer group">
                  {/* Invisible broad hit-area */}
                  <rect x={pt.x - 25} y="0" width="50" height="210" fill="transparent" onMouseEnter={() => setActivePoint(pt)} />
                  
                  {/* Baseline point */}
                  <circle cx={pt.x} cy={pt.yPlan} r="3.5" fill="#94a3b8" />

                  {/* Actual point (if exists) */}
                  {pt.real !== null && (
                    <circle
                      cx={pt.x}
                      cy={pt.yReal!}
                      r={pt.isCurrent ? "6.5" : "4.5"}
                      fill="#38bdf8"
                      stroke="#ffffff"
                      strokeWidth={pt.isCurrent ? "3" : "2"}
                      className="group-hover:scale-125 transition-transform"
                    />
                  )}
                </g>
              ))}
            </svg>

            {/* X-Axis Labels */}
            <div className="flex justify-between text-[11px] text-slate-400 font-mono mt-1 px-4">
              {SCURVE_DATA.map(pt => (
                <button
                  key={pt.month}
                  onClick={() => setActivePoint(pt)}
                  className={`hover:text-slate-900 transition ${activePoint?.month === pt.month ? 'font-bold text-[#0c6a91]' : ''}`}
                >
                  {pt.month}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-6 mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600">
            <span className="flex items-center gap-2"><span className="w-4 h-0.5 border-t-2 border-dashed border-slate-400" /> Linha de Base (Meta 100% em Nov)</span>
            <span className="flex items-center gap-2"><span className="w-4 h-1 bg-[#38bdf8] rounded-full" /> Realizado Acumulado (61,8% em Ago)</span>
          </div>
        </div>

        {/* Priority Attention Column */}
        <div className="editorial-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="eyebrow text-slate-400 block">PRIORIDADE</span>
              <button onClick={() => setView('constraints')} className="text-xs text-[#0c6a91] font-semibold hover:underline">Ver todas →</button>
            </div>
            <h3 className="text-lg text-[#09202c] font-bold font-editorial mb-3">Atenções para Decisão</h3>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-rose-200 text-rose-800 text-xs font-bold flex items-center justify-center shrink-0">01</span>
                <div className="text-xs">
                  <strong className="text-rose-950 block font-semibold">Refrigeração – alteração de projeto</strong>
                  <span className="text-rose-700 text-[10px]">Arena · Resp: Projetos · Vencida</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-amber-200 text-amber-800 text-xs font-bold flex items-center justify-center shrink-0">02</span>
                <div className="text-xs">
                  <strong className="text-amber-950 block font-semibold">Estouro orçamentário Apoio Quadra</strong>
                  <span className="text-amber-700 text-[10px]">Arena · Resp: Suprimentos</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-amber-200 text-amber-800 text-xs font-bold flex items-center justify-center shrink-0">03</span>
                <div className="text-xs">
                  <strong className="text-amber-950 block font-semibold">Mão de obra Alvenaria Torre 1</strong>
                  <span className="text-amber-700 text-[10px]">Bloco Aptos · Resp: Produção</span>
                </div>
              </div>
            </div>
          </div>

          {pendingCount > 0 && (
            <div className="mt-4 p-3 bg-cyan-50 border border-cyan-200 rounded-xl flex items-center justify-between text-xs">
              <span className="text-cyan-950"><strong>{pendingCount}</strong> validações pendentes</span>
              <button onClick={() => setView('validation')} className="font-bold text-[#0c6a91] hover:underline">Revisar →</button>
            </div>
          )}
        </div>

      </div>

      {/* Production by Front Breakdown */}
      <div className="editorial-card p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <span className="eyebrow text-slate-400 block">DESEMPENHO OPERACIONAL</span>
            <h3 className="text-lg text-[#09202c] font-bold font-editorial">Produção por Frente de Obra</h3>
          </div>
          <button onClick={() => setView('gantt')} className="text-xs text-[#0c6a91] font-semibold hover:underline">Abrir cronograma detalhado →</button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { name: 'Arena', real: 76, plan: 81, status: 'Atenção' },
            { name: 'Bloco de Apartamentos', real: 54, plan: 66, status: 'Atrasada' },
            { name: 'Infraestrutura', real: 68, plan: 72, status: 'Atenção' },
            { name: 'Área da Piscina', real: 57, plan: 69, status: 'Atrasada' }
          ].map(f => (
            <div key={f.name} className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex justify-between items-center text-xs mb-2">
                <strong className="text-[#09202c]">{f.name}</strong>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${f.status === 'Atrasada' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>{f.status}</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden my-3 relative">
                <div className="h-full bg-slate-400 rounded-full absolute" style={{ width: `${f.plan}%` }} />
                <div className="h-full bg-[#0c6a91] rounded-full absolute" style={{ width: `${f.real}%` }} />
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                <span>Real: <strong>{f.real}%</strong></span>
                <span>Plan: {f.plan}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

function FieldView({ onOpenModal }: { onOpenModal: (mode: 'Produção' | 'Material' | 'Impedimento', actId?: string) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <span className="eyebrow text-[#0c6a91] block">CAMPO</span>
          <h1 className="text-2xl md:text-3xl text-[#09202c] font-bold mt-1 font-editorial">Minha Obra</h1>
        </div>
        <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Conectado
        </span>
      </div>

      <div className="editorial-dark p-6 md:p-8 mb-8">
        <span className="eyebrow text-[#38bdf8] block">CANTEIRO DE OBRAS</span>
        <h2 className="text-xl md:text-2xl font-bold mt-1 mb-2 font-editorial">O que aconteceu na obra hoje?</h2>
        <p className="text-xs text-slate-200 mb-6 max-w-xl">Registre a produção diária, consumo de insumos ou aponte impedimentos em menos de 1 minuto.</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button onClick={() => onOpenModal('Produção')} className="bg-white/10 hover:bg-white/20 border border-white/20 p-4 rounded-xl text-left transition flex items-start gap-3 shadow-xs">
            <span className="text-2xl text-[#38bdf8]">↗</span>
            <div>
              <strong className="text-xs block text-white font-bold">Registrar Produção</strong>
              <span className="text-[10px] text-slate-300">Quantidade executada</span>
            </div>
          </button>

          <button onClick={() => onOpenModal('Material')} className="bg-white/10 hover:bg-white/20 border border-white/20 p-4 rounded-xl text-left transition flex items-start gap-3 shadow-xs">
            <span className="text-2xl text-[#38bdf8]">▣</span>
            <div>
              <strong className="text-xs block text-white font-bold">Registrar Material</strong>
              <span className="text-[10px] text-slate-300">Consumo e recebimento</span>
            </div>
          </button>

          <button onClick={() => onOpenModal('Impedimento')} className="bg-white/10 hover:bg-white/20 border border-white/20 p-4 rounded-xl text-left transition flex items-start gap-3 shadow-xs">
            <span className="text-2xl text-rose-300">△</span>
            <div>
              <strong className="text-xs block text-white font-bold">Registrar Impedimento</strong>
              <span className="text-[10px] text-slate-300">Relatar bloqueio/restrição</span>
            </div>
          </button>
        </div>
      </div>

      <div className="mb-4 flex justify-between items-center">
        <div>
          <span className="eyebrow text-slate-400 block">SUAS ATIVIDADES</span>
          <h3 className="text-lg text-[#09202c] font-bold font-editorial">Atividades em Foco (Semana 34)</h3>
        </div>
        <span className="bg-slate-200 text-slate-700 text-xs font-semibold px-2.5 py-1 rounded-lg">4 prioritárias</span>
      </div>

      <div className="space-y-3">
        {initialActivities.slice(4, 8).map(a => (
          <div key={a.id} className="editorial-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className={`w-2.5 h-2.5 rounded-full ${a.status === 'Atrasada' ? 'bg-rose-500' : a.status === 'Atenção' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
              <div>
                <strong className="text-sm text-[#09202c] block font-semibold">{a.name}</strong>
                <span className="text-xs text-slate-500">{a.area} · {a.location} · {a.discipline}</span>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="w-32">
                <div className="flex justify-between text-[10px] text-slate-500 font-semibold mb-1">
                  <span>Avanço</span>
                  <span>{a.progress}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#0c6a91] rounded-full" style={{ width: `${a.progress}%` }} />
                </div>
              </div>
              <button onClick={() => onOpenModal('Produção', a.id)} className="px-3.5 py-1.5 rounded-xl bg-[#0c6a91] text-white text-xs font-semibold hover:bg-[#09202c] transition">
                Apontar →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ValidationView({ entries, onDecide }: { entries: Entry[]; onDecide: (id: string, dec: 'Aprovado' | 'Devolvido') => void }) {
  const pending = entries.filter(e => e.status === 'Pendente');
  return (
    <div>
      <div className="flex justify-between items-end mb-6">
        <div>
          <span className="eyebrow text-[#0c6a91] block">ENGENHARIA</span>
          <h1 className="text-2xl md:text-3xl text-[#09202c] font-bold mt-1 font-editorial">Fila de Validações</h1>
        </div>
        <span className="bg-amber-100 text-amber-900 text-xs font-bold px-3 py-1.5 rounded-full">{pending.length} pendentes</span>
      </div>

      {pending.length === 0 ? (
        <div className="editorial-card p-16 text-center">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-600 text-2xl font-bold rounded-full flex items-center justify-center mx-auto mb-4">✓</div>
          <h3 className="text-xl text-[#09202c] font-bold font-editorial">Fila de validação em dia!</h3>
          <p className="text-xs text-slate-500 mt-1">Todos os apontamentos submetidos pelo campo foram analisados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pending.map(e => {
            const act = initialActivities.find(a => a.id === e.activityId) || { name: 'Atividade Geral', location: 'Canteiro' };
            return (
              <div key={e.id} className="editorial-card p-5 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center text-xs mb-3">
                    <span className="bg-cyan-100 text-[#09202c] font-bold px-2.5 py-1 rounded-md text-[10px] uppercase">{e.kind}</span>
                    <span className="text-slate-400 text-[10px] font-mono">{e.date}</span>
                  </div>
                  <h4 className="font-semibold text-sm text-[#09202c]">{act.name}</h4>
                  <p className="text-xs text-slate-500 mt-1">{act.location}</p>

                  <div className="my-4 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="text-lg text-[#0c6a91] font-bold">{e.kind === 'Produção' ? `${e.quantity} unidades executadas` : `Registro de ${e.kind}`}</div>
                    <div className="text-xs text-slate-600 mt-1 italic font-sans">"{e.note || 'Sem observações'}"</div>
                  </div>
                </div>

                <div className="flex gap-2 pt-3 border-t border-slate-100">
                  <button onClick={() => onDecide(e.id, 'Devolvido')} className="flex-1 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-700 font-semibold hover:bg-slate-100 transition">
                    Devolver
                  </button>
                  <button onClick={() => onDecide(e.id, 'Aprovado')} className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition shadow-xs">
                    ✓ Aprovar e Consolidar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function GanttView() {
  const weeks = ['03/08', '10/08', '17/08', '24/08', '31/08', '07/09'];
  return (
    <div>
      <div className="flex justify-between items-end mb-6">
        <div>
          <span className="eyebrow text-[#0c6a91] block">PLANEJAMENTO MESTRE</span>
          <h1 className="text-2xl md:text-3xl text-[#09202c] font-bold mt-1 font-editorial">Cronograma · Baseline × Atual</h1>
        </div>
        <div className="text-xs bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-slate-600 font-medium">Torres 1–3 · Estrutura e Alvenaria</div>
      </div>

      <div className="editorial-card overflow-hidden">
        <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wider p-3.5">
          <div className="col-span-3">Atividade / Localização</div>
          {weeks.slice(0, 4).map(w => <div key={w} className="text-center font-mono">{w}</div>)}
        </div>

        <div className="divide-y divide-slate-100">
          {initialActivities.slice(4, 12).map((a, i) => (
            <div key={a.id} className="grid grid-cols-7 p-3.5 items-center text-xs">
              <div className="col-span-3 pr-4">
                <strong className="text-xs text-[#09202c] block font-semibold">{a.name}</strong>
                <span className="text-[10px] text-slate-500">{a.location} · {a.discipline}</span>
              </div>
              <div className="col-span-4 relative h-8 bg-slate-50/50 rounded-xl flex items-center px-2">
                <div className="absolute h-1.5 bg-slate-300 rounded-full" style={{ left: `${(i % 3) * 15}%`, width: '50%' }} />
                <div className={`absolute h-2.5 ${a.status === 'Atrasada' ? 'bg-rose-500' : 'bg-[#0c6a91]'} rounded-full`} style={{ left: `${(i % 3) * 15 + 4}%`, width: `${Math.max(20, a.progress * 0.4)}%` }} />
                <span className="absolute right-2 text-[10px] font-bold text-slate-600 font-mono">{a.progress}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BalanceView() {
  const floors = ['Rooftop', 'Pavimento 2', 'Pavimento 1', 'Térreo Interno', 'Térreo Externo', 'Fundações'];
  return (
    <div>
      <div className="flex justify-between items-end mb-6">
        <div>
          <span className="eyebrow text-[#0c6a91] block">FLUXO DE PRODUÇÃO</span>
          <h1 className="text-2xl md:text-3xl text-[#09202c] font-bold mt-1 font-editorial">Linha de Balanço</h1>
        </div>
        <div className="text-xs bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-slate-600 font-medium">Torres 1 e 2 · Alvenaria</div>
      </div>

      <div className="editorial-card p-6">
        <div className="grid grid-cols-6 text-center text-[10px] font-bold text-slate-500 uppercase pb-3 border-b border-slate-100 font-mono">
          <span>Localização</span>
          <span>03 ago</span>
          <span>10 ago</span>
          <span>17 ago</span>
          <span>24 ago</span>
          <span>31 ago</span>
        </div>

        <div className="grid grid-cols-6 gap-2 my-4">
          <div className="flex flex-col justify-between text-xs text-slate-600 font-medium py-2">
            {floors.map(f => <span key={f}>{f}</span>)}
          </div>
          <div className="col-span-5 h-64 relative bg-slate-50 rounded-xl p-2 border border-slate-100">
            <svg viewBox="0 0 500 240" preserveAspectRatio="none" className="w-full h-full">
              <path className="chart-gridline" d="M0 40H500M0 80H500M0 120H500M0 160H500M0 200H500" />
              <path className="balance-flow-1" d="M30 220 L120 180 L210 140 L300 100 L390 60 L470 20" />
              <path className="balance-flow-2" d="M80 220 L170 180 L260 140 L350 100 L440 60" />
              <path className="balance-flow-real" d="M30 220 L130 180 L230 140 L340 100 L430 70" />
              <circle cx="430" cy="70" r="5" fill="#ef4444" stroke="#ffffff" strokeWidth="2" />
            </svg>
          </div>
        </div>

        <div className="flex gap-6 pt-3 border-t border-slate-100 text-xs text-slate-600">
          <span className="flex items-center gap-2"><span className="w-4 h-1 bg-[#0c6a91]" /> Torre 1 (Planejado)</span>
          <span className="flex items-center gap-2"><span className="w-4 h-1 bg-[#38bdf8]" /> Torre 2 (Planejado)</span>
          <span className="flex items-center gap-2"><span className="w-4 h-1 border-t-2 border-dashed border-rose-500" /> Realizado em Campo</span>
        </div>
      </div>
    </div>
  );
}

function LookaheadView({ weeks, setWeeks, onPromote }: any) {
  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-3">
        <div>
          <span className="eyebrow text-[#0c6a91] block">MÉDIO PRAZO</span>
          <h1 className="text-2xl md:text-3xl text-[#09202c] font-bold mt-1 font-editorial">Lookahead ({weeks} Semanas)</h1>
        </div>
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1">
          {[2, 3, 4, 5, 6].map(w => (
            <button key={w} onClick={() => setWeeks(w)} className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${weeks === w ? 'bg-[#09202c] text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
              {w} sem
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {['Semana 34 (17–21 ago)', 'Semana 35 (24–28 ago)', 'Semana 36 (31 ago–04 set)', 'Semana 37 (07–11 set)'].slice(0, weeks).map((w, idx) => (
          <div key={w} className="bg-slate-100 p-3.5 rounded-2xl border border-slate-200 flex flex-col gap-3">
            <div className="font-bold text-xs text-[#09202c] border-b border-slate-200 pb-2 font-mono">{w}</div>
            {initialActivities.slice(idx * 2, idx * 2 + 2).map(a => (
              <div key={a.id} className="editorial-card p-3.5 shadow-2xs">
                <div className="flex justify-between items-center text-[10px] mb-1">
                  <span className="font-semibold text-slate-500">{a.discipline}</span>
                  <span className={a.status === 'Atrasada' ? 'text-rose-600 font-bold' : 'text-emerald-600'}>{a.status}</span>
                </div>
                <strong className="text-xs text-[#09202c] block font-semibold">{a.name}</strong>
                <span className="text-[10px] text-slate-500 block mt-1">{a.location}</span>
                <div className="mt-3 pt-2 border-t border-slate-100 flex justify-between items-center">
                  <span className={`text-[10px] ${idx === 0 ? 'text-rose-600 font-semibold' : 'text-emerald-600'}`}>{idx === 0 ? '△ Restrição ativa' : '✓ Pronta p/ execução'}</span>
                  <button onClick={onPromote} className="text-[10px] text-[#0c6a91] font-bold hover:underline">Promover →</button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function WeeklyView() {
  return (
    <div>
      <div className="flex justify-between items-end mb-6">
        <div>
          <span className="eyebrow text-[#0c6a91] block">COMPROMISSOS</span>
          <h1 className="text-2xl md:text-3xl text-[#09202c] font-bold mt-1 font-editorial">Plano Semanal de Produção</h1>
        </div>
        <div className="text-xs bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-slate-600 font-medium font-mono">Semana 34 · 17 a 21 de Agosto</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="editorial-card p-5">
          <span className="eyebrow text-slate-400 block">ADERÊNCIA</span>
          <div className="display-stat text-3xl text-[#09202c] my-1">78%</div>
          <span className="text-xs text-slate-500">18 de 23 compromissos concluídos</span>
        </div>
        <div className="editorial-card p-5">
          <span className="eyebrow text-slate-400 block">EM ANDAMENTO</span>
          <div className="display-stat text-3xl text-amber-600 my-1">4</div>
          <span className="text-xs text-slate-500">Dentro do prazo da semana</span>
        </div>
        <div className="editorial-card p-5">
          <span className="eyebrow text-slate-400 block">NÃO CUMPRIDOS</span>
          <div className="display-stat text-3xl text-rose-600 my-1">5</div>
          <span className="text-xs text-slate-500">3 com restrição associada</span>
        </div>
      </div>

      <div className="editorial-card overflow-hidden">
        <div className="grid grid-cols-5 bg-slate-50 p-3.5 text-[10px] font-bold text-slate-600 uppercase border-b border-slate-200">
          <div className="col-span-2">Atividade</div>
          <div>Responsável</div>
          <div>Meta / Realizado</div>
          <div>Situação</div>
        </div>
        <div className="divide-y divide-slate-100 text-xs">
          {initialActivities.slice(4, 10).map((a, i) => (
            <div key={a.id} className="grid grid-cols-5 p-3.5 items-center">
              <div className="col-span-2 pr-4">
                <strong className="font-semibold text-[#09202c] block">{a.name}</strong>
                <span className="text-[10px] text-slate-500">{a.location}</span>
              </div>
              <div className="text-slate-600">{i % 2 === 0 ? 'Carlos (Campo)' : 'Equipe Alfa'}</div>
              <div className="font-semibold text-slate-700 font-mono">{a.progress}% / 100%</div>
              <div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${a.status === 'Atrasada' ? 'bg-rose-100 text-rose-800' : a.status === 'Atenção' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                  {a.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ConstraintsView({ constraints, onNew }: any) {
  return (
    <div>
      <div className="flex justify-between items-end mb-6">
        <div>
          <span className="eyebrow text-[#0c6a91] block">GESTÃO DE IMPEDIMENTOS</span>
          <h1 className="text-2xl md:text-3xl text-[#09202c] font-bold mt-1 font-editorial">Restrições da Obra</h1>
        </div>
        <button onClick={onNew} className="bg-[#0c6a91] text-white px-3.5 py-2 rounded-xl text-xs font-semibold hover:bg-[#09202c] transition shadow-xs">＋ Nova Restrição</button>
      </div>

      <div className="editorial-card overflow-hidden">
        <div className="grid grid-cols-5 bg-slate-50 p-3.5 text-[10px] font-bold text-slate-600 uppercase border-b border-slate-200">
          <div className="col-span-2">Restrição / Tipo</div>
          <div>Área</div>
          <div>Responsável / Prazo</div>
          <div>Situação</div>
        </div>
        <div className="divide-y divide-slate-100 text-xs">
          {constraints.map((c: any) => (
            <div key={c.id} className="grid grid-cols-5 p-3.5 items-center">
              <div className="col-span-2 pr-4">
                <strong className="font-semibold text-[#09202c] block">{c.title}</strong>
                <span className="text-[10px] text-slate-500">Tipo: {c.type}</span>
              </div>
              <div className="text-slate-600">{c.area}</div>
              <div>
                <div className="text-slate-700 font-medium">{c.owner}</div>
                <div className="text-[10px] text-slate-400 font-mono">Prazo: {c.due}</div>
              </div>
              <div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${c.status === 'Vencida' ? 'bg-rose-100 text-rose-800' : c.status === 'Em tratamento' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'}`}>
                  {c.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StructureView() {
  const tree = [
    { area: 'Arena', items: ['Quadra Coberta', 'Apoio das Quadras', 'Quadras de Tênis', 'Área 1'] },
    { area: 'Bloco de Apartamentos', items: ['Torre 1 (Térreo, P1, P2, Rooftop)', 'Torre 2 (Térreo, P1, P2, Rooftop)', 'Torre 3 (Fundações, P1, P2)'] },
    { area: 'Infraestrutura', items: ['Água Potável', 'Drenagem Pluvial', 'Rede Elétrica e CFTV', 'Rede de Esgoto'] },
    { area: 'Área da Piscina', items: ['Piscina Central', 'Bares Molhados', 'Deck Seco e Obras em Madeira'] },
    { area: 'Recepção e Restaurante', items: ['Recepção Principal', 'Restaurante Trama', 'SPA e Lojas', 'Guarita'] }
  ];

  return (
    <div>
      <div className="flex justify-between items-end mb-6">
        <div>
          <span className="eyebrow text-[#0c6a91] block">ESTRUTURA ANALÍTICA (EAP)</span>
          <h1 className="text-2xl md:text-3xl text-[#09202c] font-bold mt-1 font-editorial">Hierarquia da Obra</h1>
        </div>
        <div className="text-xs bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-slate-600 font-medium">16 frentes cadastradas</div>
      </div>

      <div className="space-y-4">
        {tree.map(t => (
          <div key={t.area} className="editorial-card p-4">
            <div className="flex items-center justify-between font-semibold text-sm text-[#09202c] border-b border-slate-100 pb-2 mb-3">
              <span className="flex items-center gap-2"><span>📂</span> {t.area}</span>
              <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-full font-mono">{t.items.length} locais</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 pl-4">
              {t.items.map(item => <div key={item} className="flex items-center gap-2"><span className="text-slate-400">└</span> {item}</div>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
