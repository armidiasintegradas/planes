# Planes Intelligence RC-06 — Gate de homologação (23/11/2026)

## Resultado da auditoria conectada

- Base: `release/planes-intelligence-rc06` em `dfba259030ad8bc88d4def3dd8213dd48c38d52d`.
- GitHub Actions IAM `45192982925` e regression `45192982984`: **success**.
- Supabase `Planes OS Produção` (`xfgcbxppsbwmxwsuajou`): ativo, **0 branches** de homologação.
- Histórico da produção: **34 migrações**; repositório: **8 arquivos**. Paridade **não demonstrada**.
- `planes-intelligence-text`: **não implantada** na lista de Edge Functions do projeto produtivo.
- Supabase Security Advisor: `auth_leaked_password_protection` desativada (WARN); tabelas privadas `private.bootstrap_admin_emails` e `private.email_outbox` têm RLS sem policies (INFO, verificar se negação total é intencional).
- Nenhuma alteração efetuada no Supabase de produção. Sem autorização de despesa ou criação de branch/projeto hospedado.

## Passagem obrigatória à homologação

1. Reconstituir localmente Supabase completo em Docker, com **schema-only** sanitizado e revisão das migrations. Não executar `supabase db reset` com as 8 migrations divergentes. Não extrair nem copiar usuários, linhas de negócio, arquivos Storage ou segredos.
2. Semear pessoas/obras fictícias e testar JWT reais de Supabase Auth, project-scoped RLS, `admin`, `gestor`, `engenharia`, `campo`, `financeiro`, `cliente`, pendente/suspenso. Confirmar negação entre obras.
3. Subir `planes-intelligence-text` **apenas** em isolamento; com `PLANES_INTELLIGENCE_TEXT_ENABLED=false` deve retornar 503. Validar ativação temporária com secrets de teste.
4. Antes de API externa: provisionar controle de cotas/rate limit **persistente no servidor** e orçamento aprovado para chave de homologação; validar 429 e alertas, evitar segredo no frontend.
5. Verificar payload enviado ao provedor, limites, timeouts, erros, `store: false`, sem escrita, dados mínimos por papel e prompt injection.
6. Testar microfone em iOS, Android e desktop reais; compatibilidade, silêncio, permissão negada, fallback teclado e ausência absoluta de áudio de saída.
7. Testar todas as operações persistentes via confirmação humana, criar plano de backup/rollback e realizar regressão com a revisão candidata.
8. Somente depois registrar evidências e aprovação formal no arquivo JSON externo, **nunca** colocar tokens ou dados reais como evidência.

## Gate automático de bloqueio

```sh
node scripts/check-intelligence-release-readiness.mjs docs/intelligence-rc06-evidence.json
```

O comando **falha por padrão** (exit 1) até que cada requisito tenha `status: "passed"`, `evidence_url`, `verified_at` e `verified_by`. É um verificador de atestações, **não** substitui execução dos testes. Não se deve habilitar a flag do Intelligence nem mesclar na produção apenas porque o comando passa.

### Modelo mínimo de evidência, em arquivo externo não versionado

```json
{
  "environment": {"kind": "isolated-supabase", "project_ref": "REF_ISOLADA"},
  "commit_sha": "SHA_DE_40_CARACTERES",
  "checks": {
    "supabase_schema_parity": {
      "status": "passed",
      "evidence_url": "https://github.com/.../actions/runs/...",
      "verified_at": "2026-11-23T12:00:00-03:00",
      "verified_by": "responsavel-tecnico"
    }
  }
}
```

Todos os outros requisitos listados em `scripts/check-intelligence-release-readiness.mjs` precisam de evidências próprias. Não fabricar aprovações ou marcar testes físicos como realizados sem execução.

## Segurança atual e caminhos de correção

- [Password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection): revisar com administrador do Supabase; alteração em produção exige janela de mudança e avaliação do plano.
- [RLS sem policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy): não criar policy permissiva só para eliminar aviso; verificar tabelas internas e grants.
- O backend generativo ainda não possui rate limit persistente comprovado e não deve receber tráfego de clientes.
