-- Additive FLOWPRINT schema for the connected Supabase project.
-- Existing project tables are not modified.
create extension if not exists pgcrypto;

create or replace function public.flowprint_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.flowprint_workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.flowprint_processes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.flowprint_workspaces(id) on delete cascade,
  client_id text not null,
  name text not null check (length(trim(name)) between 1 and 160),
  description text not null default '',
  department text not null default '',
  monthly_volume integer not null default 0 check (monthly_volume >= 0),
  currency char(3) not null default 'IDR',
  hourly_labor_cost numeric(14,2) not null default 0 check (hourly_labor_cost >= 0),
  graph_json jsonb not null default '{"nodes":[],"edges":[],"schemaVersion":1}'::jsonb,
  graph_schema_version integer not null default 1 check (graph_schema_version > 0),
  analysis_status text not null default 'draft' check (analysis_status in ('analyzed','draft')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, client_id)
);

create table if not exists public.flowprint_scenarios (
  id uuid primary key default gen_random_uuid(),
  process_id uuid not null references public.flowprint_processes(id) on delete cascade,
  client_id text not null,
  name text not null check (length(trim(name)) between 1 and 160),
  description text not null default '',
  graph_json jsonb not null default '{"nodes":[],"edges":[],"schemaVersion":1}'::jsonb,
  adoption_rate numeric(5,4) not null default 0.8 check (adoption_rate between 0 and 1),
  implementation_cost numeric(14,2) not null default 0 check (implementation_cost >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (process_id, client_id)
);

create index if not exists flowprint_processes_workspace_id_idx on public.flowprint_processes(workspace_id);
create index if not exists flowprint_scenarios_process_id_idx on public.flowprint_scenarios(process_id);

drop trigger if exists flowprint_workspaces_updated_at on public.flowprint_workspaces;
create trigger flowprint_workspaces_updated_at before update on public.flowprint_workspaces
for each row execute function public.flowprint_set_updated_at();

drop trigger if exists flowprint_processes_updated_at on public.flowprint_processes;
create trigger flowprint_processes_updated_at before update on public.flowprint_processes
for each row execute function public.flowprint_set_updated_at();

drop trigger if exists flowprint_scenarios_updated_at on public.flowprint_scenarios;
create trigger flowprint_scenarios_updated_at before update on public.flowprint_scenarios
for each row execute function public.flowprint_set_updated_at();

alter table public.flowprint_workspaces enable row level security;
alter table public.flowprint_processes enable row level security;
alter table public.flowprint_scenarios enable row level security;

drop policy if exists "flowprint workspace owner access" on public.flowprint_workspaces;
create policy "flowprint workspace owner access" on public.flowprint_workspaces
for all to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

drop policy if exists "flowprint process workspace owner access" on public.flowprint_processes;
create policy "flowprint process workspace owner access" on public.flowprint_processes
for all to authenticated
using (exists (
  select 1 from public.flowprint_workspaces w
  where w.id = flowprint_processes.workspace_id and w.owner_id = (select auth.uid())
))
with check (exists (
  select 1 from public.flowprint_workspaces w
  where w.id = flowprint_processes.workspace_id and w.owner_id = (select auth.uid())
));

drop policy if exists "flowprint scenario process owner access" on public.flowprint_scenarios;
create policy "flowprint scenario process owner access" on public.flowprint_scenarios
for all to authenticated
using (exists (
  select 1 from public.flowprint_processes p
  join public.flowprint_workspaces w on w.id = p.workspace_id
  where p.id = flowprint_scenarios.process_id and w.owner_id = (select auth.uid())
))
with check (exists (
  select 1 from public.flowprint_processes p
  join public.flowprint_workspaces w on w.id = p.workspace_id
  where p.id = flowprint_scenarios.process_id and w.owner_id = (select auth.uid())
));

grant select, insert, update, delete on public.flowprint_workspaces to authenticated;
grant select, insert, update, delete on public.flowprint_processes to authenticated;
grant select, insert, update, delete on public.flowprint_scenarios to authenticated;
