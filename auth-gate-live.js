import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';

const SUPABASE_URL = 'https://xfgcbxppsbwmxwsuajou.supabase.co';
const SUPABASE_KEY = 'sb_publishable_tFvlFVbpOPYPPA72qcMWQg_IZO4V4xS';
const REDIRECT_TO = 'https://armidiasintegradas.github.io/planes/';
const ROOT_ID = 'planes-auth-root';
const STYLE_ID = 'planes-auth-live-style';
const PASSKEY_DISMISS_KEY = 'planes-passkey-offer-dismissed';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
    experimental: { passkey: true },
  },
});

let profileChannel = null;
let capabilities = { email: true, google: false, passkeys: false };

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

function hydratePlanesFromSupabase(user, profile) {
  if (!user || !profile || profile.status !== 'approved') return;

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

  window.__PLANES_AUTH_BRIDGE_PAYLOAD__ = payload;
  window.dispatchEvent(new CustomEvent('planes-auth-payload-ready', {
    detail: payload
  }));

  const script = document.createElement('script');
  script.setAttribute('data-planes-auth-bridge', '1');
  script.textContent = `
    (() => {
      let attempts = 0;
      const applySupabaseIdentity = () => {
        attempts += 1;
        const bridge = window.__PLANES_AUTH_BRIDGE_PAYLOAD__;
        if (!bridge || !bridge.user) return;

        try {
          if (typeof render !== 'function' || typeof currentUser === 'undefined' || typeof currentScreen === 'undefined') {
            if (attempts < 1200) window.setTimeout(applySupabaseIdentity, 50);
            return;
          }

          currentUser = bridge.user;
          if (typeof accessLevel !== 'undefined') {
            accessLevel = bridge.user.level || bridge.user.role || 'campo';
          }

          let savedUiState = null;
          try {
            const rawUiState = localStorage.getItem('planes_active_session');
            savedUiState = rawUiState ? JSON.parse(rawUiState) : null;
          } catch {}

          if (savedUiState?.selectedProjectId && typeof selectedProjectId !== 'undefined') {
            const desiredProjectId = savedUiState.selectedProjectId;
            selectedProjectId = desiredProjectId;

            const restoreDesiredProject = (attempt = 0) => {
              try {
                if (typeof projectsList === 'undefined' || !Array.isArray(projectsList) || typeof selectedProject === 'undefined') {
                  if (attempt < 60) window.setTimeout(() => restoreDesiredProject(attempt + 1), 100);
                  return;
                }

                const restoredProject = projectsList.find((project) => project.id === desiredProjectId);
                if (restoredProject) {
                  selectedProjectId = desiredProjectId;
                  selectedProject = restoredProject;
                  if (typeof operationalProjectIdCache !== 'undefined') {
                    operationalProjectIdCache = restoredProject.cloudId || null;
                  }
                  if (typeof render === 'function') render();
                  return;
                }

                if (attempt < 60) window.setTimeout(() => restoreDesiredProject(attempt + 1), 100);
              } catch (error) {
                if (attempt < 60) window.setTimeout(() => restoreDesiredProject(attempt + 1), 100);
              }
            };

            restoreDesiredProject();
          }

          if (savedUiState?.activeNav && typeof activeNav !== 'undefined') {
            activeNav = savedUiState.activeNav;
          }

          if (currentScreen === 'login' || currentScreen === 'access_rejected' || currentScreen === 'access_suspended') {
            const requestedScreen = savedUiState?.currentScreen;
            currentScreen = requestedScreen === 'dashboard' || requestedScreen === 'projects'
              ? requestedScreen
              : 'projects';
          }

          if (typeof setupRealtimeSubscriptions === 'function') {
            try { setupRealtimeSubscriptions(); } catch (error) { console.warn('Realtime hydrate warning:', error); }
          }
          if (typeof updateUserPresence === 'function') {
            try { updateUserPresence(); } catch (error) {}
          }
          if (typeof broadcastPresenceHeartbeat === 'function') {
            try { broadcastPresenceHeartbeat(); } catch (error) {}
          }
          if (typeof render === 'function') render();

          window.dispatchEvent(new CustomEvent('planes-auth-legacy-hydrated', {
            detail: bridge
          }));
        } catch (error) {
          console.warn('Planes Supabase identity hydrate failed:', error);
          if (attempts < 1200) window.setTimeout(applySupabaseIdentity, 50);
        }
      };
      applySupabaseIdentity();
    })();
  `;
  document.documentElement.appendChild(script);
  script.remove();
}

