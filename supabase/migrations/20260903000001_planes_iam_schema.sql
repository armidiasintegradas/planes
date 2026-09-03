-- ==============================================================================
-- PLANES OS — IAM CORPORATIVO DEFINITIVO
-- Migration: 20260903000001_planes_iam_schema.sql
-- Provedores: Supabase Auth, PostgreSQL, Realtime, Presence, RLS & Edge Functions
-- ==============================================================================

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ROLES (14 Perfis Oficiais Hierárquicos)
CREATE TABLE IF NOT EXISTS public.roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    level_rank INT NOT NULL,
    description TEXT
);

INSERT INTO public.roles (id, name, level_rank, description) VALUES
('SUPER_ADMIN', 'Super Administrador Geral', 100, 'Acesso total, governança de segurança e configuração de infraestrutura.'),
('ADMIN', 'Administrador', 90, 'Gestão de usuários, obras, projetos e aprovações corporativas.'),
('DIRETORIA', 'Diretoria Executiva', 80, 'Visão executiva global, relatórios consolidados e aprovação financeira.'),
('GERENTE', 'Gerente de Contratos & Obras', 70, 'Gestão de múltiplos empreendimentos e cronogramas macro.'),
('ENGENHARIA', 'Engenharia / Residente', 60, 'Controle de linha de balanço, takt, medições e planejamento técnico.'),
('COORDENADOR_OBRA', 'Coordenador de Obra', 55, 'Coordenação técnica no canteiro e acompanhamento de frentes simultâneas.'),
('CAMPO', 'Apontador / Equipe de Campo', 50, 'Apontamentos diários, registros fotográficos e checagem de avanço físico.'),
('FINANCEIRO', 'Financeiro & Controladoria', 45, 'Fluxo de caixa de obras, orçamentos, medições e aprovação de pagamentos.'),
('SUPRIMENTOS', 'Suprimentos & Logística', 40, 'Requisição de insumos, recebimento no canteiro e controle de almoxarifado.'),
('COMERCIAL', 'Comercial & Vendas', 35, 'Relatórios de avanço físico para clientes e parceiros comerciais.'),
('RH', 'Recursos Humanos & SST', 30, 'Controle de efetivo, segurança do trabalho e documentação trabalhista.'),
('COLABORADOR', 'Colaborador Interno', 20, 'Acesso básico a apontamentos e documentos operacionais específicos.'),
('CONSULTOR', 'Consultor Especialista', 15, 'Acesso temporário para consultorias técnicas de planejamento lean.'),
('CLIENTE', 'Cliente / Investidor', 10, 'Acesso restrito para acompanhamento fotográfico e relatórios executivos.'),
('VISUALIZADOR', 'Visualizador / Auditor Externo', 5, 'Acesso somente leitura a dashboards e cronogramas sem permissão de edição.')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    level_rank = EXCLUDED.level_rank,
    description = EXCLUDED.description;

-- 3. PERMISSÕES GRANULARES
CREATE TABLE IF NOT EXISTS public.permissions (
    id TEXT PRIMARY KEY,
    module TEXT NOT NULL,
    action TEXT NOT NULL,
    description TEXT
);

