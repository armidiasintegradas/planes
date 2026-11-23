-- PLANES Intelligence RLS: isolated PostgreSQL contract, based on SELECT/UPDATE
-- policies and private helper definitions read from Supabase production on 2026-11-23.
-- Synthetic schema/rows only. This is NOT a production migration or full schema dump.
\set ON_ERROR_STOP on
BEGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA auth;
CREATE SCHEMA private;
GRANT USAGE ON SCHEMA auth, private, public TO authenticated;
CREATE TYPE public.planes_user_role AS ENUM ('super_admin','admin','gestor','engenharia','campo','financeiro','cliente');
CREATE TYPE public.planes_user_status AS ENUM ('pending','approved','rejected','suspended');

CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;

CREATE TABLE public.profiles (
 id uuid PRIMARY KEY,
 role public.planes_user_role NOT NULL,
 status public.planes_user_status NOT NULL
);
CREATE TABLE public.projects (
 id uuid PRIMARY KEY, code text UNIQUE, name text NOT NULL
);
CREATE TABLE public.user_project_access (
 user_id uuid NOT NULL REFERENCES public.profiles(id),
 project_id uuid NOT NULL REFERENCES public.projects(id),
 PRIMARY KEY (user_id, project_id)
);
CREATE TABLE public.project_metrics (
 id uuid PRIMARY KEY, project_id uuid NOT NULL REFERENCES public.projects(id),
 physical_progress numeric NOT NULL, target_progress numeric NOT NULL,
 pac_score numeric NOT NULL DEFAULT 0
);
CREATE TABLE public.project_supplies (
 id uuid PRIMARY KEY, project_id uuid NOT NULL REFERENCES public.projects(id), name text NOT NULL
);
CREATE TABLE public.project_tasks (
 id uuid PRIMARY KEY, project_id uuid NOT NULL REFERENCES public.projects(id), title text NOT NULL
);
CREATE TABLE public.project_validations (
 id uuid PRIMARY KEY, project_id uuid NOT NULL REFERENCES public.projects(id), item text NOT NULL
);

CREATE FUNCTION private.current_user_status() RETURNS public.planes_user_status
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT p.status FROM public.profiles p WHERE p.id = (SELECT auth.uid()) LIMIT 1;
$$;
CREATE FUNCTION private.current_user_role() RETURNS public.planes_user_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT p.role FROM public.profiles p WHERE p.id = (SELECT auth.uid()) LIMIT 1;
$$;
CREATE FUNCTION private.is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT coalesce((
   SELECT p.status = 'approved' AND p.role IN ('super_admin','admin')
   FROM public.profiles p WHERE p.id = (SELECT auth.uid()) LIMIT 1
 ), false);
$$;
CREATE FUNCTION private.can_access_project(p_project_id uuid) RETURNS boolean
LANGUAGE sql STABLE SET search_path = '' AS $$
 SELECT
   (SELECT private.current_user_status()) = 'approved'::public.planes_user_status
   AND (
     (SELECT private.is_admin()) OR EXISTS (
       SELECT 1 FROM public.user_project_access upa
       WHERE upa.user_id = (SELECT auth.uid()) AND upa.project_id = p_project_id
     )
   );
$$;
CREATE FUNCTION private.can_edit_project_operations(p_project_id uuid) RETURNS boolean
LANGUAGE sql STABLE SET search_path = '' AS $$
 SELECT (SELECT private.can_access_project(p_project_id))
  AND (SELECT private.current_user_role()) IN (
    'super_admin'::public.planes_user_role,'admin'::public.planes_user_role,
    'gestor'::public.planes_user_role,'engenharia'::public.planes_user_role
  );
$$;
CREATE FUNCTION private.can_edit_project_field_operations(p_project_id uuid) RETURNS boolean
LANGUAGE sql STABLE SET search_path = '' AS $$
 SELECT (SELECT private.can_access_project(p_project_id))
  AND (SELECT private.current_user_role()) IN (
    'super_admin'::public.planes_user_role,'admin'::public.planes_user_role,
    'gestor'::public.planes_user_role,'engenharia'::public.planes_user_role,
    'campo'::public.planes_user_role
  );
