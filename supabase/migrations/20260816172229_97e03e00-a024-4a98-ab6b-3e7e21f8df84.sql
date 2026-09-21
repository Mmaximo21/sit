
create schema if not exists private;
revoke all on schema private from anon, authenticated;

create or replace function private.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function private.my_specialty()
returns text language sql stable security definer set search_path = public as $$
  select specialty from public.profiles where id = auth.uid()
$$;

create or replace function private.is_app_member()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    join public.user_roles r on r.user_id = p.id
    where p.id = auth.uid() and p.active
  )
$$;

grant usage on schema private to postgres, service_role;
grant execute on function private.has_role(uuid, public.app_role) to postgres, service_role;
grant execute on function private.my_specialty() to postgres, service_role;
grant execute on function private.is_app_member() to postgres, service_role;

-- assessment_periods
drop policy if exists periods_master_all on public.assessment_periods;
drop policy if exists periods_select_all_auth on public.assessment_periods;
create policy periods_master_all on public.assessment_periods for all to authenticated
  using (private.has_role(auth.uid(), 'master')) with check (private.has_role(auth.uid(), 'master'));
create policy periods_select_members on public.assessment_periods for select to authenticated
  using (private.is_app_member());

-- period_deadlines
drop policy if exists deadlines_master_all on public.period_deadlines;
drop policy if exists deadlines_select_all_auth on public.period_deadlines;
create policy deadlines_master_all on public.period_deadlines for all to authenticated
  using (private.has_role(auth.uid(), 'master')) with check (private.has_role(auth.uid(), 'master'));
create policy deadlines_select_members on public.period_deadlines for select to authenticated
  using (private.is_app_member());

-- residents
drop policy if exists residents_master_all on public.residents;
drop policy if exists residents_select_auth on public.residents;
create policy residents_master_all on public.residents for all to authenticated
  using (private.has_role(auth.uid(), 'master')) with check (private.has_role(auth.uid(), 'master'));
create policy residents_select_members on public.residents for select to authenticated
  using (private.is_app_member());

-- assessments
drop policy if exists assessments_master_all on public.assessments;
drop policy if exists assessments_select_own_specialty on public.assessments;
drop policy if exists assessments_insert_own_specialty on public.assessments;
drop policy if exists assessments_update_own_open on public.assessments;
create policy assessments_master_all on public.assessments for all to authenticated
  using (private.has_role(auth.uid(), 'master')) with check (private.has_role(auth.uid(), 'master'));
create policy assessments_select_own_specialty on public.assessments for select to authenticated
  using (specialty = private.my_specialty() and author_id = auth.uid());
create policy assessments_insert_own_specialty on public.assessments for insert to authenticated
  with check (author_id = auth.uid() and specialty = private.my_specialty());
create policy assessments_update_own_open on public.assessments for update to authenticated
  using (author_id = auth.uid() and specialty = private.my_specialty() and status <> 'fechado')
  with check (author_id = auth.uid() and specialty = private.my_specialty() and status <> 'fechado');

-- profiles
drop policy if exists profiles_master_all on public.profiles;
drop policy if exists profiles_select_own_or_master on public.profiles;
create policy profiles_master_all on public.profiles for all to authenticated
  using (private.has_role(auth.uid(), 'master')) with check (private.has_role(auth.uid(), 'master'));
create policy profiles_select_own_or_master on public.profiles for select to authenticated
  using (id = auth.uid() or private.has_role(auth.uid(), 'master'));

-- user_roles
drop policy if exists user_roles_select_own_or_master on public.user_roles;
create policy user_roles_select_own_or_master on public.user_roles for select to authenticated
  using (user_id = auth.uid() or private.has_role(auth.uid(), 'master'));

drop function if exists public.has_role(uuid, public.app_role);
drop function if exists public.my_specialty();