INSERT INTO public.permissions (id, module, action, description) VALUES
('dashboard.view', 'dashboard', 'view', 'Visualizar dashboard de projetos'),
('projects.view', 'projects', 'view', 'Visualizar empreendimentos autorizados'),
('projects.create', 'projects', 'create', 'Cadastrar novos empreendimentos'),
('projects.edit', 'projects', 'edit', 'Editar dados do empreendimento'),
('projects.delete', 'projects', 'delete', 'Excluir empreendimentos'),
('works.view', 'works', 'view', 'Visualizar frentes de obra'),
('works.create', 'works', 'create', 'Criar novas frentes de obra'),
('works.edit', 'works', 'edit', 'Editar frentes de obra'),
('financial.view', 'financial', 'view', 'Visualizar orçamentos e custos'),
('financial.edit', 'financial', 'edit', 'Editar dados financeiros e orçamentos'),
('contracts.view', 'contracts', 'view', 'Visualizar contratos e medições'),
('contracts.edit', 'contracts', 'edit', 'Editar contratos e medições'),
('suppliers.view', 'suppliers', 'view', 'Visualizar insumos e fornecedores'),
('suppliers.edit', 'suppliers', 'edit', 'Editar pedidos de insumos e compras'),
('documents.view', 'documents', 'view', 'Visualizar documentos e atas de obra'),
('documents.upload', 'documents', 'upload', 'Fazer upload de plantas e relatórios'),
('documents.delete', 'documents', 'delete', 'Excluir documentos do canteiro'),
('reports.view', 'reports', 'view', 'Visualizar relatórios executivos e takt'),
('reports.export', 'reports', 'export', 'Exportar dados para Excel e PDF'),
('users.view', 'users', 'view', 'Visualizar listagem de colaboradores'),
('users.approve', 'users', 'approve', 'Aprovar ou recusar solicitações de cadastro'),
('users.edit', 'users', 'edit', 'Alterar perfis e permissões de usuários'),
('users.suspend', 'users', 'suspend', 'Suspender ou reativar acesso de colaboradores'),
('roles.view', 'roles', 'view', 'Visualizar estrutura de perfis RBAC'),
('roles.edit', 'roles', 'edit', 'Configurar permissões de perfis'),
('settings.view', 'settings', 'view', 'Visualizar configurações corporativas'),
('settings.edit', 'settings', 'edit', 'Alterar parâmetros globais do Planes OS'),
('audit.view', 'audit', 'view', 'Visualizar trilha de auditoria LGPD')
ON CONFLICT (id) DO NOTHING;

-- 4. MAPEAMENTO PERMISSÕES POR ROLE (role_permissions)
CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id TEXT NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id TEXT NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- Permissões Super Admin e Admin
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 'SUPER_ADMIN', id FROM public.permissions ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 'ADMIN', id FROM public.permissions WHERE id != 'settings.edit' ON CONFLICT DO NOTHING;

-- Permissões Engenharia
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 'ENGENHARIA', id FROM public.permissions 
WHERE module IN ('dashboard', 'projects', 'works', 'documents', 'reports') 
   OR id IN ('suppliers.view')
ON CONFLICT DO NOTHING;

-- Permissões Campo
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 'CAMPO', id FROM public.permissions 
WHERE id IN ('dashboard.view', 'projects.view', 'works.view', 'works.edit', 'documents.view', 'documents.upload')
ON CONFLICT DO NOTHING;

-- Permissões Financeiro
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 'FINANCEIRO', id FROM public.permissions 
WHERE module IN ('dashboard', 'financial', 'contracts', 'reports')
ON CONFLICT DO NOTHING;

-- Permissões Suprimentos
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 'SUPRIMENTOS', id FROM public.permissions 
WHERE module IN ('dashboard', 'suppliers', 'documents')
ON CONFLICT DO NOTHING;

-- Permissões Visualizador / Cliente
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 'VISUALIZADOR', id FROM public.permissions 
WHERE action = 'view' AND module IN ('dashboard', 'projects', 'works', 'reports')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 'CLIENTE', id FROM public.permissions 
WHERE id IN ('dashboard.view', 'projects.view', 'works.view', 'reports.view', 'documents.view')
ON CONFLICT DO NOTHING;

-- 5. PROFILES (Usuários do Planes OS vinculados ao Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    company TEXT DEFAULT 'Planes ENG',
    department TEXT DEFAULT 'Geral',
    job_title TEXT,
    city TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended', 'inactive')),
    role_id TEXT NOT NULL REFERENCES public.roles(id) DEFAULT 'VISUALIZADOR',
    auth_provider TEXT DEFAULT 'email',
    email_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    preferred_auth_method TEXT DEFAULT 'email',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    rejected_at TIMESTAMPTZ,
    rejected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    rejection_reason TEXT,
    suspended_at TIMESTAMPTZ,
    suspended_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    suspension_reason TEXT,
    last_login_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON public.profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);

