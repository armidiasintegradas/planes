# Guia de Configuração: Sign in with Apple Real

Este documento detalha o procedimento para habilitar o login nativo com Apple ID no **Planes OS**.

---

## 1. Pré-Requisitos no Apple Developer Portal
1. Conta ativa no [Apple Developer Program](https://developer.apple.com/).
2. Obtenha seu **Team ID** no canto superior direito do portal Apple Developer.

---

## 2. Criar App ID e Services ID
1. Em **Certificates, Identifiers & Profiles**, selecione **Identifiers** $\rightarrow$ clique no botão `+`.
2. Selecione **App IDs** $\rightarrow$ crie um ID principal (ex: `br.com.planesengenharia.planesos`). Habilite a funcionalidade **Sign In with Apple**.
3. Volte em **Identifiers**, clique no filtro no canto superior direito e selecione **Services IDs** $\rightarrow$ clique no botão `+`.
   - Description: `Planes OS Web Service`
   - Identifier: `br.com.planesengenharia.planesos.web` (este será seu **Services ID / Client ID**).
4. Abra o Services ID criado, marque **Sign In with Apple** e clique em **Configure**:
   - Primary App ID: selecione o App ID criado anteriormente.
   - Domains and Subdomains: adicione seu subdomínio do Supabase (ex: `<project-ref>.supabase.co`) e `armidiasintegradas.github.io`.
   - Return URLs: insira a URL de callback do Supabase:
     `https://<project-ref>.supabase.co/auth/v1/callback`
5. Clique em **Save** e **Continue**.

---

## 3. Criar Chave Privada (Private Key)
1. No menu lateral, acesse **Keys** $\rightarrow$ clique em `+`.
2. Key Name: `Planes OS Apple Sign-In Key`.
3. Marque **Sign in with Apple** $\rightarrow$ clique em **Configure** e associe ao seu Primary App ID.
4. Salve e faça o download do arquivo de chave `.p8` (guarde-o em local ultra seguro; a Apple permite o download apenas uma vez).
5. Anote o **Key ID** exibido.

---

## 4. Configurar no Supabase Dashboard
1. Acesse o **Supabase Dashboard** $\rightarrow$ **Authentication** $\rightarrow$ **Providers** $\rightarrow$ **Apple**.
2. Marque **Enable Apple provider**.
3. Preencha os campos:
   - **Services ID**: `br.com.planesengenharia.planesos.web`
   - **Team ID**: Seu Team ID da Apple (10 caracteres).
   - **Key ID**: O Key ID da chave `.p8`.
   - **Secret Key**: Abra o arquivo `.p8` baixado em um editor de texto e cole todo o conteúdo (incluindo `-----BEGIN PRIVATE KEY-----` e `-----END PRIVATE KEY-----`).
4. Clique em **Save**.

> **Transparência**: Caso as credenciais da Apple ainda não tenham sido configuradas no projeto do Supabase, o sistema informará transparentemente no console que o provedor aguarda credenciais de produção no Supabase Dashboard.
