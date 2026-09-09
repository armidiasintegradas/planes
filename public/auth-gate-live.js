import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';

const SUPABASE_URL = 'https://xfgcbxppsbwmxwsuajou.supabase.co';
const SUPABASE_KEY = 'sb_publishable_tFvlFVbpOPYPPA72qcMWQg_IZO4V4xS';
const REDIRECT_TO = 'https://armidiasintegradas.github.io/planes/';
const ROOT_ID = 'planes-auth-root';
const STYLE_ID = 'planes-auth-live-style';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
});

let profileChannel = null;
let capabilities = { email: true, google: false };

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${ROOT_ID}{position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;padding:24px;background:radial-gradient(circle at 10% 20%,#f7f9fb 0%,#e5eaf0 90%);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#111827;visibility:visible!important;pointer-events:auto!important}
    #${ROOT_ID} *{box-sizing:border-box}
    #${ROOT_ID} .planes-auth-card{width:min(94vw,520px);background:#fff;border:1px solid #e2e8f0;border-radius:28px;padding:32px;box-shadow:0 24px 70px rgba(15,23,42,.14)}
    #${ROOT_ID} .planes-auth-brand{font-size:12px;font-weight:900;letter-spacing:.16em}
    #${ROOT_ID} h1{font-size:28px;letter-spacing:-.04em;margin:10px 0 8px}
    #${ROOT_ID} .planes-auth-muted{color:#64748b;line-height:1.55}
    #${ROOT_ID} .planes-auth-grid{display:grid;gap:12px}
    #${ROOT_ID} .planes-auth-input,#${ROOT_ID} .planes-auth-btn{width:100%;height:48px;border-radius:14px;font:inherit}
    #${ROOT_ID} .planes-auth-input{border:1px solid #dbe2ea;padding:0 14px;background:#fff;color:#111827}
    #${ROOT_ID} .planes-auth-btn{border:0;background:#111827;color:#fff;font-weight:800;cursor:pointer}
    #${ROOT_ID} .planes-auth-btn.secondary{background:#fff;color:#111827;border:1px solid #dbe2ea}
    #${ROOT_ID} .planes-auth-btn.link{background:transparent;color:#475569;height:auto;padding:10px}
    #${ROOT_ID} .planes-auth-btn:disabled{opacity:.55;cursor:not-allowed}
    #${ROOT_ID} .planes-auth-status{margin-top:16px;padding:13px;border-radius:12px;background:#f8fafc;border:1px solid #e2e8f0;font-size:13px;white-space:pre-wrap;line-height:1.5}
    #${ROOT_ID} .planes-auth-good{background:#f0fdf4;border-color:#bbf7d0;color:#166534}
    #${ROOT_ID} .planes-auth-warn{background:#fffbeb;border-color:#fde68a;color:#854d0e}
    #${ROOT_ID} .planes-auth-bad{background:#fff1f2;border-color:#fecdd3;color:#9f1239}
    #${ROOT_ID} .planes-auth-hide{display:none!important}
    @media(max-width:520px){#${ROOT_ID} .planes-auth-card{padding:24px;border-radius:22px}}
  `;
  document.head.appendChild(style);
}

function root() {
  ensureStyles();
  let node = document.getElementById(ROOT_ID);
  if (!node) {
    node = document.createElement('div');
    node.id = ROOT_ID;
    document.body.appendChild(node);
  }
  return node;
}

function blockApp() {
  document.documentElement.classList.remove('planes-auth-loading');
  document.documentElement.classList.add('planes-auth-blocked');
}

function allowApp() {
  document.documentElement.classList.remove('planes-auth-loading', 'planes-auth-blocked');
  document.getElementById(ROOT_ID)?.remove();
  window.dispatchEvent(new CustomEvent('planes-auth-approved'));
}

function renderShell(body) {
  blockApp();
  const node = root();
  node.innerHTML = `<main class="planes-auth-card"><div class="planes-auth-brand">PLANES OS</div><p class="planes-auth-muted" style="font-size:12px;margin:5px 0 22px">Ambiente seguro de gestão operacional</p>${body}</main>`;
  return node;
}

function renderMessage(target, text, kind = '') {
  const box = target.querySelector('[data-auth-message]');
  if (!box) return;
  box.className = `planes-auth-status ${kind}`.trim();
  box.textContent = text;
}

async function loadCapabilities() {
  try {
    const settingsUrl = `${SUPABASE_URL}/auth/v1/settings?ts=${Date.now()}`;
    const response = await fetch(settingsUrl, {
      cache: 'no-store',
      headers: { apikey: SUPABASE_KEY },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const settings = await response.json();
    capabilities = {
      email: settings.external?.email === true,
      google: settings.external?.google === true,
    };
  } catch {
    capabilities = { email: true, google: false };
  }
  return capabilities;
}

function renderLogin() {
  const googleLabel = capabilities.google ? 'Continuar com Google' : 'Google temporariamente indisponível';
  const providerText = capabilities.google
    ? 'Google está habilitado. No primeiro acesso, sua conta ficará pendente até aprovação do administrador.'
    : 'Não foi possível confirmar o provider Google agora. O acesso administrativo de contingência continua disponível.';

  const node = renderShell(`
    <h1>Entrar no Planes OS</h1>
    <p class="planes-auth-muted">O acesso de usuários é feito pelo Google. Contas novas só entram no sistema depois da aprovação de um administrador.</p>
    <button class="planes-auth-btn" data-google ${capabilities.google ? '' : 'disabled'}>${googleLabel}</button>
    <p class="planes-auth-muted" style="font-size:12px;margin:10px 0 0">${providerText}</p>
    <button class="planes-auth-btn link" data-admin-toggle style="margin-top:12px">Acesso administrativo de contingência</button>
    <div class="planes-auth-hide" data-admin-wrap style="border-top:1px solid #e2e8f0;padding-top:16px">
      <p class="planes-auth-muted" style="font-size:12px;margin-top:0">Reservado à conta administrativa já existente. Este formulário não cria novos usuários.</p>
      <form class="planes-auth-grid" data-admin-form>
        <input class="planes-auth-input" data-email type="email" autocomplete="email" placeholder="E-mail administrativo" required />
        <input class="planes-auth-input" data-password type="password" autocomplete="current-password" placeholder="Senha" required />
        <button class="planes-auth-btn secondary" type="submit">Entrar como administrador</button>
      </form>
    </div>
    <div class="planes-auth-status planes-auth-hide" data-auth-message></div>
  `);

  node.querySelector('[data-google]')?.addEventListener('click', async () => {
    if (!capabilities.google) return;
    const button = node.querySelector('[data-google]');
    button.disabled = true;
    button.textContent = 'Abrindo Google…';
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: REDIRECT_TO },
    });
    if (error) {
      button.disabled = false;
      button.textContent = 'Continuar com Google';
      renderMessage(node, `Google não pôde iniciar: ${error.message}`, 'planes-auth-bad');
    }
  });

  node.querySelector('[data-admin-toggle]')?.addEventListener('click', () => {
    node.querySelector('[data-admin-wrap]')?.classList.toggle('planes-auth-hide');
  });

  node.querySelector('[data-admin-form]')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = node.querySelector('[data-email]')?.value?.trim() || '';
    const password = node.querySelector('[data-password]')?.value || '';
    const submit = node.querySelector('[data-admin-form] button[type="submit"]');
    submit.disabled = true;
    submit.textContent = 'Processando…';
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      submit.disabled = false;
      submit.textContent = 'Entrar como administrador';
      renderMessage(node, `Login administrativo não concluído: ${error.message}`, 'planes-auth-bad');
    }
  });
}

function renderPending(user, profile) {
  const node = renderShell(`
    <div style="display:inline-flex;padding:7px 11px;border-radius:999px;background:#fff7d6;color:#8a6400;font-size:12px;font-weight:700;margin-bottom:18px">AGUARDANDO AUTORIZAÇÃO</div>
    <h1>Solicitação recebida.</h1>
    <p class="planes-auth-muted">Sua identidade Google foi validada. O acesso ao Planes OS está aguardando autorização do administrador.</p>
    <div class="planes-auth-status planes-auth-warn">Status: pending\nE-mail: ${escapeHtml(profile?.email || user.email || '')}</div>
    <div class="planes-auth-grid" style="margin-top:14px">
      <button class="planes-auth-btn" data-refresh>Atualizar status</button>
      <button class="planes-auth-btn secondary" data-logout>Sair</button>
    </div>
    <div class="planes-auth-status planes-auth-hide" data-auth-message></div>
  `);
  node.querySelector('[data-refresh]')?.addEventListener('click', () => void evaluateSession({ user }));
  node.querySelector('[data-logout]')?.addEventListener('click', () => void supabase.auth.signOut());
}

function renderBlocked(user, profile) {
  const suspended = profile.status === 'suspended';
  const node = renderShell(`
    <h1>${suspended ? 'Acesso suspenso' : 'Acesso não autorizado'}</h1>
    <p class="planes-auth-muted">Este perfil não possui acesso operacional ao Planes OS. Procure o administrador responsável caso precise revisar a situação.</p>
    <div class="planes-auth-status planes-auth-bad">Status: ${escapeHtml(profile.status)}\nE-mail: ${escapeHtml(profile.email || user.email || '')}</div>
    <button class="planes-auth-btn secondary" data-logout style="margin-top:14px">Sair</button>
  `);
  node.querySelector('[data-logout]')?.addEventListener('click', () => void supabase.auth.signOut());
}

function renderProfileError(user, message) {
  const node = renderShell(`
    <h1>Perfil indisponível</h1>
    <p class="planes-auth-muted">Não foi possível confirmar seu nível de acesso.</p>
    <div class="planes-auth-status planes-auth-bad">${escapeHtml(message)}</div>
    <button class="planes-auth-btn secondary" data-logout style="margin-top:14px">Sair</button>
  `);
  node.querySelector('[data-logout]')?.addEventListener('click', () => void supabase.auth.signOut());
}

async function subscribeProfile(userId) {
  if (profileChannel) await supabase.removeChannel(profileChannel);
  profileChannel = supabase
    .channel(`planes-live-profile-${userId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'profiles',
      filter: `id=eq.${userId}`,
    }, () => void evaluateCurrentSession())
    .subscribe();
}

async function evaluateSession(session) {
  if (!session?.user) {
    if (profileChannel) {
      await supabase.removeChannel(profileChannel);
      profileChannel = null;
    }
    renderLogin();
    return;
  }

  const user = session.user;
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id,email,status,role,approved_at')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    renderProfileError(user, error?.message || 'Perfil não encontrado.');
    return;
  }

  await subscribeProfile(user.id);

  if (profile.status === 'approved') {
    allowApp();
    return;
  }
  if (profile.status === 'pending') {
    renderPending(user, profile);
    return;
  }
  if (profile.status === 'rejected' || profile.status === 'suspended') {
    renderBlocked(user, profile);
    return;
  }

  renderProfileError(user, `Status de acesso desconhecido: ${profile.status}`);
}

async function evaluateCurrentSession() {
  const { data: { session } } = await supabase.auth.getSession();
  await evaluateSession(session);
}

async function boot() {
  await loadCapabilities();
  await evaluateCurrentSession();
  supabase.auth.onAuthStateChange((_event, nextSession) => {
    window.setTimeout(() => void evaluateSession(nextSession), 0);
  });
}

void boot().catch((error) => {
  const node = renderShell(`
    <h1>Não foi possível iniciar o acesso seguro</h1>
    <p class="planes-auth-muted">Tente recarregar a página. Se o problema persistir, use o ambiente de homologação ou contate o administrador.</p>
    <div class="planes-auth-status planes-auth-bad">${escapeHtml(error?.message || 'Erro inesperado.')}</div>
  `);
  blockApp();
  node.setAttribute('data-auth-fatal', 'true');
});
