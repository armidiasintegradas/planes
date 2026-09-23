window.__PLANES_EXTERNAL_AUTH_OWNER__ = true;
window.__PLANES_AUTH_GATE_ACTIVE__ = true;
const createClient = window.supabase?.createClient?.bind(window.supabase) || null;

const SUPABASE_URL = 'https://xfgcbxppsbwmxwsuajou.supabase.co';
const SUPABASE_KEY = 'sb_publishable_tFvlFVbpOPYPPA72qcMWQg_IZO4V4xS';
const REDIRECT_TO = 'https://armidiasintegradas.github.io/planes/';
// OAuth policy: one implicit flow across Safari and installed PWA.
const IS_STANDALONE_IOS =
  window.navigator.standalone === true ||
  window.matchMedia?.('(display-mode: standalone)')?.matches === true;
const ROOT_ID = 'planes-auth-root';
const STYLE_ID = 'planes-auth-live-style';
const PASSKEY_DISMISS_KEY = 'planes-passkey-offer-dismissed';

const supabase = window.__PLANES_SUPABASE_CLIENT__ || (createClient ? createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    flowType: 'implicit',
    experimental: { passkey: true },
  },
}) : null);

if (supabase && !window.__PLANES_SUPABASE_CLIENT__) {
  window.__PLANES_SUPABASE_CLIENT__ = supabase;
}

let profileChannel = null;
let capabilities = { email: true, google: false, passkeys: false };
let authBootFinished = false;
let oauthCallbackInProgress = false;
let lastEvaluatedUserId = null;
let evaluationInFlight = null;

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
    #${ROOT_ID}{position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;padding:24px;background:radial-gradient(circle at 12% 14%,#ffffff 0%,#eef2f5 48%,#e6ebef 100%);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#111827;visibility:visible!important;pointer-events:auto!important;overflow:hidden}
    #${ROOT_ID} *{box-sizing:border-box}
    #${ROOT_ID} .planes-auth-card{width:min(92vw,470px);background:rgba(255,255,255,.96);border:1px solid rgba(226,232,240,.9);border-radius:28px;padding:34px;box-shadow:0 28px 80px rgba(15,23,42,.13);backdrop-filter:blur(18px)}
    #${ROOT_ID} .planes-auth-logo-wrap{display:flex;align-items:center;justify-content:flex-start;margin:0 0 26px}
    #${ROOT_ID} .planes-auth-logo{display:block;width:min(210px,58vw);height:auto;object-fit:contain}
    #${ROOT_ID} .planes-auth-subtitle{font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#94a3b8;margin:-15px 0 24px}
    #${ROOT_ID} h1{font-size:30px;line-height:1.08;letter-spacing:-.045em;margin:0 0 10px;font-weight:780}
    #${ROOT_ID} .planes-auth-muted{color:#64748b;line-height:1.55}
    #${ROOT_ID} .planes-auth-splash{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#fff;opacity:1;transition:opacity .45s ease;cursor:pointer}
    #${ROOT_ID} .planes-auth-splash.exiting{opacity:0;pointer-events:none}
    #${ROOT_ID} .planes-auth-splash-logo{width:min(310px,62vw);height:auto;object-fit:contain;animation:planesSplashEntrance 1.05s cubic-bezier(.2,.8,.2,1) both;filter:drop-shadow(0 14px 28px rgba(15,23,42,.10))}
    @keyframes planesSplashEntrance{0%{opacity:0;transform:scale(.88) translateY(10px)}55%{opacity:1;transform:scale(1.025) translateY(0)}100%{opacity:1;transform:scale(1) translateY(0)}}
    #${ROOT_ID} .planes-auth-grid{display:grid;gap:12px}
    #${ROOT_ID} .planes-auth-input,#${ROOT_ID} .planes-auth-btn{width:100%;height:48px;border-radius:14px;font:inherit}
    #${ROOT_ID} .planes-auth-input{border:1px solid #dbe2ea;padding:0 14px;background:#fff;color:#111827}
    #${ROOT_ID} .planes-auth-btn{border:0;background:#111827;color:#fff;font-weight:800;cursor:pointer}
    #${ROOT_ID} .planes-auth-btn.secondary{background:#fff;color:#111827;border:1px solid #dbe2ea}
    #${ROOT_ID} .planes-auth-btn.passkey{background:#d4ff00;color:#111827;border:1px solid #c4ed00}
    #${ROOT_ID} .planes-auth-btn.link{background:transparent;color:#475569;height:auto;padding:10px}
    #${ROOT_ID} .planes-auth-btn:disabled{opacity:.55;cursor:not-allowed}
    #${ROOT_ID} .planes-auth-divider{display:flex;align-items:center;gap:10px;color:#94a3b8;font-size:11px;margin:13px 0}
    #${ROOT_ID} .planes-auth-divider:before,#${ROOT_ID} .planes-auth-divider:after{content:"";height:1px;background:#e2e8f0;flex:1}
    #${ROOT_ID} .planes-auth-status{margin-top:16px;padding:13px;border-radius:12px;background:#f8fafc;border:1px solid #e2e8f0;font-size:13px;white-space:pre-wrap;line-height:1.5}
    #${ROOT_ID} .planes-auth-good{background:#f0fdf4;border-color:#bbf7d0;color:#166534}
    #${ROOT_ID} .planes-auth-warn{background:#fffbeb;border-color:#fde68a;color:#854d0e}
    #${ROOT_ID} .planes-auth-bad{background:#fff1f2;border-color:#fecdd3;color:#9f1239}
    #${ROOT_ID} .planes-auth-hide{display:none!important}
    @media(max-width:520px){
      #${ROOT_ID}{padding:18px}
      #${ROOT_ID} .planes-auth-card{padding:28px 24px;border-radius:24px}
      #${ROOT_ID} h1{font-size:28px}
      #${ROOT_ID} .planes-auth-logo{width:min(190px,56vw)}
      #${ROOT_ID} .planes-auth-splash-logo{width:min(270px,64vw)}
    }
    @media(prefers-reduced-motion:reduce){
      #${ROOT_ID} .planes-auth-splash-logo{animation:none}
      #${ROOT_ID} .planes-auth-splash{transition-duration:.18s}
    }
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

