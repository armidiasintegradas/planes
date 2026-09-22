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

test('live publisher ships the sanitizer without rewriting the desktop artifact', async () => {
  const publisher = await readFile(new URL('../.github/workflows/publish-live-auth.yml', import.meta.url), 'utf8');
  assert.match(publisher, /legacy-auth-sanitizer-live\.js/);
  assert.match(publisher, /Update live auth artifacts/);
  assert.match(publisher, /Checkout published site/);
  assert.doesNotMatch(publisher, /site\/index\.html\s*=/);
  assert.doesNotMatch(publisher, /python3/);
  assert.doesNotMatch(publisher, /cp\s+-r\s+source\/dist/);
});
