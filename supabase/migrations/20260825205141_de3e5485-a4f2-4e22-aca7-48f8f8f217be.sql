ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'coordenacao';

CREATE OR REPLACE FUNCTION private.is_coordenacao()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role::text = 'coordenacao'
  )
$$;

-- Avaliações: leitura total e edição, sem exclusão
CREATE POLICY assessments_select_coordenacao ON public.assessments
  FOR SELECT TO authenticated
  USING (private.is_coordenacao());

CREATE POLICY assessments_update_coordenacao ON public.assessments
  FOR UPDATE TO authenticated
  USING (private.is_coordenacao())
  WITH CHECK (private.is_coordenacao());

-- Relatórios de plantão: leitura total, sem exclusão
CREATE POLICY shift_reports_select_coordenacao ON public.shift_reports
  FOR SELECT TO authenticated
  USING (private.is_coordenacao());

-- Cadastros e títulos: leitura para gestão de acessos
CREATE POLICY profiles_select_coordenacao ON public.profiles
  FOR SELECT TO authenticated
  USING (private.is_coordenacao());

CREATE POLICY user_roles_select_coordenacao ON public.user_roles
  FOR SELECT TO authenticated
  USING (private.is_coordenacao());

-- Cardápios e exames: edição pelos próprios registros já é coberta; leitura total já existe para membros.