function hydratePlanesFromSupabase(user, profile) {
  if (!user || !profile || profile.status !== 'approved') return false;

  const payload = {
    user: {
      id: profile.id || user.id,
      auth_user_id: user.id,
      name: profile.full_name || user.user_metadata?.full_name || user.user_metadata?.name || (profile.email || user.email || 'Usuário').split('@')[0],
      email: profile.email || user.email || '',
      role: profile.role || 'campo',
      role_id: profile.role || 'campo',
      level: profile.role || 'campo',
      status: 'Aprovado',
      avatar: profile.avatar_url || ((profile.full_name || user.user_metadata?.full_name || user.email || 'US').slice(0, 2).toUpperCase()),
    },
    profile: {
      id: profile.id || user.id,
      email: profile.email || user.email || '',
      role: profile.role || 'campo',
      status: profile.status,
    },
  };

  // O runtime principal é a única fonte de verdade para aplicar identidade.
  // Se ele ainda não terminou de carregar, o payload fica disponível em window
  // e será consumido no fim do script principal.
  window.__PLANES_AUTH_BRIDGE_PAYLOAD__ = payload;

  if (typeof window.applySupabaseAuthPayload === 'function') {
    try {
      const applied = window.applySupabaseAuthPayload(payload);
      if (applied) return true;
    } catch (error) {
      console.warn('Direct runtime auth hydrate failed:', error);
    }
  }

  window.dispatchEvent(new CustomEvent('planes-auth-payload-ready', {
    detail: payload
  }));
  return false;
}

