'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase, type PlanesProfile, type PlanesUserRole } from '../../../lib/supabase/client';

type AccessRequest = {
  id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  requested_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
  admin_notes: string | null;
};

type Row = AccessRequest & { profile?: PlanesProfile };

const roles: Array<{ value: PlanesUserRole; label: string }> = [
  { value: 'admin', label: 'Administrador' },
  { value: 'gestor', label: 'Gestor' },
  { value: 'engenharia', label: 'Engenharia' },
  { value: 'campo', label: 'Campo' },
  { value: 'financeiro', label: 'Financeiro' },
  { value: 'cliente', label: 'Cliente' },
];

export default function AccessAdminPage() {
  const [actor, setActor] = useState<PlanesProfile | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [roleByRequest, setRoleByRequest] = useState<Record<string, PlanesUserRole>>({});
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [works, setWorks] = useState<Array<{ id: string; name: string; project_id: string }>>([]);
  const [projectSelection, setProjectSelection] = useState<Record<string, string[]>>({});
  const [workSelection, setWorkSelection] = useState<Record<string, string[]>>({});

  const canManage = useMemo(() => actor?.status === 'approved' && (actor.role === 'super_admin' || actor.role === 'admin'), [actor]);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) throw new Error('Sessão não encontrada.');

      const { data: actorData, error: actorError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (actorError) throw actorError;
      const currentActor = actorData as PlanesProfile;
      setActor(currentActor);
      if (currentActor.status !== 'approved' || !['super_admin', 'admin'].includes(currentActor.role || '')) {
        setRows([]);
        return;
      }

      const [{ data: requestData, error: requestError }, { data: projectData }, { data: workData }] = await Promise.all([
        supabase.from('access_requests').select('id,user_id,status,requested_at,reviewed_at,rejection_reason,admin_notes').order('requested_at', { ascending: false }),
        supabase.from('projects').select('id,name').eq('active', true).order('name'),
        supabase.from('works').select('id,name,project_id').eq('active', true).order('name'),
      ]);
      if (requestError) throw requestError;

      const requests = (requestData || []) as AccessRequest[];
      const userIds = [...new Set(requests.map((request) => request.user_id))];
      const { data: profileData, error: profileError } = userIds.length
        ? await supabase.from('profiles').select('*').in('id', userIds)
        : { data: [], error: null };
      if (profileError) throw profileError;

      const profileMap = new Map((profileData || []).map((profile) => [profile.id, profile as PlanesProfile]));
      setRows(requests.map((request) => ({ ...request, profile: profileMap.get(request.user_id) })));
      setProjects((projectData || []) as Array<{ id: string; name: string }>);
      setWorks((workData || []) as Array<{ id: string; name: string; project_id: string }>);
      setRoleByRequest((current) => {
        const next = { ...current };
        for (const request of requests) if (!next[request.id]) next[request.id] = 'cliente';
        return next;
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Falha ao carregar solicitações.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const channel = supabase
      .channel('admin-access-console')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'access_requests' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load]);

  function toggleSelection(setter: React.Dispatch<React.SetStateAction<Record<string, string[]>>>, requestId: string, id: string) {
    setter((current) => {
      const values = current[requestId] || [];
      return { ...current, [requestId]: values.includes(id) ? values.filter((value) => value !== id) : [...values, id] };
    });
  }

  async function review(request: Row, decision: 'approve' | 'reject') {
    setBusyId(request.id);
    setMessage('');
    try {
      let rejectionReason: string | null = null;
      if (decision === 'reject') {
        rejectionReason = window.prompt('Motivo da rejeição:')?.trim() || null;
        if (!rejectionReason) throw new Error('Informe o motivo da rejeição.');
      }

      const { data, error } = await supabase.functions.invoke('admin-review-access', {
        body: {
          requestId: request.id,
          decision,
          role: decision === 'approve' ? roleByRequest[request.id] : null,
          projectIds: projectSelection[request.id] || [],
          workIds: workSelection[request.id] || [],
          rejectionReason,
        },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || 'A revisão não foi concluída.');
      setMessage(decision === 'approve' ? 'Acesso aprovado com sucesso.' : 'Solicitação rejeitada.');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Falha ao revisar solicitação.');
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <main style={{ minHeight: '100dvh', padding: 32, background: '#f4f6f9' }}>Carregando solicitações…</main>;

  if (!canManage) {
    return (
      <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, background: '#f4f6f9' }}>
        <section style={{ background: '#fff', padding: 32, borderRadius: 24, maxWidth: 480 }}>
          <h1 style={{ marginTop: 0 }}>Acesso administrativo necessário</h1>
          <p style={{ color: '#64748b', lineHeight: 1.6 }}>Esta área é exclusiva para administradores autorizados do Planes OS.</p>
          <a href="/" style={{ color: '#111827', fontWeight: 700 }}>Voltar ao Planes OS</a>
        </section>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100dvh', padding: 'clamp(20px, 4vw, 48px)', background: '#f4f6f9', color: '#111827' }}>
      <header style={{ maxWidth: 1180, margin: '0 auto 28px', display: 'flex', gap: 16, justifyContent: 'space-between', alignItems: 'end', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.15em' }}>PLANES OS · IAM</div>
          <h1 style={{ margin: '8px 0 4px', fontSize: 'clamp(28px, 4vw, 44px)', letterSpacing: '-.04em' }}>Solicitações de acesso</h1>
          <p style={{ margin: 0, color: '#64748b' }}>Aprovação, perfil e escopo persistidos no Supabase.</p>
        </div>
        <a href="/" style={{ padding: '11px 16px', border: '1px solid #dbe2ea', borderRadius: 12, background: '#fff', color: '#111827', textDecoration: 'none', fontWeight: 700 }}>Voltar ao sistema</a>
      </header>

      {message && <div role="status" style={{ maxWidth: 1180, margin: '0 auto 18px', padding: 14, background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0' }}>{message}</div>}

      <section style={{ maxWidth: 1180, margin: '0 auto', display: 'grid', gap: 14 }}>
        {rows.length === 0 && <div style={{ background: '#fff', borderRadius: 20, padding: 28, color: '#64748b' }}>Nenhuma solicitação registrada.</div>}
        {rows.map((row) => (
          <article key={row.id} style={{ background: '#fff', borderRadius: 22, padding: 22, border: '1px solid #e8edf3', boxShadow: '0 10px 32px rgba(15,23,42,.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <strong style={{ fontSize: 18 }}>{row.profile?.full_name || row.profile?.email || row.user_id}</strong>
                <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>{row.profile?.email}</div>
                <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 5 }}>Solicitado em {new Date(row.requested_at).toLocaleString('pt-BR')}</div>
              </div>
              <span style={{ alignSelf: 'start', padding: '7px 10px', borderRadius: 999, fontSize: 12, fontWeight: 800, background: row.status === 'pending' ? '#fff7d6' : '#eef2f7' }}>{row.status.toUpperCase()}</span>
            </div>

            {row.status === 'pending' && (
              <div style={{ marginTop: 20, display: 'grid', gap: 16 }}>
                <label style={{ display: 'grid', gap: 7, maxWidth: 320, fontSize: 13, fontWeight: 700 }}>
                  Perfil
                  <select value={roleByRequest[row.id] || 'cliente'} onChange={(event) => setRoleByRequest((current) => ({ ...current, [row.id]: event.target.value as PlanesUserRole }))} style={{ height: 44, border: '1px solid #dbe2ea', borderRadius: 12, padding: '0 12px', background: '#fff' }}>
                    {actor?.role === 'super_admin' && <option value="super_admin">Super administrador</option>}
                    {roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                  </select>
                </label>

                {projects.length > 0 && (
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 8 }}>Projetos</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{projects.map((project) => <label key={project.id} style={{ padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 12 }}><input type="checkbox" checked={(projectSelection[row.id] || []).includes(project.id)} onChange={() => toggleSelection(setProjectSelection, row.id, project.id)} /> <span>{project.name}</span></label>)}</div>
                  </div>
                )}

                {works.length > 0 && (
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 8 }}>Obras</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{works.map((work) => <label key={work.id} style={{ padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 12 }}><input type="checkbox" checked={(workSelection[row.id] || []).includes(work.id)} onChange={() => toggleSelection(setWorkSelection, row.id, work.id)} /> <span>{work.name}</span></label>)}</div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button disabled={busyId === row.id} onClick={() => void review(row, 'approve')} style={{ border: 0, borderRadius: 12, padding: '12px 18px', background: '#111827', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>{busyId === row.id ? 'Processando…' : 'Aprovar acesso'}</button>
                  <button disabled={busyId === row.id} onClick={() => void review(row, 'reject')} style={{ border: '1px solid #fecaca', borderRadius: 12, padding: '12px 18px', background: '#fff', color: '#b91c1c', fontWeight: 800, cursor: 'pointer' }}>Rejeitar</button>
                </div>
              </div>
            )}
          </article>
        ))}
      </section>
    </main>
  );
}
