create table public.deletion_logs (
  id uuid primary key default gen_random_uuid(),
  record_type text not null,
  record_label text not null,
  record_date date,
  details jsonb not null default '{}'::jsonb,
  deleted_by uuid not null references auth.users(id) on delete cascade,
  deleted_by_name text not null,
  created_at timestamp with time zone not null default now()
);

grant select, insert on public.deletion_logs to authenticated;
grant all on public.deletion_logs to service_role;

alter table public.deletion_logs enable row level security;

create policy deletion_logs_select on public.deletion_logs
  for select to authenticated
  using (private.has_role(auth.uid(), 'master') or private.has_role(auth.uid(), 'coordenacao'));

create policy deletion_logs_insert on public.deletion_logs
  for insert to authenticated
  with check (private.has_role(auth.uid(), 'master') and deleted_by = auth.uid());

create index deletion_logs_created_at_idx on public.deletion_logs (created_at desc);