-- 6. ACCESS REQUESTS (Solicitações de Acesso com Unicidade de Pedido Pendente)
CREATE TABLE IF NOT EXISTS public.access_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    requested_role TEXT DEFAULT 'Engenharia',
    reason TEXT,
    provider TEXT DEFAULT 'email',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT now(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approval_notes TEXT,
    rejection_reason TEXT,
    email_delivery_status TEXT DEFAULT 'pending'
);

-- Constraint: um único pedido pendente por usuário
CREATE UNIQUE INDEX IF NOT EXISTS idx_single_pending_request_per_user 
ON public.access_requests (user_id) 
WHERE (status = 'pending');

-- 7. ADMIN NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.admin_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL DEFAULT 'NEW_ACCESS_REQUEST',
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    access_request_id UUID REFERENCES public.access_requests(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    read_at TIMESTAMPTZ,
    read_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_unread ON public.admin_notifications(read_at) WHERE read_at IS NULL;

-- 8. ESCOPO: PROJETOS E OBRAS POR USUÁRIO
CREATE TABLE IF NOT EXISTS public.user_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    project_id TEXT NOT NULL,
    access_level TEXT DEFAULT 'read_write',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, project_id)
);

CREATE TABLE IF NOT EXISTS public.user_works (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    work_id TEXT NOT NULL,
    access_level TEXT DEFAULT 'read_write',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, work_id)
);

-- 9. USER PERMISSIONS (Overrides Granulares allow/deny)
CREATE TABLE IF NOT EXISTS public.user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    permission_id TEXT NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    override_type TEXT NOT NULL CHECK (override_type IN ('allow', 'deny')),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, permission_id)
);

-- 10. WEBAUTHN / PASSKEYS PERSISTENTES NO BACKEND (LGPD: Apenas chaves públicas)
CREATE TABLE IF NOT EXISTS public.user_passkeys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    credential_id TEXT UNIQUE NOT NULL,
    public_key TEXT NOT NULL,
    sign_count BIGINT DEFAULT 0,
    transports JSONB DEFAULT '[]'::jsonb,
    device_name TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_user_passkeys_user_id ON public.user_passkeys(user_id);

-- 11. AUDIT LOGS (Trilha de Auditoria LGPD)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- ==============================================================================
-- 12. TRIGGERS & STORED PROCEDURES
-- ==============================================================================

-- Trigger: Ao cadastrar em auth.users (Email, Google, Apple), cria profile pending, request e notificação
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_profile_id UUID;
    v_request_id UUID;
    v_name TEXT;
    v_provider TEXT;
    v_phone TEXT;
    v_company TEXT;
    v_department TEXT;
    v_job_title TEXT;
    v_city TEXT;
    v_requested_role TEXT;
    v_reason TEXT;
    v_avatar_url TEXT;
