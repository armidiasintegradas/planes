const OBSOLETE_AUTH_TITLES = new Set([
  'Solicitação de Acesso Corporativo',
  'Fazer login com o Google',
  'Iniciar sessão com a Apple',
  'Solicitação enviada para aprovação',
  'E-mail de Notificação Enviado',
  'Autenticação Requerida',
  'Segurança, Passkeys & Dispositivos',
]);

const HEADING_SELECTOR = 'h1,h2,h3,h4,[role="heading"]';
const DIALOG_SELECTOR = '[role="dialog"],[aria-modal="true"],.fixed.inset-0,.fixed';

function normalizedText(node) {
  return (node?.textContent || '').replace(/\s+/g, ' ').trim();
}

function disableObsoleteDialog(heading) {
  if (!OBSOLETE_AUTH_TITLES.has(normalizedText(heading))) return false;

  const dialog = heading.closest(DIALOG_SELECTOR);
  if (!dialog || dialog.id === 'planes-auth-root') return false;
  if (dialog.hasAttribute('data-planes-legacy-auth-disabled')) return true;

  dialog.setAttribute('data-planes-legacy-auth-disabled', 'true');
  dialog.setAttribute('aria-hidden', 'true');
  dialog.style.setProperty('display', 'none', 'important');

  dialog.querySelectorAll('button,input,select,textarea').forEach((element) => {
    element.setAttribute('disabled', 'true');
    element.setAttribute('tabindex', '-1');
  });
  dialog.querySelectorAll('a').forEach((element) => {
    element.setAttribute('tabindex', '-1');
    element.setAttribute('aria-disabled', 'true');
  });
  return true;
}

function scan(root = document) {
  if (root instanceof Element && root.matches(HEADING_SELECTOR)) {
    disableObsoleteDialog(root);
  }
  root.querySelectorAll?.(HEADING_SELECTOR).forEach(disableObsoleteDialog);
}

scan();

const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node instanceof Element) scan(node);
    }
  }
});

observer.observe(document.documentElement, { childList: true, subtree: true });
