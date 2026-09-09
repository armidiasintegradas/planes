'use client';

import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, type PlanesProfile } from '../lib/supabase/client';

const cardStyle: React.CSSProperties = {
  width: 'min(92vw, 460px)',
  background: '#fff',
  borderRadius: 28,
  padding: 32,
  boxShadow: '0 24px 70px rgba(15,23,42,.14)',
  border: '1px solid rgba(226,232,240,.9)',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 48,
  borderRadius: 14,
  border: '1px solid #dbe2ea',
  padding: '0 14px',
  font: 'inherit',
  outline: 'none',
  background: '#fff',
};

const primaryButton: React.CSSProperties = {
  width: '100%',
  height: 48,
  border: 0,
  borderRadius: 14,
  background: '#111827',
  color: '#fff',
  fontWeight: 700,
  cursor: 'pointer',
};

const secondaryButton: React.CSSProperties = {
  ...primaryButton,
  background: '#fff',
  color: '#111827',
  border: '1px solid #dbe2ea',
};

function Frame({ children }: { children: ReactNode }) {
  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, background: 'radial-gradient(circle at 10% 20%, #f7f9fb 0%, #e5eaf0 90%)' }}>
      {children}
    </main>
  );
}

function Brand() {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontWeight: 800, letterSpacing: '.16em', fontSize: 13 }}>PLANES OS</div>
      <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>Ambiente seguro de gestão operacional</div>
    </div>
  );
}

export default function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<PlanesProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const redirectTo = useMemo(() => {
    if (typeof window === 'undefined') return undefined;
    return `${window.location.origin}${window.location.pathname}`;
  }, []);

  const loadProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id,full_name,email,avatar_url,status,role,approved_at,approved_by,created_at,updated_at')
      .eq('id', userId)
      .single();

    if (error) {
      setProfile(null);
      setMessage('Não foi possível carregar seu perfil de acesso.');
      return;
    }
    setProfile(data as PlanesProfile);
  }, []);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      const currentSession = data.session;
      setSession(currentSession);
      if (currentSession?.user) await loadProfile(currentSession.user.id);
      if (active) setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setMessage('');
      if (nextSession?.user) await loadProfile(nextSession.user.id);
      else setProfile(null);
      if (active) setLoading(false);
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  useEffect(() => {
    if (!session?.user?.id) return;
    const channel = supabase
      .channel(`profile:${session.user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${session.user.id}`,
      }, () => loadProfile(session.user.id))
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [session?.user?.id, loadProfile]);

  async function handleEmailAuth(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
        });
        if (error) throw error;
        if (!data.session) {
          setMessage('Cadastro recebido. Confira seu e-mail para confirmar a conta. Depois da confirmação, seu acesso seguirá o fluxo de autorização do Planes OS.');
        } else {
          setMessage('Cadastro recebido. Seu acesso está sendo preparado.');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível autenticar.');
    } finally {
      setBusy(false);
    }
  }

  async function handleOAuth(provider: 'google' | 'apple') {
    setBusy(true);
    setMessage('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: redirectTo ? { redirectTo } : undefined,
    });
    if (error) {
      setMessage(`${provider === 'google' ? 'Google' : 'Apple'} ainda não está disponível: ${error.message}`);
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    await supabase.auth.signOut();
    setBusy(false);
  }

  if (loading) {
    return <Frame><div style={cardStyle}><Brand /><div style={{ color: '#64748b' }}>Verificando acesso seguro…</div></div></Frame>;
  }

  if (!session) {
    return (
      <Frame>
        <section style={cardStyle}>
          <Brand />
          <h1 style={{ margin: '0 0 8px', fontSize: 28, letterSpacing: '-.04em' }}>{mode === 'signin' ? 'Entrar no Planes OS' : 'Solicitar acesso'}</h1>
          <p style={{ color: '#64748b', margin: '0 0 24px', lineHeight: 1.5 }}>
            {mode === 'signin' ? 'Use sua conta autorizada para acessar a operação.' : 'Seu cadastro ficará aguardando análise e definição de perfil pelo administrador.'}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
            <button disabled={busy} onClick={() => void handleOAuth('google')} style={secondaryButton}>Google</button>
            <button disabled={busy} onClick={() => void handleOAuth('apple')} style={secondaryButton}>Apple</button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#94a3b8', fontSize: 12, marginBottom: 18 }}>
            <span style={{ height: 1, background: '#e2e8f0', flex: 1 }} /><span>ou</span><span style={{ height: 1, background: '#e2e8f0', flex: 1 }} />
          </div>

          <form onSubmit={handleEmailAuth} style={{ display: 'grid', gap: 12 }}>
            <input required type="email" autoComplete="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
            <input required minLength={8} type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
            <button disabled={busy} type="submit" style={primaryButton}>{busy ? 'Processando…' : mode === 'signin' ? 'Entrar' : 'Criar cadastro'}</button>
          </form>

          {message && <p role="status" style={{ margin: '16px 0 0', padding: 12, borderRadius: 12, background: '#f8fafc', color: '#475569', fontSize: 13, lineHeight: 1.45 }}>{message}</p>}

          <button onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setMessage(''); }} style={{ width: '100%', background: 'transparent', border: 0, marginTop: 18, color: '#475569', cursor: 'pointer', fontWeight: 600 }}>
            {mode === 'signin' ? 'Primeiro acesso? Solicitar cadastro' : 'Já tenho cadastro'}
          </button>
        </section>
      </Frame>
    );
  }

  if (!profile) {
    return <Frame><section style={cardStyle}><Brand /><h1 style={{ fontSize: 24 }}>Perfil indisponível</h1><p style={{ color: '#64748b' }}>{message || 'Não foi possível confirmar seu nível de acesso.'}</p><button onClick={() => void signOut()} style={secondaryButton}>Sair</button></section></Frame>;
  }

  if (profile.status === 'pending') {
    return (
      <Frame>
        <section style={cardStyle}>
          <Brand />
          <div style={{ display: 'inline-flex', padding: '7px 11px', borderRadius: 999, background: '#fff7d6', color: '#8a6400', fontSize: 12, fontWeight: 700, marginBottom: 18 }}>AGUARDANDO AUTORIZAÇÃO</div>
          <h1 style={{ margin: '0 0 10px', fontSize: 28, letterSpacing: '-.04em' }}>Cadastro recebido.</h1>
          <p style={{ color: '#64748b', lineHeight: 1.6 }}>Seu acesso ao Planes OS está aguardando autorização do administrador. Assim que seu perfil e nível de acesso forem aprovados, os recursos correspondentes à sua função serão liberados automaticamente.</p>
          <div style={{ display: 'grid', gap: 10, marginTop: 22 }}>
            <button disabled={busy} onClick={() => void loadProfile(session.user.id)} style={primaryButton}>Atualizar status</button>
            <button disabled={busy} onClick={() => void signOut()} style={secondaryButton}>Sair</button>
          </div>
        </section>
      </Frame>
    );
  }

  if (profile.status === 'rejected' || profile.status === 'suspended') {
    return (
      <Frame>
        <section style={cardStyle}>
          <Brand />
          <h1 style={{ margin: '0 0 10px', fontSize: 28 }}>{profile.status === 'suspended' ? 'Acesso suspenso' : 'Acesso não autorizado'}</h1>
          <p style={{ color: '#64748b', lineHeight: 1.6 }}>Este perfil não possui acesso operacional ao Planes OS. Procure o administrador responsável caso precise revisar a situação.</p>
          <button disabled={busy} onClick={() => void signOut()} style={secondaryButton}>Sair</button>
        </section>
      </Frame>
    );
  }

  return <>{children}</>;
}