BEGIN
    -- Extrai metadados recebidos no cadastro ou OAuth
    v_name := COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
    v_provider := COALESCE(NEW.raw_app_meta_data->>'provider', 'email');
    v_phone := NEW.raw_user_meta_data->>'phone';
    v_company := COALESCE(NEW.raw_user_meta_data->>'company', 'Planes ENG');
    v_department := COALESCE(NEW.raw_user_meta_data->>'department', 'Geral');
    v_job_title := NEW.raw_user_meta_data->>'job_title';
    v_city := NEW.raw_user_meta_data->>'city';
    v_requested_role := COALESCE(NEW.raw_user_meta_data->>'requested_role', 'Engenharia');
    v_reason := NEW.raw_user_meta_data->>'reason';
    v_avatar_url := NEW.raw_user_meta_data->>'avatar_url';

    -- 1. Cria ou atualiza profile
    INSERT INTO public.profiles (
        auth_user_id,
        name,
        email,
        phone,
        avatar_url,
        company,
        department,
        job_title,
        city,
        status,
        role_id,
        auth_provider,
        email_verified
    ) VALUES (
        NEW.id,
        v_name,
        NEW.email,
        v_phone,
        v_avatar_url,
        v_company,
        v_department,
        v_job_title,
        v_city,
        'pending',
        'VISUALIZADOR',
        v_provider,
        (NEW.email_confirmed_at IS NOT NULL)
    )
    ON CONFLICT (auth_user_id) DO UPDATE SET
        updated_at = now(),
        email_verified = (NEW.email_confirmed_at IS NOT NULL)
    RETURNING id INTO v_profile_id;

    -- 2. Cria access request apenas se não houver um pendente
    IF NOT EXISTS (SELECT 1 FROM public.access_requests WHERE user_id = v_profile_id AND status = 'pending') THEN
        INSERT INTO public.access_requests (
            user_id,
            requested_role,
            reason,
            provider,
            status
        ) VALUES (
            v_profile_id,
            v_requested_role,
            v_reason,
            v_provider,
            'pending'
        )
        RETURNING id INTO v_request_id;

        -- 3. Cria notificação para os administradores
        INSERT INTO public.admin_notifications (
            type,
            title,
            message,
            user_id,
            access_request_id
        ) VALUES (
            'NEW_ACCESS_REQUEST',
            'Nova solicitação de acesso',
            v_name || ' (' || NEW.email || ') solicitou acesso via ' || upper(v_provider) || '.',
            v_profile_id,
            v_request_id
        );

        -- 4. Log de auditoria
        INSERT INTO public.audit_logs (
            user_id,
            action,
            resource,
            details
        ) VALUES (
            NEW.id,
            'USER_REGISTERED',
            'auth.users',
            jsonb_build_object(
                'profile_id', v_profile_id,
                'email', NEW.email,
                'provider', v_provider,
                'requested_role', v_requested_role
            )
        );
    END IF;

    RETURN NEW;
END;
$$;

