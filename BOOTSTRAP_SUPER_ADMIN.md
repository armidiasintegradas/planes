# Inicialização Segura: Bootstrap do Primeiro Super Administrador

Para garantir segurança rigorosa e não depender de credenciais fixas no código-fonte, a criação do primeiro **Super Administrador** (`SUPER_ADMIN`) deve ser realizada via backend seguro (SQL Editor no Supabase ou script administrativo autenticado).

---

## 1. Passo a Passo para Promover o Administrador Master

### Passo A: Criar a Conta de Autenticação
O Administrador Geral (Alex Ribeiro) deve criar sua conta normalmente através da interface do Planes OS:
1. Acesse [https://armidiasintegradas.github.io/planes/](https://armidiasintegradas.github.io/planes/)
2. Cadastre-se com o e-mail oficial: `armidiasintegradas@gmail.com` (via Google OAuth ou E-mail/Senha).
3. O status inicial da conta será criado como `pending` por segurança.

---

### Passo B: Elevar a Conta para `SUPER_ADMIN` no Banco de Dados
Acesse o **SQL Editor** do Supabase Dashboard e execute a seguinte instrução:

```sql
DO $$
DECLARE
    v_profile_id UUID;
    v_auth_id UUID;
BEGIN
    -- Localiza o perfil de Alex Ribeiro pelo e-mail oficial
    SELECT id, auth_user_id INTO v_profile_id, v_auth_id
    FROM public.profiles
    WHERE LOWER(email) = LOWER('armidiasintegradas@gmail.com');

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Perfil não encontrado. Conclua o cadastro na tela de login antes de promover.';
    END IF;

    -- Promove para SUPER_ADMIN com status aprovado e ativo
    UPDATE public.profiles SET
        role_id = 'SUPER_ADMIN',
        status = 'approved',
        is_active = true,
        email_verified = true,
        approved_at = now(),
        updated_at = now()
    WHERE id = v_profile_id;

    -- Aprova qualquer solicitação pendente existente
    UPDATE public.access_requests SET
        status = 'approved',
        reviewed_at = now(),
        approval_notes = 'Bootstrap inicial de Super Administrador executado via SQL seguro.'
    WHERE user_id = v_profile_id AND status = 'pending';

    -- Atribui escopo total de projetos e obras
    INSERT INTO public.user_projects (user_id, project_id, access_level)
    VALUES (v_profile_id, '*', 'admin')
    ON CONFLICT (user_id, project_id) DO NOTHING;

    INSERT INTO public.user_works (user_id, work_id, access_level)
    VALUES (v_profile_id, '*', 'admin')
    ON CONFLICT (user_id, work_id) DO NOTHING;

    -- Registra na auditoria
    INSERT INTO public.audit_logs (user_id, action, resource, details)
    VALUES (
        v_auth_id,
        'BOOTSTRAP_SUPER_ADMIN',
        'profiles',
        jsonb_build_object('email', 'armidiasintegradas@gmail.com', 'role', 'SUPER_ADMIN')
    );

    RAISE NOTICE '✓ Alex Ribeiro promovido a SUPER_ADMIN com sucesso!';
END $$;
```

---

## 2. Validação
Após a execução do script SQL:
1. Faça login novamente no Planes OS com `armidiasintegradas@gmail.com`.
2. O sistema identificará o status `approved` e o papel `SUPER_ADMIN`.
3. O painel administrativo completo de aprovações, usuários, auditoria e métricas em tempo real estará 100% desbloqueado.
