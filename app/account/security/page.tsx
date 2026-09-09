'use client';

import { useEffect, useState } from 'react';
import { supabase, supabasePublishableKey, supabaseUrl } from '../../../lib/supabase/client';
import { getAuthCapabilities } from '../../../lib/auth/security.mjs';

type PasskeyItem = {
  id: string;
  friendly_name?: string | null;
  created_at: string;
  last_used_at?: string | null;
};

const pageStyle: React.CSSProperties = {
  minHeight: '100dvh',
  background: '#f8fafc',
  padding: 24,
};

const cardStyle: React.CSSProperties = {
  width: 'min(100%, 720px)',
  margin: '0 auto',
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: 24,
  padding: 28,
  boxShadow: '0 18px 48px rgba(15,23,42,.08)',
};

const buttonStyle: React.CSSProperties = {
  minHeight: 44,
  border: 0,
  borderRadius: 12,
  padding: '0 16px',
  background: '#111827',
  color: '#fff',
  fontWeight: 700,
  cursor: 'pointer',
};

const secondaryButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: '#fff',
  color: '#111827',
  border: '1px solid #dbe2ea',
};

export default function AccountSecurityPage() {
  const [passkeysEnabled, setPasskeysEnabled] = useState(false);
  const [passkeys, setPasskeys] = useState<PasskeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  async function loadPasskeys() {
    const { data, error } = await supabase.auth.passkey.list();
    if (error) {
      setMessage(`Não foi possível carregar suas Passkeys: ${error.message}`);
      return;
    }
    setPasskeys((Array.isArray(data) ? data : []) as PasskeyItem[]);
  }

  useEffect(() => {
    let active = true;
    void fetch(`${supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: supabasePublishableKey },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Auth settings ${response.status}`);
        return response.json();
      })
      .then(async (settings) => {
        if (!active) return;
        const enabled = getAuthCapabilities(settings).passkeys;
        setPasskeysEnabled(enabled);
        if (enabled) await loadPasskeys();
      })
      .catch(() => {
        if (active) setMessage('Não foi possível confirmar a configuração de Passkeys agora.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function registerPasskey() {
    setBusyId('register');
    setMessage('');
    const { error } = await supabase.auth.registerPasskey();
    if (error) {
      setMessage(`Não foi possível cadastrar a Passkey: ${error.message}`);
    } else {
      setMessage('Passkey cadastrada com sucesso.');
      await loadPasskeys();
    }
    setBusyId(null);
  }

  async function deletePasskey(passkeyId: string) {
    setBusyId(passkeyId);
    setMessage('');
    const { error } = await supabase.auth.passkey.delete({ passkeyId });
    if (error) {
      setMessage(`Não foi possível remover a Passkey: ${error.message}`);
    } else {
      setPasskeys((current) => current.filter((item) => item.id !== passkeyId));
      setMessage('Passkey removida.');
    }
    setBusyId(null);
  }

  return (
    <main style={pageStyle}>
      <section style={cardStyle}>
        <div style={{ fontWeight: 900, letterSpacing: '.14em', fontSize: 12 }}>PLANES OS · SEGURANÇA</div>
        <h1 style={{ margin: '12px 0 8px', fontSize: 30, letterSpacing: '-.04em' }}>Face ID, Touch ID e Passkeys</h1>
        <p style={{ color: '#64748b', lineHeight: 1.6, marginTop: 0 }}>
          Cadastre credenciais resistentes a phishing para entrar sem senha nos dispositivos compatíveis.
        </p>

        {loading && <p style={{ color: '#64748b' }}>Verificando configuração…</p>}

        {!loading && !passkeysEnabled && (
          <div style={{ padding: 14, borderRadius: 12, background: '#fffbeb', color: '#854d0e', lineHeight: 1.5 }}>
            Passkeys ainda não estão habilitadas no servidor Supabase deste projeto. Nenhuma credencial será criada até essa configuração ser ativada.
          </div>
        )}

        {!loading && passkeysEnabled && (
          <>
            <button disabled={busyId !== null} onClick={() => void registerPasskey()} style={{ ...buttonStyle, marginTop: 12 }}>
              {busyId === 'register' ? 'Cadastrando…' : 'Cadastrar nova Passkey'}
            </button>

            <div style={{ display: 'grid', gap: 12, marginTop: 24 }}>
              {passkeys.length === 0 && <div style={{ color: '#64748b' }}>Nenhuma Passkey cadastrada nesta conta.</div>}
              {passkeys.map((item) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, padding: 16, border: '1px solid #e2e8f0', borderRadius: 14 }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{item.friendly_name || 'Passkey'}</div>
                    <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>Criada em {new Date(item.created_at).toLocaleString('pt-BR')}</div>
                    {item.last_used_at && <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>Último uso em {new Date(item.last_used_at).toLocaleString('pt-BR')}</div>}
                  </div>
                  <button disabled={busyId !== null} onClick={() => void deletePasskey(item.id)} style={secondaryButtonStyle}>
                    {busyId === item.id ? 'Removendo…' : 'Remover'}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {message && <p role="status" style={{ marginTop: 18, padding: 12, borderRadius: 12, background: '#f8fafc', color: '#475569', lineHeight: 1.45 }}>{message}</p>}

        <button onClick={() => window.history.back()} style={{ ...secondaryButtonStyle, marginTop: 24 }}>Voltar</button>
      </section>
    </main>
  );
}