$$;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT UPDATE ON public.project_metrics, public.project_supplies,
 public.project_tasks, public.project_validations TO authenticated;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_project_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_supplies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_validations ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select_self_or_admin ON public.profiles FOR SELECT TO authenticated
 USING ((SELECT auth.uid()) IS NOT NULL AND (id = (SELECT auth.uid()) OR (SELECT private.is_admin())));
CREATE POLICY projects_select_scoped ON public.projects FOR SELECT TO authenticated
 USING ((SELECT private.current_user_status()) = 'approved'::public.planes_user_status
 AND ((SELECT private.is_admin()) OR id IN (
   SELECT upa.project_id FROM public.user_project_access upa WHERE upa.user_id = (SELECT auth.uid())
 )));
CREATE POLICY user_project_access_select_self_or_admin ON public.user_project_access FOR SELECT TO authenticated
 USING ((SELECT auth.uid()) IS NOT NULL AND (user_id = (SELECT auth.uid()) OR (SELECT private.is_admin())));

-- Exact access/edit helper semantics copied from the corresponding live policies.
DO $$
DECLARE t text; writer text;
BEGIN
 FOREACH t IN ARRAY ARRAY['project_metrics','project_supplies','project_tasks','project_validations'] LOOP
   writer := CASE WHEN t IN ('project_tasks','project_validations') THEN 'can_edit_project_field_operations'
                  ELSE 'can_edit_project_operations' END;
   EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING ((SELECT private.can_access_project(project_id)))', t || '_select_scoped', t);
   EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING ((SELECT private.%I(project_id))) WITH CHECK ((SELECT private.%I(project_id)))', t || '_update_scoped', t, writer, writer);
 END LOOP;
END $$;

-- IDs are exclusively synthetic and have no connection to Auth or production records.
INSERT INTO public.profiles (id,role,status) VALUES
 ('11111111-1111-4111-8111-111111111111','admin','approved'),
 ('22222222-2222-4222-8222-222222222222','engenharia','approved'),
 ('33333333-3333-4333-8333-333333333333','campo','approved'),
 ('44444444-4444-4444-8444-444444444444','financeiro','approved'),
 ('55555555-5555-4555-8555-555555555555','cliente','approved'),
 ('66666666-6666-4666-8666-666666666666','engenharia','suspended'),
 ('77777777-7777-4777-8777-777777777777','engenharia','pending'),
 ('88888888-8888-4888-8888-888888888888','gestor','approved');
INSERT INTO public.projects (id,code,name) VALUES
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','obra_a','Obra fictícia A'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','obra_b','Obra fictícia B');
INSERT INTO public.user_project_access(user_id, project_id)
 SELECT p.id,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
 FROM public.profiles p WHERE p.role NOT IN ('admin')
 AND p.status='approved';
INSERT INTO public.project_metrics(id,project_id,physical_progress,target_progress,pac_score) VALUES
 ('a0000000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',0,10,80),
 ('b0000000-0000-4000-8000-000000000001','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',55,60,90);
INSERT INTO public.project_supplies(id,project_id,name) VALUES
 ('a0000000-0000-4000-8000-000000000002','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Aço fictício A'),
 ('b0000000-0000-4000-8000-000000000002','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Aço fictício B');
INSERT INTO public.project_tasks(id,project_id,title) VALUES
 ('a0000000-0000-4000-8000-000000000003','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Tarefa fictícia A'),
 ('b0000000-0000-4000-8000-000000000003','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Tarefa fictícia B');
INSERT INTO public.project_validations(id,project_id,item) VALUES
 ('a0000000-0000-4000-8000-000000000004','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Validação fictícia A'),
 ('b0000000-0000-4000-8000-000000000004','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Validação fictícia B');

CREATE FUNCTION public.assert_count(case_name text, actual bigint, expected bigint)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 IF actual IS DISTINCT FROM expected THEN
   RAISE EXCEPTION 'RLS failure [%]: expected %, got %', case_name, expected, actual;
 END IF;
 RAISE NOTICE 'PASS: %', case_name;
END $$;
GRANT EXECUTE ON FUNCTION public.assert_count(text,bigint,bigint) TO authenticated;
COMMIT;