-- Registra Trigger em auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Stored Procedure Atômica: Aprovar Solicitação de Acesso em 2 Etapas
CREATE OR REPLACE FUNCTION public.approve_access_request(
    p_request_id UUID,
    p_role_id TEXT,
    p_projects TEXT[] DEFAULT '{}',
    p_works TEXT[] DEFAULT '{}',
    p_permissions JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_req RECORD;
    v_admin_id UUID;
    v_proj TEXT;
    v_work TEXT;
    v_perm RECORD;
BEGIN
    v_admin_id := auth.uid();
    
    -- 1. Localiza a solicitação pendente
    SELECT * INTO v_req FROM public.access_requests WHERE id = p_request_id AND status = 'pending' FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Solicitação não encontrada ou já processada.';
    END IF;

    -- 2. Atualiza Profile
    UPDATE public.profiles SET
        status = 'approved',
        role_id = p_role_id,
        is_active = true,
        approved_at = now(),
        approved_by = v_admin_id,
        updated_at = now()
    WHERE id = v_req.user_id;

    -- 3. Atualiza Access Request
    UPDATE public.access_requests SET
        status = 'approved',
        reviewed_at = now(),
        reviewed_by = v_admin_id,
        approval_notes = 'Aprovado com perfil ' || p_role_id
    WHERE id = p_request_id;

    -- 4. Atribui Escopo de Projetos
    DELETE FROM public.user_projects WHERE user_id = v_req.user_id;
    IF p_projects IS NOT NULL THEN
        FOREACH v_proj IN ARRAY p_projects LOOP
            INSERT INTO public.user_projects (user_id, project_id)
            VALUES (v_req.user_id, v_proj)
            ON CONFLICT (user_id, project_id) DO NOTHING;
        END LOOP;
    END IF;

    -- 5. Atribui Escopo de Obras
    DELETE FROM public.user_works WHERE user_id = v_req.user_id;
    IF p_works IS NOT NULL THEN
        FOREACH v_work IN ARRAY p_works LOOP
            INSERT INTO public.user_works (user_id, work_id)
            VALUES (v_req.user_id, v_work)
            ON CONFLICT (user_id, work_id) DO NOTHING;
        END LOOP;
    END IF;

    -- 6. Atribui Overrides de Permissões
    DELETE FROM public.user_permissions WHERE user_id = v_req.user_id;
    IF p_permissions IS NOT NULL AND jsonb_array_length(p_permissions) > 0 THEN
        FOR v_perm IN SELECT * FROM jsonb_to_recordset(p_permissions) AS (permission_id TEXT, override_type TEXT) LOOP
            INSERT INTO public.user_permissions (user_id, permission_id, override_type)
            VALUES (v_req.user_id, v_perm.permission_id, v_perm.override_type)
            ON CONFLICT (user_id, permission_id) DO NOTHING;
        END LOOP;
    END IF;

    -- 7. Marca Notificação como lida
    UPDATE public.admin_notifications SET
        read_at = now(),
        read_by = v_admin_id
    WHERE access_request_id = p_request_id;

    -- 8. Registra Auditoria
    INSERT INTO public.audit_logs (
        user_id,
        action,
        resource,
        details
    ) VALUES (
        v_admin_id,
        'USER_APPROVED',
        'profiles',
        jsonb_build_object(
            'target_profile_id', v_req.user_id,
            'role_id', p_role_id,
            'projects', p_projects,
            'works', p_works
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'user_id', v_req.user_id,
        'role_id', p_role_id
    );
END;
$$;

-- Stored Procedure: Recusar Solicitação
CREATE OR REPLACE FUNCTION public.reject_access_request(
    p_request_id UUID,
    p_reason TEXT DEFAULT 'Solicitação não atende aos critérios institucionais.'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_req RECORD;
    v_admin_id UUID;
BEGIN
    v_admin_id := auth.uid();

    SELECT * INTO v_req FROM public.access_requests WHERE id = p_request_id AND status = 'pending' FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Solicitação não encontrada ou já processada.';
    END IF;

    UPDATE public.profiles SET
        status = 'rejected',
        is_active = false,
        rejected_at = now(),
        rejected_by = v_admin_id,
        rejection_reason = p_reason,
        updated_at = now()
    WHERE id = v_req.user_id;

    UPDATE public.access_requests SET
        status = 'rejected',
        reviewed_at = now(),
        reviewed_by = v_admin_id,
        rejection_reason = p_reason
    WHERE id = p_request_id;

    UPDATE public.admin_notifications SET
        read_at = now(),
        read_by = v_admin_id
    WHERE access_request_id = p_request_id;

    INSERT INTO public.audit_logs (
        user_id,
        action,
        resource,
        details
    ) VALUES (
        v_admin_id,
        'USER_REJECTED',
        'profiles',
        jsonb_build_object(
            'target_profile_id', v_req.user_id,
            'reason', p_reason
        )
    );

    RETURN jsonb_build_object('success', true, 'user_id', v_req.user_id);
END;
$$;

-- Stored Procedure: Suspender Usuário
CREATE OR REPLACE FUNCTION public.suspend_user(
    p_user_id UUID,
    p_reason TEXT DEFAULT 'Suspensão preventiva administrativa.'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_admin_id UUID;
BEGIN
    v_admin_id := auth.uid();

    UPDATE public.profiles SET
        status = 'suspended',
        is_active = false,
        suspended_at = now(),
        suspended_by = v_admin_id,
        suspension_reason = p_reason,
        updated_at = now()
    WHERE id = p_user_id;

    INSERT INTO public.audit_logs (
        user_id,
        action,
        resource,
        details
    ) VALUES (
        v_admin_id,
        'USER_SUSPENDED',
        'profiles',
        jsonb_build_object(
            'target_profile_id', p_user_id,
            'reason', p_reason
        )
    );

    RETURN jsonb_build_object('success', true, 'user_id', p_user_id);
END;
$$;

-- Stored Procedure: Reativar Usuário
CREATE OR REPLACE FUNCTION public.reactivate_user(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_admin_id UUID;
BEGIN
    v_admin_id := auth.uid();

    UPDATE public.profiles SET
        status = 'approved',
        is_active = true,
        suspended_at = NULL,
        suspended_by = NULL,
        suspension_reason = NULL,
        updated_at = now()
    WHERE id = p_user_id;

    INSERT INTO public.audit_logs (
        user_id,
        action,
        resource,
        details
    ) VALUES (
        v_admin_id,
        'USER_REACTIVATED',
        'profiles',
        jsonb_build_object('target_profile_id', p_user_id)
    );

    RETURN jsonb_build_object('success', true, 'user_id', p_user_id);
END;
$$;

-- ==============================================================================
-- 13. ROW LEVEL SECURITY (RLS) — DENY BY DEFAULT
-- ==============================================================================

-- Função utilitária para checar se o usuário atual é admin ou super admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE auth_user_id = auth.uid() 
          AND role_id IN ('SUPER_ADMIN', 'ADMIN', 'DIRETORIA')
          AND status = 'approved'
          AND is_active = true
    );
$$;

-- Habilita RLS em todas as tabelas
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_works ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_passkeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies: Roles e Permissions (Leitura pública autenticada)
CREATE POLICY "Leitura de roles autenticada" ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Leitura de permissions autenticada" ON public.permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Leitura de role_permissions autenticada" ON public.role_permissions FOR SELECT TO authenticated USING (true);

-- Policies: Profiles
CREATE POLICY "Usuário lê próprio perfil" ON public.profiles FOR SELECT TO authenticated 
USING (auth_user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Usuário atualiza próprio perfil básico" ON public.profiles FOR UPDATE TO authenticated 
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid() AND status IS NOT DISTINCT FROM (SELECT status FROM public.profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY "Admin gerencia todos os perfis" ON public.profiles FOR ALL TO authenticated 
USING (public.is_admin());

-- Policies: Access Requests
CREATE POLICY "Usuário vê suas próprias solicitações" ON public.access_requests FOR SELECT TO authenticated
USING (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()) OR public.is_admin());

CREATE POLICY "Usuário insere sua própria solicitação" ON public.access_requests FOR INSERT TO authenticated
WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY "Admin gerencia solicitações" ON public.access_requests FOR ALL TO authenticated
USING (public.is_admin());

-- Policies: Admin Notifications
CREATE POLICY "Apenas admin lê e atualiza notificações" ON public.admin_notifications FOR ALL TO authenticated
USING (public.is_admin());

-- Policies: User Projects & Works
CREATE POLICY "Usuário lê seu próprio escopo" ON public.user_projects FOR SELECT TO authenticated
USING (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()) OR public.is_admin());

CREATE POLICY "Admin gerencia escopo de projetos" ON public.user_projects FOR ALL TO authenticated
USING (public.is_admin());

CREATE POLICY "Usuário lê suas próprias obras" ON public.user_works FOR SELECT TO authenticated
USING (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()) OR public.is_admin());

CREATE POLICY "Admin gerencia escopo de obras" ON public.user_works FOR ALL TO authenticated
USING (public.is_admin());

-- Policies: User Permissions Overrides
CREATE POLICY "Usuário lê seus próprios overrides" ON public.user_permissions FOR SELECT TO authenticated
USING (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()) OR public.is_admin());

CREATE POLICY "Admin gerencia overrides" ON public.user_permissions FOR ALL TO authenticated
USING (public.is_admin());

-- Policies: User Passkeys
CREATE POLICY "Usuário gerencia suas próprias passkeys" ON public.user_passkeys FOR ALL TO authenticated
USING (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()))
WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));

-- Policies: Audit Logs
CREATE POLICY "Usuário lê apenas auditoria se admin" ON public.audit_logs FOR SELECT TO authenticated
USING (public.is_admin());

CREATE POLICY "Inserção de auditoria permitida" ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (true);

-- ==============================================================================
-- 14. HABILITAÇÃO DO SUPABASE REALTIME
-- ==============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'profiles'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'access_requests'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.access_requests;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'admin_notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;
    END IF;
END $$;
