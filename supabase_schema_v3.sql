-- ============================================================
-- KPIsEcosystem v3 - Generic Multi-Project Schema
-- IMPORTANT: This does NOT delete your old hr_* tables.
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.kpe_projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry text,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kpe_job_roles (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.kpe_projects(id) on delete cascade,
  title text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kpe_role_responsibilities (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.kpe_job_roles(id) on delete cascade,
  responsibility_text text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.kpe_kpi_library (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.kpe_projects(id) on delete cascade,
  name text not null,
  code text,
  description text,
  kpi_type text,
  unit text default '%',
  default_target numeric(10,2),
  formula_text text,
  frequency text,
  data_source text,
  is_global boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kpe_kpi_templates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.kpe_projects(id) on delete cascade,
  role_id uuid references public.kpe_job_roles(id) on delete set null,
  name text not null,
  version integer not null default 1,
  status text not null default 'draft' check (status in ('draft','active','archived')),
  effective_from date,
  effective_to date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kpe_kpi_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.kpe_kpi_templates(id) on delete cascade,
  kpi_id uuid references public.kpe_kpi_library(id) on delete set null,
  custom_name text,
  custom_description text,
  kpi_type text,
  weight numeric(5,2) not null default 0 check (weight >= 0 and weight <= 100),
  target_value numeric(10,2),
  unit text default '%',
  formula_text text,
  frequency text,
  data_source text,
  sort_order integer not null default 0,
  is_required boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kpe_employees (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.kpe_projects(id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  employment_status text not null default 'active',
  hire_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kpe_employee_assignments (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.kpe_employees(id) on delete cascade,
  role_id uuid not null references public.kpe_job_roles(id) on delete restrict,
  start_date date default current_date,
  end_date date,
  is_primary boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.kpe_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.kpe_projects(id) on delete cascade,
  title text not null,
  description text,
  assigned_employee_id uuid references public.kpe_employees(id) on delete set null,
  priority text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  status text not null default 'open' check (status in ('open','in_progress','done','cancelled')),
  due_date date,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kpe_evaluations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.kpe_projects(id) on delete cascade,
  employee_id uuid not null references public.kpe_employees(id) on delete cascade,
  assignment_id uuid references public.kpe_employee_assignments(id) on delete set null,
  template_id uuid not null references public.kpe_kpi_templates(id) on delete restrict,
  period_start date not null,
  period_end date not null,
  status text not null default 'draft' check (status in ('draft','submitted','reviewed','approved','closed')),
  final_score numeric(5,2) check (final_score is null or (final_score >= 0 and final_score <= 100)),
  manager_comment text,
  employee_comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_end >= period_start)
);

create table if not exists public.kpe_evaluation_results (
  id uuid primary key default gen_random_uuid(),
  evaluation_id uuid not null references public.kpe_evaluations(id) on delete cascade,
  template_item_id uuid not null references public.kpe_kpi_template_items(id) on delete restrict,
  actual_value numeric(10,2),
  score numeric(5,2) check (score is null or (score >= 0 and score <= 100)),
  weighted_score numeric(6,2),
  evidence text,
  evaluator_comment text,
  created_at timestamptz not null default now(),
  unique(evaluation_id, template_item_id)
);

-- generic updated_at trigger
create or replace function public.kpe_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'kpe_projects','kpe_job_roles','kpe_kpi_library','kpe_kpi_templates',
    'kpe_kpi_template_items','kpe_employees','kpe_tasks','kpe_evaluations'
  ]
  loop
    execute format('drop trigger if exists trg_%I_updated_at on public.%I', t, t);
    execute format(
      'create trigger trg_%I_updated_at before update on public.%I for each row execute function public.kpe_set_updated_at()',
      t, t
    );
  end loop;
end $$;

-- indexes
create index if not exists idx_kpe_roles_project on public.kpe_job_roles(project_id);
create index if not exists idx_kpe_resp_role on public.kpe_role_responsibilities(role_id);
create index if not exists idx_kpe_templates_project on public.kpe_kpi_templates(project_id);
create index if not exists idx_kpe_templates_role on public.kpe_kpi_templates(role_id);
create index if not exists idx_kpe_items_template on public.kpe_kpi_template_items(template_id);
create index if not exists idx_kpe_employees_project on public.kpe_employees(project_id);
create index if not exists idx_kpe_tasks_project on public.kpe_tasks(project_id);
create index if not exists idx_kpe_eval_employee on public.kpe_evaluations(employee_id);

-- RLS
alter table public.kpe_projects enable row level security;
alter table public.kpe_job_roles enable row level security;
alter table public.kpe_role_responsibilities enable row level security;
alter table public.kpe_kpi_library enable row level security;
alter table public.kpe_kpi_templates enable row level security;
alter table public.kpe_kpi_template_items enable row level security;
alter table public.kpe_employees enable row level security;
alter table public.kpe_employee_assignments enable row level security;
alter table public.kpe_tasks enable row level security;
alter table public.kpe_evaluations enable row level security;
alter table public.kpe_evaluation_results enable row level security;
