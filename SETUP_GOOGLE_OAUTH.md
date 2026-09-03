# Guia de Configuração: Google OAuth 2.0 Real

Este documento detalha o passo a passo para habilitar a autenticação real com contas Google e Google Workspace no **Planes OS** através do Supabase Auth.

---

## 1. Criar Projeto no Google Cloud Platform (GCP)
1. Acesse o [Google Cloud Console](https://console.cloud.google.com/).
2. Crie um novo projeto chamado **Planes OS IAM** (ou selecione seu projeto corporativo).
3. No menu lateral, acesse **APIs e Serviços** $\rightarrow$ **Tela de consentimento OAuth**.
   - Tipo de usuário: **Externo** (para permitir qualquer colaborador ou parceiro) ou **Interno** (restrito ao seu Google Workspace).
   - Nome do app: `Planes OS`
   - E-mail de suporte do usuário: `armidiasintegradas@gmail.com`
   - Domínios autorizados: adicione `supabase.co` e `armidiasintegradas.github.io`.
   - Escopos: selecione `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile`.

---

## 2. Criar Credenciais OAuth 2.0
1. No menu lateral do GCP, clique em **Credenciais** $\rightarrow$ **+ Criar Credenciais** $\rightarrow$ **ID do cliente OAuth**.
2. Tipo de aplicativo: **Aplicativo da Web**.
3. Nome: `Planes OS Web Client`.
4. **Origens JavaScript autorizadas**:
   - `https://armidiasintegradas.github.io`
   - `https://seu-projeto.supabase.co`
   - `http://localhost:3000` (para testes locais)
5. **URIs de redirecionamento autorizados**:
   - Copie o **Callback URL** do Supabase (ex: `https://<project-ref>.supabase.co/auth/v1/callback`).
6. Clique em **Criar** e copie o **Client ID** e o **Client Secret**.

---

## 3. Ativar o Provider Google no Supabase
1. Acesse o **Supabase Dashboard** $\rightarrow$ selecione seu projeto.
2. No menu lateral, vá em **Authentication** $\rightarrow$ **Providers** $\rightarrow$ **Google**.
3. Marque **Enable Google**.
4. Cole o **Client ID** e o **Client Secret** obtidos no GCP.
5. Clique em **Save**.

---

## 4. Comportamento no Planes OS
- Quando o colaborador clica em **"Continuar com o Google"**, o Supabase redireciona para a tela de autenticação oficial do Google.
- Após confirmar a identidade no Google, o usuário é redirecionado de volta para o Planes OS.
- O trigger `handle_new_user()` cria automaticamente o perfil com status `pending` e registra a solicitação de acesso para análise do Administrador.