function allowApp(profile = null, user = null) {
  let released = false;
  let stopped = false;
  let attempts = 0;
  let lastHydrationError = null;

  const cleanup = () => {
    window.removeEventListener('planes-auth-hydration-failed', onHydrationFailed);
  };

  const releaseApp = () => {
    if (released || stopped) return;
    released = true;
    cleanup();
    document.documentElement.classList.remove('planes-auth-loading', 'planes-auth-blocked');
    document.getElementById(ROOT_ID)?.remove();
    window.dispatchEvent(new CustomEvent('planes-auth-approved', {
      detail: { user, profile }
    }));

    if (profile && ['super_admin', 'admin'].includes(profile.role)) {
      window.setTimeout(() => void mountAdminAccessConsole(profile), 0);
    }
  };

  const onHydrated = () => releaseApp();
  const onHydrationFailed = (event) => {
    lastHydrationError =
      event?.detail?.message ||
      window.__PLANES_AUTH_LAST_ERROR__ ||
      'Falha desconhecida no runtime.';
  };

  window.addEventListener('planes-auth-legacy-hydrated', onHydrated, { once: true });
  window.addEventListener('planes-auth-hydration-failed', onHydrationFailed);

  blockApp();

  const attemptHydration = () => {
    if (released || stopped) return;
    attempts += 1;

    const applied = hydratePlanesFromSupabase(user, profile);
    if (applied || window.__PLANES_AUTH_HYDRATED__ === true) {
      releaseApp();
      return;
    }

    if (attempts < 240) {
      window.setTimeout(attemptHydration, 125);
      return;
    }

    stopped = true;
    cleanup();
    window.removeEventListener('planes-auth-legacy-hydrated', onHydrated);

    const detail = lastHydrationError || window.__PLANES_AUTH_LAST_ERROR__;
    const node = root();
    node.innerHTML = `
      <section class="planes-auth-card">
        <div class="planes-auth-brand">PLANES OS</div>
        <div class="planes-auth-subtitle">Ambiente seguro de gestão operacional</div>
        <h1>Não foi possível iniciar a interface</h1>
        <p>Sua sessão e seu perfil foram validados, mas o runtime do Planes não concluiu a renderização.</p>
        <div class="planes-auth-message planes-auth-bad">${escapeHtml(detail || 'O runtime não confirmou a inicialização.')}</div>
        <button class="planes-auth-btn secondary" data-runtime-reload style="margin-top:14px">Recarregar o Planes</button>
      </section>`;
    node.querySelector('[data-runtime-reload]')?.addEventListener('click', () => window.location.reload());
  };

  attemptHydration();

  window.setTimeout(() => {
    if (released || stopped) return;
    const node = root();
    node.innerHTML = `
      <section class="planes-auth-card">
        <div class="planes-auth-brand">PLANES OS</div>
        <div class="planes-auth-subtitle">Ambiente seguro de gestão operacional</div>
        <h1>Inicializando seu ambiente</h1>
        <p>Sua sessão e seu perfil já foram validados. Estamos aguardando apenas a interface do Planes.</p>
        <div class="planes-auth-message planes-auth-good">A inicialização continua automaticamente. Não é necessário refazer o login.</div>
      </section>`;
  }, 4000);
}

async function mountAdminAccessConsole(profile) {
  const existing = document.getElementById('planes-admin-access-launcher');
  if (existing) existing.remove();

  const launcher = document.createElement('button');
  launcher.id = 'planes-admin-access-launcher';
  launcher.type = 'button';
  launcher.setAttribute('aria-label', 'Abrir solicitações de acesso');
  launcher.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:2147483646;border:0;border-radius:999px;background:#111827;color:#fff;padding:12px 16px;font:700 13px Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;box-shadow:0 12px 30px rgba(15,23,42,.24);cursor:pointer';
  launcher.textContent = 'Acessos';

  async function refreshCount() {
    const { count } = await supabase
      .from('access_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');
    launcher.textContent = count ? `Acessos · ${count}` : 'Acessos';
  }

  launcher.addEventListener('click', () => void openAdminAccessConsole(profile, refreshCount));
  document.body.appendChild(launcher);
  await refreshCount();
}

