import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('live site neutralizes only obsolete authentication dialogs', async () => {
  const sanitizer = await readFile(new URL('../public/legacy-auth-sanitizer-live.js', import.meta.url), 'utf8');

  for (const obsoleteTitle of [
    'Solicitação de Acesso Corporativo',
    'Fazer login com o Google',
    'Iniciar sessão com a Apple',
    'Solicitação enviada para aprovação',
    'E-mail de Notificação Enviado',
    'Autenticação Requerida',
    'Segurança, Passkeys & Dispositivos',
  ]) {
    assert.match(sanitizer, new RegExp(obsoleteTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  assert.match(sanitizer, /MutationObserver/);
  assert.match(sanitizer, /data-planes-legacy-auth-disabled/);
  assert.doesNotMatch(sanitizer, /document\.body\.innerHTML\s*=/);
});

test('live publisher ships the legacy auth sanitizer without replacing the desktop artifact', async () => {
  const publisher = await readFile(new URL('../.github/workflows/publish-live-auth.yml', import.meta.url), 'utf8');
  assert.match(publisher, /legacy-auth-sanitizer-live\.js/);
  assert.match(publisher, /Copy production auth modules/);
  assert.match(publisher, /site\/index\.html/);
  assert.doesNotMatch(publisher, /cp\s+-r\s+source\/dist/);
});
