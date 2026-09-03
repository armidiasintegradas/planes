# Guia de Arquitetura: Passkeys & WebAuthn (FIDO2) no Planes OS

Este documento explica o funcionamento criptográfico de Passkeys no Planes OS e a conformidade com a LGPD.

---

## 1. Princípios Criptográficos FIDO2 / WebAuthn
- As Passkeys utilizam criptografia assimétrica baseada no padrão W3C WebAuthn.
- Quando o usuário registra uma Passkey em seu dispositivo (MacBook com Touch ID, iPhone com Face ID ou PC com Windows Hello):
  1. O navegador solicita ao chip de segurança seguro local (ex: Apple Secure Enclave ou TPM Windows) a criação de um par de chaves.
  2. A **chave privada** permanece eternamente confinada no hardware do usuário e jamais é compartilhada ou enviada pela rede.
  3. Apenas o identificador de credencial (`credential_id`) e a **chave pública** são transmitidos e persistidos na tabela `public.user_passkeys` no PostgreSQL do Supabase.

---

## 2. Conformidade Rigorosa com a LGPD
- O Planes OS **não captura, não transmite e não armazena**:
  - Imagens faciais ou mapas tridimensionais do rosto.
  - Imagens ou minúcias de impressões digitais.
  - Chaves privadas criptográficas.
- O diálogo biométrico exibido na tela é de responsabilidade exclusiva do sistema operacional do dispositivo do usuário.

---

## 3. Fluxo de Registro & Login
1. **Ativação Pós-Aprovação**:
   - Recomenda-se que o usuário ative a Passkey após ser aprovado pelo Administrador, acessando **Meu Perfil** $\rightarrow$ **Segurança & Passkeys** $\rightarrow$ **Adicionar Passkey**.
2. **Autenticação**:
   - No login, o usuário clica em `Entrar com Face ID` / `Touch ID` / `Windows Hello`.
   - O navegador aciona `navigator.credentials.get(...)`.
   - O dispositivo assina um desafio criptográfico com sua chave privada.
   - O servidor Supabase verifica a assinatura com a chave pública cadastrada em `user_passkeys`.
   - Uma vez confirmada a identidade, o sistema valida o perfil, status, permissões RBAC e escopo de obra.
