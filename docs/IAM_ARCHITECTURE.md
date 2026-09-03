# Arquitetura Definitiva de IAM & Governança — Planes OS

Este documento descreve a topologia de segurança, fluxo transacional e camadas de autorização do **Planes OS**.

---

## 1. Visão Geral da Arquitetura

```text
┌─────────────────────────────────────────────────────────────┐
│                    PLANES OS FRONTEND / PWA                 │
│              (GitHub Pages / iOS PWA / Android)             │
└──────────────────────────────┬──────────────────────────────┘
                               │
           HTTPS REST & WebSockets Realtime / Presence
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      SUPABASE BACKEND                       │
│                                                             │
│  ┌────────────────────┐   ┌──────────────────────────────┐  │
│  │   SUPABASE AUTH    │   │      POSTGRESQL DATABASE     │  │
│  │  (Google / Apple / │   │   • profiles                 │  │
│  │   Passkeys / Email)│   │   • access_requests          │  │
│  └─────────┬──────────┘   │   • admin_notifications      │  │
│            │              │   • roles (14 perfis)        │  │
│            ▼              │   • permissions (28 códigos) │  │
│     Triggers pós-auth     │   • user_projects (escopo)   │  │
│     (handle_new_user) ───>│   • user_works (frentes)     │  │
│                           │   • user_passkeys (WebAuthn) │  │
│  ┌────────────────────┐   │   • audit_logs (LGPD)        │  │
│  │ REALTIME & PRESENCE│   └──────────────┬───────────────┘  │
│  │  (Canal online/sync│                  │                  │
│  └────────────────────┘                  ▼                  │
│                               ┌──────────────────────────┐  │
│                               │  ROW LEVEL SECURITY (RLS)│  │
│                               │    (Deny By Default)     │  │
│                               └──────────┬───────────────┘  │
│                                          │                  │
│                                          ▼                  │
│                               ┌──────────────────────────┐  │
│                               │      EDGE FUNCTIONS      │  │
│                               │    (send-iam-email)      │  │
│                               └──────────┬───────────────┘  │
└──────────────────────────────────────────┼──────────────────┘
                                           │
                                           ▼
                                ┌─────────────────────┐
                                │     RESEND API      │
                                │(E-mails Corporativos│
                                └─────────────────────┘
```

---

## 2. Princípios de Separação de Responsabilidade

### A. Autenticação ($\text{Quem é?}$)
- Provedores suportados:
  - **Google Workspace / Gmail** (via Supabase OAuth real)
  - **Sign in with Apple** (via Apple Services ID)
  - **E-mail Corporativo e Senha** (via Supabase Auth com hashing bcrypt/argon2 no servidor)
  - **Face ID / Touch ID / Passkeys** (via padrão W3C WebAuthn e chip seguro do dispositivo)
- O resultado da autenticação é unicamente confirmar a identidade criptográfica do indivíduo (`auth.users.id`).

### B. Aprovação ($\text{Pode entrar?}$)
- **Regra Fundamental**: A autenticação **nunca** concede acesso automático ao sistema.
- Todo novo usuário é inserido com `status = 'pending'`.
- O administrador da Planes Engenharia deve revisar as informações profissionais, definir perfil e escopo antes de liberar o acesso.

### C. Permissões RBAC ($\text{O que pode fazer?}$)
- 14 Perfis Oficiais Hierárquicos de `SUPER_ADMIN` a `VISUALIZADOR`.
- Mapeamento estrito de 28 permissões funcionais (`dashboard.view`, `projects.create`, `financial.edit`, etc.).
- Overrides pontuais por colaborador (`user_permissions`) com comandos `allow` ou `deny`.

### D. Escopo ($\text{Quais dados pode ver?}$)
- Usuários só visualizam empreendimentos vinculados em `user_projects` e frentes cadastradas em `user_works`.
- Administradores com `SUPER_ADMIN` e `ADMIN` possuem escopo global (`*`).

---

## 3. Fluxo de Vida do Usuário e Transições de Estado

```text
       [ Cadastro / Login ]
                 │
                 ▼
          status: pending ──────(Admin Rejeita)──────> status: rejected
                 │                                        (Email enviado)
                 │
          (Admin Aprova em 2 Etapas)
                 │
                 ▼
          status: approved <─────(Admin Reativa)──────┐
                 │                                    │
                 │                                    │
                 └────────(Admin Suspende)────> status: suspended
```

---

## 4. Sincronização em Tempo Real (Sub-2 segundos)
- **Supabase Realtime**: Assinatura de canais PostgreSQL em `profiles`, `access_requests` e `admin_notifications`.
- Quando um novo colaborador se cadastra no Computador B:
  - O Computador A (Admin) recebe o evento WebSocket em $<2$ segundos.
  - O contador de **Novos Cadastros** atualiza imediatamente de $0 \rightarrow 1$.
  - O sino de notificações incrementa e um toast animado surge na tela.
- Quando o Admin aprova a solicitação no Computador A:
  - O Computador B (onde o usuário aguardava na tela de espera) detecta o evento Realtime em seu perfil e altera a tela instantaneamente para **"Acesso Liberado"**, permitindo o acesso imediato sem recarregar a página.