async function openAdminAccessConsole(profile, refreshCount) {
  document.getElementById('planes-admin-access-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'planes-admin-access-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgba(15,23,42,.48);display:grid;place-items:center;padding:16px;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#111827';
  overlay.innerHTML = `
    <section style="width:min(96vw,860px);max-height:92dvh;overflow:auto;background:#f8fafc;border-radius:24px;box-shadow:0 30px 80px rgba(15,23,42,.35);border:1px solid #e2e8f0">
      <header style="position:sticky;top:0;background:#fff;padding:20px 22px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;gap:16px;align-items:center;z-index:2">
        <div>
          <div style="font-size:11px;font-weight:900;letter-spacing:.14em">PLANES OS · ADMIN</div>
          <h2 style="margin:6px 0 0;font-size:24px;letter-spacing:-.03em">Solicitações de acesso</h2>
        </div>
        <button type="button" data-admin-close style="border:1px solid #dbe2ea;background:#fff;border-radius:12px;padding:10px 14px;font-weight:800;cursor:pointer">Fechar</button>
      </header>
      <div data-admin-message style="display:none;margin:16px 22px 0;padding:12px 14px;border:1px solid #e2e8f0;background:#fff;border-radius:12px;font-size:13px"></div>
      <div data-admin-list style="padding:18px 22px 24px;display:grid;gap:12px">
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:18px;padding:18px;color:#64748b">Carregando solicitações…</div>
      </div>
    </section>`;

  overlay.querySelector('[data-admin-close]')?.addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (event) => { if (event.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);

  const list = overlay.querySelector('[data-admin-list]');
  const message = overlay.querySelector('[data-admin-message]');

  function showMessage(text, ok = true) {
    if (!message) return;
    message.style.display = 'block';
    message.style.borderColor = ok ? '#bbf7d0' : '#fecaca';
    message.style.background = ok ? '#f0fdf4' : '#fff1f2';
    message.style.color = ok ? '#166534' : '#991b1b';
    message.textContent = text;
  }

  async function loadRows() {
    const { data: requests, error: requestError } = await supabase
      .from('access_requests')
      .select('id,user_id,status,requested_at,reviewed_at,rejection_reason,admin_notes')
      .order('requested_at', { ascending: false });
    if (requestError) {
      list.innerHTML = '<div style="background:#fff;border:1px solid #fecaca;border-radius:18px;padding:18px;color:#991b1b">Falha ao carregar solicitações.</div>';
      return;
    }

    const userIds = [...new Set((requests || []).map((item) => item.user_id))];
    let profiles = [];
    if (userIds.length) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id,full_name,email,status,role')
        .in('id', userIds);
      if (!error) profiles = data || [];
    }

    const profileMap = new Map(profiles.map((item) => [item.id, item]));
    if (!requests?.length) {
      list.innerHTML = '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:18px;padding:18px;color:#64748b">Nenhuma solicitação registrada.</div>';
      await refreshCount();
      return;
    }

    list.innerHTML = requests.map((request) => {
      const user = profileMap.get(request.user_id) || {};
      const pending = request.status === 'pending';
      return `
        <article data-request-id="${escapeHtml(request.id)}" style="background:#fff;border:1px solid #e2e8f0;border-radius:18px;padding:18px">
          <div style="display:flex;justify-content:space-between;gap:14px;align-items:flex-start;flex-wrap:wrap">
            <div>
              <strong style="font-size:16px">${escapeHtml(user.full_name || user.email || request.user_id)}</strong>
              <div style="font-size:13px;color:#64748b;margin-top:4px">${escapeHtml(user.email || '')}</div>
              <div style="font-size:12px;color:#94a3b8;margin-top:5px">${new Date(request.requested_at).toLocaleString('pt-BR')}</div>
            </div>
            <span style="padding:6px 9px;border-radius:999px;font-size:11px;font-weight:900;background:${pending ? '#fff7d6' : '#eef2f7'};color:${pending ? '#8a6400' : '#475569'}">${escapeHtml(request.status.toUpperCase())}</span>
          </div>
          ${pending ? `
            <div style="display:grid;grid-template-columns:minmax(180px,260px) 1fr;gap:10px;margin-top:16px;align-items:center">
              <select data-role style="height:42px;border:1px solid #dbe2ea;border-radius:11px;padding:0 10px;background:#fff;font:inherit">
                ${profile.role === 'super_admin' ? '<option value="super_admin">Super administrador</option>' : ''}
                <option value="admin">Administrador</option>
                <option value="gestor">Gestor</option>
                <option value="engenharia">Engenharia</option>
                <option value="campo">Campo</option>
                <option value="financeiro">Financeiro</option>
                <option value="cliente" selected>Cliente</option>
              </select>
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                <button type="button" data-approve style="border:0;background:#111827;color:#fff;border-radius:11px;padding:11px 14px;font-weight:800;cursor:pointer">Aprovar</button>
                <button type="button" data-reject style="border:1px solid #fecaca;background:#fff;color:#b91c1c;border-radius:11px;padding:11px 14px;font-weight:800;cursor:pointer">Rejeitar</button>
              </div>
            </div>
          ` : ''}
        </article>`;
    }).join('');

    for (const card of list.querySelectorAll('[data-request-id]')) {
      const requestId = card.getAttribute('data-request-id');
      const approve = card.querySelector('[data-approve]');
      const reject = card.querySelector('[data-reject]');
      const roleSelect = card.querySelector('[data-role]');

      approve?.addEventListener('click', async () => {
        approve.disabled = true;
        const { data, error } = await supabase.functions.invoke('admin-review-access', {
          body: {
            requestId,
            decision: 'approve',
            role: roleSelect?.value || 'cliente',
            projectIds: [],
            workIds: [],
          },
        });
        if (error || !data?.ok) {
          showMessage(data?.error || error?.message || 'Não foi possível aprovar o acesso.', false);
          approve.disabled = false;
          return;
        }
        showMessage('Acesso aprovado com sucesso.');
        await loadRows();
      });

      reject?.addEventListener('click', async () => {
        const reason = window.prompt('Motivo da rejeição:')?.trim();
        if (!reason) return;
        reject.disabled = true;
        const { data, error } = await supabase.functions.invoke('admin-review-access', {
          body: {
            requestId,
            decision: 'reject',
            role: null,
            projectIds: [],
            workIds: [],
            rejectionReason: reason,
          },
        });
        if (error || !data?.ok) {
          showMessage(data?.error || error?.message || 'Não foi possível rejeitar a solicitação.', false);
          reject.disabled = false;
          return;
        }
        showMessage('Solicitação rejeitada.');
        await loadRows();
      });
    }

    await refreshCount();
  }

  await loadRows();
}

function renderShell(body) {
  blockApp();
  const node = root();
  node.innerHTML = `<main class="planes-auth-card"><div class="planes-auth-logo-wrap"><img class="planes-auth-logo" src="assets/planes-logo.png" alt="PLANES" /></div><div class="planes-auth-subtitle">Gestão operacional inteligente</div>${body}</main>`;
  return node;
}

async function renderLoginSplash() {
  const key = 'planes_login_splash_viewed';
  let alreadyViewed = false;
  try { alreadyViewed = sessionStorage.getItem(key) === '1'; } catch {}

  const params = new URLSearchParams(window.location.search);
  if (params.get('nosplash') === '1') alreadyViewed = true;
  const locked = params.get('splash_lock') === '1' || params.get('splash') === '1';

  if (alreadyViewed && !locked) {
    renderLogin();
    return;
  }

  blockApp();
  const node = root();
  node.innerHTML = `
    <div class="planes-auth-splash" data-login-splash aria-label="PLANES — abertura">
      <img class="planes-auth-splash-logo" src="assets/planes-logo.png" alt="PLANES" />
    </div>
  `;

  const splash = node.querySelector('[data-login-splash]');
  if (!splash) {
    renderLogin();
    return;
  }

  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
  const visibleMs = reducedMotion ? 420 : 2550;
  const fadeMs = reducedMotion ? 180 : 450;
  let finished = false;

  await new Promise((resolve) => {
    const finish = () => {
      if (finished) return;
      finished = true;
      splash.classList.add('exiting');
      window.setTimeout(resolve, fadeMs);
    };

    const timer = locked ? null : window.setTimeout(finish, visibleMs);
    splash.addEventListener('click', () => {
      if (timer) window.clearTimeout(timer);
      finish();
    }, { once: true });
  });

  try { sessionStorage.setItem(key, '1'); } catch {}
  renderLogin();
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
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 3500);
    let response;
    try {
      response = await fetch(settingsUrl, {
        cache: 'no-store',
        headers: { apikey: SUPABASE_KEY },
        signal: controller.signal,
      });
    } finally {
      window.clearTimeout(timeout);
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const settings = await response.json();
    capabilities = {
      email: settings.external?.email === true,
      google: settings.external?.google === true,
      passkeys: settings.passkeys_enabled === true,
    };
  } catch {
    capabilities = { email: true, google: false, passkeys: false };
  }
  return capabilities;
}

