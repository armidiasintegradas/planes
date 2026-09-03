# Guia de Configuração: E-mails Transacionais com Resend

Este documento orienta a configuração do envio real de e-mails transacionais (aprovação, recusa justificada e alertas ao administrador) através da integração **Supabase Edge Functions + Resend**.

---

## 1. Obter Conta e Chave no Resend
1. Acesse [https://resend.com](https://resend.com) e crie uma conta ou faça login.
2. Em **Domains**, adicione seu domínio corporativo (ex: `planesengenharia.com.br`).
3. Adicione os registros DNS apontados pelo Resend (DKIM, SPF e MX) no seu provedor de DNS (GoDaddy, Cloudflare, Registro.br, etc.) e aguarde a verificação.
4. Em **API Keys**, clique em **Create API Key**:
   - Name: `Planes OS Production`
   - Permission: `Full access`
   - Copie a chave gerada (iniciada por `re_...`).

---

## 2. Injetar Variáveis na Edge Function do Supabase
Via terminal com a Supabase CLI:
```bash
supabase secrets set RESEND_API_KEY="re_seu_token_aqui"
supabase secrets set EMAIL_FROM="Planes OS <acesso@planesengenharia.com.br>"
supabase secrets set APP_URL="https://armidiasintegradas.github.io/planes/"
supabase secrets set ADMIN_NOTIFICATION_EMAIL="armidiasintegradas@gmail.com"
```

Ou diretamente no painel do Supabase:
**Project Settings** $\rightarrow$ **Edge Functions** $\rightarrow$ **Manage Secrets**.

---

## 3. Realizar o Deploy da Edge Function
No diretório do projeto:
```bash
supabase functions deploy send-iam-email --no-verify-jwt
```

---

## 4. Tratamento de Falhas e Idempotência
- Se a API do Resend falhar (por exemplo, devido a instabilidade externa momentânea ou limite de envio atingido), **a aprovação no banco de dados não é desfeita**.
- O sistema registra o evento em `access_requests.email_delivery_status = 'failed'` e emite um alerta ao administrador com a opção de **Reenviar E-mail**.
- Não são enviados e-mails duplicados em caso de cliques repetidos.
