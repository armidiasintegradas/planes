# Guia Geral de Configuração: Supabase Auth & IAM Corporativo

Este documento orienta a ativação da infraestrutura real de autenticação e governança do **Planes OS**.

---

## 1. Pré-Requisitos
1. Conta no [Supabase](https://supabase.com/).
2. Conta no [Resend](https://resend.com/) com domínio corporativo verificado.
3. Projeto criado no Supabase (ex: `planes-os-prod`).

---

## 2. Executando as Migrations no Banco de Dados
1. Acesse o **Dashboard do Supabase** $\rightarrow$ selecione seu projeto.
2. No menu lateral, clique em **SQL Editor** $\rightarrow$ **New Query**.
3. Abra o arquivo local [`supabase/migrations/20260903000001_planes_iam_schema.sql`](./supabase/migrations/20260903000001_planes_iam_schema.sql).
4. Cole todo o conteúdo e clique em **Run**.
5. O script criará:
   - 11 tabelas com RLS (*Deny by default*).
   - O catálogo com os 14 perfis e 28 permissões granulares.
   - Triggers automáticos para cadastros.
   - Stored Procedure transacional de aprovação (`approve_access_request`).
   - Publicação Realtime para sincronização contínua.

---

## 3. Configurando os Segredos no Supabase Edge Functions
No terminal com Supabase CLI ou diretamente no painel do Supabase (**Project Settings** $\rightarrow$ **Edge Functions** $\rightarrow$ **Secrets**):
```bash
supabase secrets set RESEND_API_KEY="re_..."
supabase secrets set EMAIL_FROM="Planes OS <acesso@seu-dominio.com.br>"
supabase secrets set APP_URL="https://armidiasintegradas.github.io/planes/"
supabase secrets set ADMIN_NOTIFICATION_EMAIL="armidiasintegradas@gmail.com"
```

Para fazer deploy da Edge Function:
```bash
supabase functions deploy send-iam-email
```

---

## 4. Configuração no Frontend do Planes OS
No arquivo [`index.html`](./index.html), preencha o objeto de inicialização:
```javascript
window.PLANES_CONFIG = {
  supabaseUrl: 'https://seu-projeto.supabase.co',
  supabaseAnonKey: 'sua-chave-anon-publica'
};
```
> **Nota de Segurança**: Apenas a `anon key` deve ser colocada no frontend. A chave `service_role` **nunca** deve ser incluída no cliente.
