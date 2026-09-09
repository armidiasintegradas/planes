'use client';

import { FormEvent, ReactNode, useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  supabase,
  supabasePublishableKey,
  supabaseUrl,
  type PlanesProfile,
} from '../lib/supabase/client';
import {
  PLANES_AUTH_REDIRECT,
  getAuthCapabilities,
} from '../lib/auth/security.mjs';

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

const defaultCapabilities = {
  email: true,
  google: false,
  apple: false,
  passkeys: false,
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [capabilities, setCapabilities] = useState(defaultCapabilities);
  const [adminFallbackOpen, setAdminFallbackOpen] = useState(false);
  const [hasPasskey, setHasPasskey] = useState<boolean | null>(null);
  const [passkeyOfferDismissed, setPasskeyOfferDismissed] = useState(false);

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
    void fetch(`${supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: supabasePublishableKey },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Auth settings ${response.status}`);
        return response.json();
      })
      .then((settings) => {
        if (active) setCapabilities(getAuthCapabilities(settings));
      })
      .catch(() => {
        if (active) setCapabilities(defaultCapabilities);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      const currentSession = data.session;
      setSession(currentSession);
      if (currentSession?.user) await loadProfile(currentSession.user.id);
      if (active) setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setMessage('');
      setLoading(Boolean(nextSession?.user));
      if (nextSession?.user) {
        window.setTimeout(() => {
          if (!active) return;
          void loadProfile(nextSession.user.id).finally(() => {
            if (active) setLoading(false);
          });
        }, 0);
      } else {
        setProfile(null);
        setHasPasskey(null);
        setPasskeyOfferDismissed(false);
        setLoading(false);
      }
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
      }, () => void loadProfile(session.user.id))
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [session?.user?.id, loadProfile]);

  useEffect(() => {
    if (!session?.user || profile?.status !== 'approved' || !capabilities.passkeys) {
      setHasPasskey(null);
      return;
    }

    let active = true;
    void supabase.auth.passkey.list().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        setHasPasskey(null);
        return;
      }
      setHasPasskey(Array.isArray(data) && data.length > 0);
    });

    return () => {
      active = false;
    };
  }, [session?.user?.id, profile?.status, capabilities.passkeys]);

  async function handleAdminEmailAuth(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível autenticar o acesso administrativo.');
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogleOAuth() {
    if (!capabilities.google) {
      setMessage('O login Google ainda não está habilitado no Supabase. O acesso administrativo de contingência continua disponível abaixo.');
      return;
    }
    setBusy(true);
    setMessage('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: PLANES_AUTH_REDIRECT },
    });
    if (error) {
      setMessage(`Google não pôde iniciar: ${error.message}`);
      setBusy(false);
    }
  }

  async function handlePasskeySignIn() {
    if (!capabilities.passkeys) return;
    setBusy(true);
    setMessage('');
    const { error } = await supabase.auth.signInWithPasskey();
    if (error) setMessage(`Passkey não pôde autenticar: ${error.message}`);
    setBusy(false);
  }

  async function registerPasskey() {
    setBusy(true);
    setMessage('');
    const { error } = await supabase.auth.registerPasskey();
    if (error) {
      setMessage(`Não foi possível cadastrar a Passkey: ${error.message}`);
    } else {
      setHasPasskey(true);
      setPasskeyOfferDismissed(true);
    }
    setBusy(false);
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
          <h1 style={{ margin: '0 0 8px', fontSize: 28, letterSpacing: '-.04em' }}>Entrar no Planes OS</h1>
          <p style={{ color: '#64748b', margin: '0 0 24px', lineHeight: 1.55 }}>
            O acesso de usuários é feito pelo Google. No primeiro acesso, sua conta entra como pendente e só é liberada depois que um administrador define perfil, projetos e obras.
          </p>

          {capabilities.passkeys && (
            <button disabled={busy} onClick={() => void handlePasskeySignIn()} style={{ ...secondaryButton, marginBottom: 12 }}>
              Entrar com Face ID / Passkey
            </button>
          )}

          <button
            disabled={busy || !capabilities.google}
            onClick={() => void handleGoogleOAuth()}
            style={{ ...primaryButton, opacity: capabilities.google ? 1 : .55, cursor: capabilities.google ? 'pointer' : 'not-allowed' }}
          >
            {capabilities.google ? 'Continuar com Google' : 'Google em configuração'}
          </button>

          {!capabilities.google && (
            <p style={{ margin: '12px 0 0', color: '#64748b', fontSize: 12, lineHeight: 1.5 }}>
              O provider Google ainda precisa das credenciais OAuth no Supabase. Nenhum cadastro público por e-mail é aceito.
            </p>
          )}

          {message && <p role="status" style={{ margin: '16px 0 0', padding: 12, borderRadius: 12, background: '#f8fafc', color: '#475569', fontSize: 13, lineHeight: 1.45 }}>{message}</p>}

          <button
            type="button"
            onClick={() => { setAdminFallbackOpen((value) => !value); setMessage(''); }}
            style={{ width: '100%', background: 'transparent', border: 0, marginTop: 20, color: '#475569', cursor: 'pointer', fontWeight: 600 }}
          >
            Acesso administrativo de contingência
          </button>

          {adminFallbackOpen && (
            <div style={{ marginTop: 14, paddingTop: 18, borderTop: '1px solid #e2e8f0' }}>
              <p style={{ color: '#64748b', fontSize: 12, lineHeight: 1.5, margin: '0 0 12px' }}>
                Reservado à conta administrativa já existente. Este formulário não cria novos usuários.
              </p>
              <form onSubmit={handleAdminEmailAuth} style={{ display: 'grid', gap: 12 }}>
                <input required type="email" autoComplete="email" placeholder="E-mail administrativo" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
                <input required minLength={8} type="password" autoComplete="current-password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
                <button disabled={busy} type="submit" style={secondaryButton}>{busy ? 'Processando…' : 'Entrar como administrador'}</button>
              </form>
            </div>
          )}
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
          <h1 style={{ margin: '0 0 10px', fontSize: 28, letterSpacing: '-.04em' }}>Solicitação recebida.</h1>
          <p style={{ color: '#64748b', lineHeight: 1.6 }}>Sua identidade foi validada. O acesso ao Planes OS está aguardando autorização do administrador. Assim que seu perfil, projetos e obras forem definidos, os recursos correspondentes serão liberados automaticamente.</p>
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

  if (capabilities.passkeys && hasPasskey === false && !passkeyOfferDismissed) {
    return (
      <Frame>
        <section style={cardStyle}>
          <Brand />
          <h1 style={{ margin: '0 0 10px', fontSize: 28, letterSpacing: '-.04em' }}>Ative o acesso sem senha</h1>
          <p style={{ color: '#64748b', lineHeight: 1.6 }}>Cadastre uma Passkey para entrar depois com Face ID, Touch ID, Windows Hello ou o gerenciador de senhas do seu dispositivo.</p>
          {message && <p role="status" style={{ padding: 12, borderRadius: 12, background: '#f8fafc', color: '#475569', fontSize: 13 }}>{message}</p>}
          <div style={{ display: 'grid', gap: 10, marginTop: 20 }}>
            <button disabled={busy} onClick={() => void registerPasskey()} style={primaryButton}>{busy ? 'Processando…' : 'Cadastrar Face ID / Passkey'}</button>
            <button disabled={busy} onClick={() => setPasskeyOfferDismissed(true)} style={secondaryButton}>Agora não</button>
          </div>
        </section>
      </Frame>
    );
  }

  return <>{children}</>;
}