async function handlePasskeySignIn(node) {
  const button = node.querySelector('[data-passkey]');
  if (!capabilities.passkeys || !button) return;
  button.disabled = true;
  button.textContent = 'Verificando dispositivo…';
  const { error } = await supabase.auth.signInWithPasskey();
  if (error) {
    button.disabled = false;
    button.textContent = 'Entrar com Face ID / Passkey';
    renderMessage(node, `Passkey não pôde autenticar: ${error.message}`, 'planes-auth-bad');
  }
}

function renderLogin() {
  const googleLabel = capabilities.google ? 'Continuar com Google' : 'Google temporariamente indisponível';
  const providerText = capabilities.google
    ? 'Primeiro acesso: use o Google. Depois da aprovação, você pode ativar Face ID / Passkey para entrar mais rápido.'
    : 'Não foi possível confirmar o provider Google agora. O acesso administrativo de contingência continua disponível.';

  const passkeyButton = capabilities.passkeys
    ? '<button class="planes-auth-btn passkey" data-passkey>Entrar com Face ID / Passkey</button><div class="planes-auth-divider">ou</div>'
    : '';

  const node = renderShell(`
    <h1>Acesse o PLANES</h1>
    <p class="planes-auth-muted" style="margin:0 0 22px">Entre com sua conta autorizada para continuar.</p>
    ${passkeyButton}
    <button class="planes-auth-btn" data-google ${capabilities.google ? '' : 'disabled'}>${googleLabel}</button>
    <p class="planes-auth-muted" style="font-size:12px;margin:10px 0 0">${providerText}</p>
    <button class="planes-auth-btn link" data-admin-toggle style="margin-top:12px">Acesso administrativo</button>
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

  node.querySelector('[data-passkey]')?.addEventListener('click', () => void handlePasskeySignIn(node));

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
    <p class="planes-auth-muted">Sua identidade foi validada. O acesso ao Planes OS está aguardando autorização do administrador.</p>
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

function renderPasskeyOffer(user, profile) {
  const node = renderShell(`
    <div style="display:inline-flex;padding:7px 11px;border-radius:999px;background:#ecfccb;color:#365314;font-size:12px;font-weight:800;margin-bottom:18px">ACESSO APROVADO</div>
    <h1>Ative o acesso mais rápido.</h1>
    <p class="planes-auth-muted">Cadastre uma Passkey para os próximos acessos. Dependendo do dispositivo, você poderá usar Face ID, Touch ID, Windows Hello ou o gerenciador de senhas.</p>
    <div class="planes-auth-status planes-auth-good">Perfil: ${escapeHtml(profile.role || 'aprovado')}\nE-mail: ${escapeHtml(profile.email || user.email || '')}</div>
    <div class="planes-auth-grid" style="margin-top:16px">
      <button class="planes-auth-btn passkey" data-register-passkey>Cadastrar Face ID / Passkey</button>
      <button class="planes-auth-btn secondary" data-passkey-later>Agora não</button>
    </div>
    <div class="planes-auth-status planes-auth-hide" data-auth-message></div>
  `);

  node.querySelector('[data-register-passkey]')?.addEventListener('click', async () => {
    const button = node.querySelector('[data-register-passkey]');
    button.disabled = true;
    button.textContent = 'Abrindo segurança do dispositivo…';
    const { error } = await supabase.auth.registerPasskey();
    if (error) {
      button.disabled = false;
      button.textContent = 'Cadastrar Face ID / Passkey';
      renderMessage(node, `Não foi possível cadastrar a Passkey: ${error.message}`, 'planes-auth-bad');
      return;
    }
    localStorage.removeItem(PASSKEY_DISMISS_KEY);
    allowApp(profile, user);
  });

  node.querySelector('[data-passkey-later]')?.addEventListener('click', () => {
    localStorage.setItem(PASSKEY_DISMISS_KEY, '1');
    allowApp(profile, user);
  });
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

async function fetchProfileWithRetry(session, attempts = 6) {
  const userId = session?.user?.id;
  const accessToken = session?.access_token;
  let lastError = null;

  if (!userId || !accessToken) {
    return { data: null, error: new Error('authenticated_session_missing') };
  }

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const endpoint = new URL(`${SUPABASE_URL}/rest/v1/profiles`);
      endpoint.searchParams.set('id', `eq.${userId}`);
      endpoint.searchParams.set('select', 'id,email,full_name,avatar_url,status,role,approved_at');

      const response = await fetch(endpoint.toString(), {
        method: 'GET',
        cache: 'no-store',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });

      if (response.ok) {
        const rows = await response.json();
        const profile = Array.isArray(rows) ? rows[0] : null;
        if (profile) return { data: profile, error: null };
        lastError = new Error('profile_not_ready');
      } else {
        const body = await response.text();
        lastError = new Error(`profile_http_${response.status}: ${body.slice(0, 180)}`);
      }
    } catch (error) {
      lastError = error;
    }

    if (attempt < attempts - 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 300 + (attempt * 300)));
    }
  }

  return { data: null, error: lastError || new Error('profile_not_ready') };
}

async function evaluateSession(session) {
  if (!session?.user) {
    if (profileChannel) {
      await supabase.removeChannel(profileChannel);
      profileChannel = null;
    }
    await renderLoginSplash();
    return;
  }

  const user = session.user;
  const { data: profile, error } = await fetchProfileWithRetry(session);

  if (error || !profile) {
    renderProfileError(user, error?.message || 'Perfil não encontrado.');
    return;
  }

  await subscribeProfile(user.id);

  if (profile.status === 'approved') {
    if (capabilities.passkeys) {
      const { data: passkeys, error: passkeyError } = await supabase.auth.passkey.list();
      const dismissed = localStorage.getItem(PASSKEY_DISMISS_KEY) === '1';
      if (!passkeyError && Array.isArray(passkeys) && passkeys.length === 0 && !dismissed) {
        renderPasskeyOffer(user, profile);
        return;
      }
    }
    allowApp(profile, user);
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

async function resetPlanesRuntimeAfterSignOut() {
  try {
    localStorage.removeItem('planes_active_session');
    localStorage.removeItem(PASSKEY_DISMISS_KEY);
    delete window.__PLANES_AUTH_BRIDGE_PAYLOAD__;
    delete window.__PLANES_AUTH_HYDRATED__;
    delete window.__PLANES_AUTH_INTERNAL_APPLIED__;
    delete window.__PLANES_AUTH_APPLIED_USER_ID__;
  } catch {}

  const script = document.createElement('script');
  script.setAttribute('data-planes-signout-reset', '1');
  script.textContent = `
    (() => {
      try {
        if (typeof currentUser !== 'undefined') currentUser = null;
        if (typeof currentScreen !== 'undefined') currentScreen = 'login';
        if (typeof selectedProjectId !== 'undefined') selectedProjectId = null;
        if (typeof selectedProject !== 'undefined') selectedProject = null;
        if (typeof activeNav !== 'undefined') activeNav = 'Visão Geral';
        if (typeof render === 'function') render();
      } catch (error) {
        console.warn('Planes runtime reset warning:', error);
      }
    })();
  `;
  document.documentElement.appendChild(script);
  script.remove();
}

function installSecureLogoutBridge() {
  let attempts = 0;

  const install = () => {
    attempts += 1;
    const legacyLogout = window.doLogout;

    if (typeof legacyLogout !== 'function') {
      if (attempts < 120) window.setTimeout(install, 50);
      return;
    }

    if (legacyLogout.__planesSupabaseWrapped) return;

    const wrappedLogout = async function(...args) {
      try {
        const { error } = await supabase.auth.signOut();
        if (error) console.warn('Supabase signOut warning:', error);
      } catch (error) {
        console.warn('Supabase signOut failed:', error);
      }

      await resetPlanesRuntimeAfterSignOut();

      try {
        return await legacyLogout.apply(this, args);
      } catch (error) {
        console.warn('Legacy logout warning:', error);
      }
    };

    wrappedLogout.__planesSupabaseWrapped = true;
    window.doLogout = wrappedLogout;
  };

  install();
}

async function evaluateCurrentSession() {
  const { data: { session } } = await supabase.auth.getSession();
  await evaluateSession(session);
}

async function waitForDocumentBody() {
  if (document.body) return;

  await new Promise((resolve) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', resolve, { once: true });
      return;
    }

    const check = () => {
      if (document.body) {
        resolve();
        return;
      }
      window.setTimeout(check, 0);
    };
    check();
  });
}

async function completeOAuthCallbackIfPresent() {
  const url = new URL(window.location.href);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const hashError = hash.get('error') || hash.get('error_code');
  const hashErrorDescription = hash.get('error_description');
  const accessToken = hash.get('access_token');
  const refreshToken = hash.get('refresh_token');

  if (hashError) {
    const node = renderShell(`
      <h1>Não foi possível concluir o login Google</h1>
      <p class="planes-auth-muted">O Google retornou uma falha de autenticação.</p>
      <div class="planes-auth-status planes-auth-bad">${escapeHtml(hashErrorDescription || hashError)}</div>
      <button class="planes-auth-btn secondary" data-return-login style="margin-top:14px">Voltar para o login</button>
    `);
    node.querySelector('[data-return-login]')?.addEventListener('click', () => {
      window.history.replaceState({}, document.title, REDIRECT_TO);
      window.location.replace(REDIRECT_TO);
    });
    blockApp();
    return { handled: true, session: null, failed: true };
  }

  if (accessToken && refreshToken) {
    blockApp();
    renderShell(`
      <h1>Concluindo seu acesso</h1>
      <p class="planes-auth-muted">Sua conta Google foi validada. Estamos criando sua sessão segura no Planes OS.</p>
      <div class="planes-auth-status planes-auth-good">Autenticação concluída. Carregando seu perfil…</div>
    `);

    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error || !data?.session) {
      const node = renderShell(`
        <h1>Não foi possível concluir a sessão</h1>
        <p class="planes-auth-muted">O Google autenticou sua conta, mas a sessão local não pôde ser gravada.</p>
        <div class="planes-auth-status planes-auth-bad">${escapeHtml(error?.message || 'Sessão não criada.')}</div>
        <button class="planes-auth-btn secondary" data-retry-google style="margin-top:14px">Tentar Google novamente</button>
      `);
      node.querySelector('[data-retry-google]')?.addEventListener('click', () => {
        window.history.replaceState({}, document.title, REDIRECT_TO);
        window.location.replace(REDIRECT_TO);
      });
      return { handled: true, session: null, failed: true };
    }

    window.history.replaceState({}, document.title, REDIRECT_TO);
    return { handled: true, session: data.session, failed: false };
  }

  const oauthError = url.searchParams.get('error');
  const oauthErrorDescription = url.searchParams.get('error_description');

  if (oauthError) {
    const node = renderShell(`
      <h1>Não foi possível concluir o login Google</h1>
      <p class="planes-auth-muted">O Google retornou uma falha de autenticação.</p>
      <div class="planes-auth-status planes-auth-bad">${escapeHtml(oauthErrorDescription || oauthError)}</div>
      <button class="planes-auth-btn secondary" data-return-login style="margin-top:14px">Voltar para o login</button>
    `);
    node.querySelector('[data-return-login]')?.addEventListener('click', () => {
      window.history.replaceState({}, document.title, REDIRECT_TO);
      window.location.replace(REDIRECT_TO);
    });
    blockApp();
    return { handled: true, session: null, failed: true };
  }

  const code = url.searchParams.get('code');
  if (code) {
    blockApp();
    const node = renderShell(`
      <h1>Atualizando seu login</h1>
      <p class="planes-auth-muted">Detectamos um retorno antigo de autenticação. Vamos concluir ou renovar o acesso.</p>
      <div class="planes-auth-status planes-auth-good">Processando…</div>
    `);

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data?.session) {
      window.history.replaceState({}, document.title, REDIRECT_TO);
      return { handled: true, session: data.session, failed: false };
    }

    node.innerHTML = `
      <main class="planes-auth-card">
        <div class="planes-auth-brand">PLANES OS</div>
        <p class="planes-auth-muted" style="font-size:12px;margin:5px 0 22px">Ambiente seguro de gestão operacional</p>
        <h1>Atualize seu acesso Google</h1>
        <p class="planes-auth-muted">O retorno anterior usava um fluxo antigo. O PLANES agora usa um fluxo compatível com Safari e PWA no iPhone.</p>
        <button class="planes-auth-btn" data-new-google style="margin-top:14px">Entrar novamente com Google</button>
      </main>`;
    node.querySelector('[data-new-google]')?.addEventListener('click', () => {
      window.history.replaceState({}, document.title, REDIRECT_TO);
      window.location.replace(REDIRECT_TO);
    });
    return { handled: true, session: null, failed: true };
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    return { handled: true, session, failed: false };
  }

  return { handled: false, session: null, failed: false };
}

async function evaluateSessionSerialized(session, reason = 'unknown') {
  const userId = session?.user?.id || null;

  if (
    userId &&
    lastEvaluatedUserId === userId &&
    window.__PLANES_AUTH_HYDRATED__ === true
  ) {
    return;
  }

  if (evaluationInFlight) {
    try { await evaluationInFlight; } catch {}
    if (
      userId &&
      lastEvaluatedUserId === userId &&
      window.__PLANES_AUTH_HYDRATED__ === true
    ) {
      return;
    }
  }

  evaluationInFlight = (async () => {
    await evaluateSession(session);
    if (session?.user?.id && window.__PLANES_AUTH_HYDRATED__ === true) {
      lastEvaluatedUserId = session.user.id;
    }
  })();

  try {
    await evaluationInFlight;
  } finally {
    evaluationInFlight = null;
  }
}

async function boot() {
  await waitForDocumentBody();

  if (!supabase) {
    const node = renderShell(`
      <h1>Não foi possível iniciar o acesso seguro</h1>
      <p class="planes-auth-muted">O componente de autenticação do PLANES não foi carregado.</p>
      <div class="planes-auth-status planes-auth-bad">Recarregue a página. Nenhuma sessão será liberada sem validação do Supabase.</div>
    `);
    blockApp();
    node.setAttribute('data-auth-fatal', 'supabase-library-missing');
    return;
  }

  oauthCallbackInProgress = true;
  const oauth = await completeOAuthCallbackIfPresent();
  oauthCallbackInProgress = false;

  await loadCapabilities();
  installSecureLogoutBridge();

  if (oauth.failed) {
    authBootFinished = true;
    return;
  }

  if (oauth.session) {
    await evaluateSessionSerialized(oauth.session, 'oauth-callback');
  } else {
    const { data: { session } } = await supabase.auth.getSession();
    await evaluateSessionSerialized(session, 'boot');
  }

  authBootFinished = true;

  supabase.auth.onAuthStateChange((event, nextSession) => {
    if (event === 'SIGNED_OUT' || !nextSession?.user) {
      window.setTimeout(() => {
        void resetPlanesRuntimeAfterSignOut().finally(() => {
          lastEvaluatedUserId = null;
          void evaluateSessionSerialized(null, event);
        });
      }, 0);
      return;
    }

    if (!authBootFinished || oauthCallbackInProgress) return;

    window.setTimeout(() => {
      void evaluateSessionSerialized(nextSession, event);
    }, 0);
  });
}

void boot().catch((error) => {
  const node = renderShell(`
    <h1>Não foi possível iniciar o acesso seguro</h1>
    <p class="planes-auth-muted">Tente recarregar a página. Se o problema persistir, use o acesso administrativo de contingência ou contate o administrador.</p>
    <div class="planes-auth-status planes-auth-bad">${escapeHtml(error?.message || 'Erro inesperado.')}</div>
  `);
  blockApp();
  node.setAttribute('data-auth-fatal', 'true');
});