function allowApp(profile = null, user = null) {
  let released = false;

  const releaseApp = () => {
    if (released) return;
    released = true;
    document.documentElement.classList.remove('planes-auth-loading', 'planes-auth-blocked');
    document.getElementById(ROOT_ID)?.remove();
    window.dispatchEvent(new CustomEvent('planes-auth-approved', {
      detail: { user, profile }
    }));

    if (profile && ['super_admin', 'admin'].includes(profile.role)) {
      void mountAdminAccessConsole(profile);
    }
  };

  const onHydrated = () => releaseApp();
  window.addEventListener('planes-auth-legacy-hydrated', onHydrated, { once: true });

  blockApp();
  hydratePlanesFromSupabase(user, profile);

  const retryOnWindowLoad = () => {
    if (!released) hydratePlanesFromSupabase(user, profile);
  };
  if (document.readyState === 'complete') {
    window.setTimeout(retryOnWindowLoad, 0);
  } else {
    window.addEventListener('load', retryOnWindowLoad, { once: true });
  }

  const standaloneMode =
    window.matchMedia?.('(display-mode: standalone)')?.matches === true ||
    window.navigator.standalone === true;

  window.setTimeout(async () => {
    if (released || !standaloneMode) return;

    const recoveryKey = 'planes_pwa_auth_recovery_v1';
    if (sessionStorage.getItem(recoveryKey) === '1') return;
    sessionStorage.setItem(recoveryKey, '1');

    const node = root();
    node.innerHTML = `
      <section class="planes-auth-card">
        <div class="planes-auth-brand">PLANES OS</div>
        <div class="planes-auth-subtitle">Ambiente seguro de gestão operacional</div>
        <h1>Atualizando seu acesso</h1>
        <p>Detectamos uma sessão antiga do aplicativo instalado.</p>
        <div class="planes-auth-message planes-auth-good">Vamos renovar apenas o acesso deste dispositivo e abrir a tela de login automaticamente.</div>
      </section>`;

    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (error) {
      console.warn('PWA local auth recovery signOut warning:', error);
    }

    try {
      localStorage.removeItem('planes_active_session');
      localStorage.removeItem('planes_current_user');
      localStorage.removeItem('planes_projects_list');
      delete window.__PLANES_AUTH_BRIDGE_PAYLOAD__;
      delete window.__PLANES_AUTH_HYDRATED__;
    } catch {}

    const next = new URL(window.location.href);
    next.searchParams.set('pwa_reauth', Date.now().toString());
    window.location.replace(next.toString());
  }, 12000);

  window.setTimeout(() => {
    if (released) return;
    const node = root();
    node.innerHTML = `
      <section class="planes-auth-card">
        <div class="planes-auth-brand">PLANES OS</div>
        <div class="planes-auth-subtitle">Ambiente seguro de gestão operacional</div>
        <h1>Inicializando seu ambiente</h1>
        <p>Sua sessão já foi validada. Estamos concluindo o carregamento da interface.</p>
        <div class="planes-auth-message planes-auth-good">Aguarde alguns instantes. Não é necessário sair nem refazer o login.</div>
      </section>`;
  }, 7000);

  window.setTimeout(() => {
    if (released) return;
    window.removeEventListener('planes-auth-legacy-hydrated', onHydrated);
    renderProfileError(user, 'Sua sessão foi validada, mas a interface demorou mais que o esperado para iniciar. Toque em recarregar e tente novamente.');
  }, 60000);
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
    <h1>Entrar no Planes OS</h1>
    <p class="planes-auth-muted">A forma mais rápida para usuários novos é o Google. Usuários que já cadastraram uma Passkey podem entrar sem digitar e-mail ou senha.</p>
    ${passkeyButton}
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

async function fetchProfileWithRetry(userId, attempts = 5) {
  let lastError = null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id,email,full_name,avatar_url,status,role,approved_at')
      .eq('id', userId)
      .maybeSingle();

    if (!error && data) return { data, error: null };

    lastError = error || new Error('profile_not_ready');
    if (attempt < attempts - 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 250 + (attempt * 250)));
    }
  }

  return { data: null, error: lastError };
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
  const { data: profile, error } = await fetchProfileWithRetry(user.id);

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
  const code = url.searchParams.get('code');
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
      url.search = '';
      window.location.replace(url.toString());
    });
    blockApp();
    return { handled: true, session: null, failed: true };
  }

  if (!code) return { handled: false, session: null, failed: false };

  blockApp();
  const node = renderShell(`
    <h1>Concluindo seu acesso</h1>
    <p class="planes-auth-muted">Sua conta Google foi validada. Estamos criando sua sessão segura no Planes OS.</p>
    <div class="planes-auth-status planes-auth-good">Isso deve levar apenas alguns segundos.</div>
  `);

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data?.session) {
    node.innerHTML = `
      <section class="planes-auth-card">
        <div class="planes-auth-brand">PLANES OS</div>
        <div class="planes-auth-subtitle">Ambiente seguro de gestão operacional</div>
        <h1>Não foi possível concluir a sessão</h1>
        <p class="planes-auth-muted">O Google autenticou sua conta, mas o retorno seguro não foi concluído.</p>
        <div class="planes-auth-status planes-auth-bad">${escapeHtml(error?.message || 'Sessão não criada.')}</div>
        <button class="planes-auth-btn secondary" data-retry-google style="margin-top:14px">Tentar Google novamente</button>
      </section>`;
    node.querySelector('[data-retry-google]')?.addEventListener('click', () => {
      url.search = '';
      window.location.replace(url.toString());
    });
    return { handled: true, session: null, failed: true };
  }

  for (const key of ['code','state','error','error_description','error_code']) {
    url.searchParams.delete(key);
  }
  window.history.replaceState({}, document.title, url.toString());

  return { handled: true, session: data.session, failed: false };
}

async function boot() {
  await waitForDocumentBody();
  const oauth = await completeOAuthCallbackIfPresent();
  await loadCapabilities();
  installSecureLogoutBridge();

  if (oauth.failed) return;

  if (oauth.session) {
    await evaluateSession(oauth.session);
  } else {
    await evaluateCurrentSession();
  }

  supabase.auth.onAuthStateChange((event, nextSession) => {
    window.setTimeout(() => {
      if (event === 'SIGNED_OUT' || !nextSession?.user) {
        void resetPlanesRuntimeAfterSignOut().finally(() => void evaluateSession(null));
        return;
      }
      void evaluateSession(nextSession);
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