-- Execute as the same non-bypass authenticated role used by Supabase Data API.
SET ROLE authenticated;
SET request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
SELECT public.assert_count('engineer sees only A project', (SELECT count(*) FROM public.projects), 1);
SELECT public.assert_count('engineer sees only A metric, including zero', (SELECT count(*) FROM public.project_metrics WHERE physical_progress=0), 1);
SELECT public.assert_count('engineer cannot read B supplies', (SELECT count(*) FROM public.project_supplies WHERE name='Aço fictício B'), 0);
SELECT public.assert_count('engineer cannot read B tasks', (SELECT count(*) FROM public.project_tasks WHERE title='Tarefa fictícia B'), 0);
SELECT public.assert_count('engineer cannot read B validations', (SELECT count(*) FROM public.project_validations WHERE item='Validação fictícia B'), 0);
SELECT public.assert_count('engineer sees own profile only', (SELECT count(*) FROM public.profiles), 1);
BEGIN;
UPDATE public.project_metrics SET pac_score=81 WHERE project_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
SELECT public.assert_count('engineer may update A metrics', (SELECT count(*) FROM public.project_metrics WHERE pac_score=81), 1);
UPDATE public.project_metrics SET pac_score=91 WHERE project_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
SELECT public.assert_count('engineer cannot update B metrics', (SELECT count(*) FROM public.project_metrics WHERE pac_score=91), 0);
ROLLBACK;

SET request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
SELECT public.assert_count('field sees only A', (SELECT count(*) FROM public.projects), 1);
BEGIN;
UPDATE public.project_metrics SET pac_score=81 WHERE project_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
SELECT public.assert_count('field cannot update metrics', (SELECT count(*) FROM public.project_metrics WHERE pac_score=81), 0);
UPDATE public.project_tasks SET title='Campo atualizado' WHERE project_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
SELECT public.assert_count('field may update A task', (SELECT count(*) FROM public.project_tasks WHERE title='Campo atualizado'), 1);
UPDATE public.project_tasks SET title='Campo invadiu B' WHERE project_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
SELECT public.assert_count('field cannot update B', (SELECT count(*) FROM public.project_tasks WHERE title='Campo invadiu B'), 0);
ROLLBACK;

SET request.jwt.claim.sub = '44444444-4444-4444-8444-444444444444';
SELECT public.assert_count('finance sees only A', (SELECT count(*) FROM public.projects), 1);
BEGIN;
UPDATE public.project_supplies SET name='Finance edit blocked' WHERE project_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
SELECT public.assert_count('finance cannot change supplies by RLS', (SELECT count(*) FROM public.project_supplies WHERE name='Finance edit blocked'), 0);
ROLLBACK;

SET request.jwt.claim.sub = '55555555-5555-4555-8555-555555555555';
SELECT public.assert_count('client sees only A', (SELECT count(*) FROM public.projects), 1);
SELECT public.assert_count('client cannot see B metrics', (SELECT count(*) FROM public.project_metrics WHERE project_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'), 0);
BEGIN;
UPDATE public.project_tasks SET title='Client edit blocked' WHERE project_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
SELECT public.assert_count('client cannot edit A tasks', (SELECT count(*) FROM public.project_tasks WHERE title='Client edit blocked'), 0);
ROLLBACK;

SET request.jwt.claim.sub = '88888888-8888-4888-8888-888888888888';
SELECT public.assert_count('manager sees only assigned A', (SELECT count(*) FROM public.projects), 1);
BEGIN;
UPDATE public.project_metrics SET pac_score=82 WHERE project_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
SELECT public.assert_count('manager may update A metrics', (SELECT count(*) FROM public.project_metrics WHERE pac_score=82), 1);
ROLLBACK;

SET request.jwt.claim.sub = '66666666-6666-4666-8666-666666666666';
SELECT public.assert_count('suspended sees no projects', (SELECT count(*) FROM public.projects), 0);
SELECT public.assert_count('suspended sees no metrics', (SELECT count(*) FROM public.project_metrics), 0);
SET request.jwt.claim.sub = '77777777-7777-4777-8777-777777777777';
SELECT public.assert_count('pending sees no projects', (SELECT count(*) FROM public.projects), 0);
SELECT public.assert_count('pending sees no tasks', (SELECT count(*) FROM public.project_tasks), 0);
SET request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
SELECT public.assert_count('admin sees two projects', (SELECT count(*) FROM public.projects), 2);
SELECT public.assert_count('admin sees both metrics', (SELECT count(*) FROM public.project_metrics), 2);
SELECT public.assert_count('admin can see all profiles', (SELECT count(*) FROM public.profiles), 8);
RESET ROLE;
