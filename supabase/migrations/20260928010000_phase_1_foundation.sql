-- SchoolPay Phase 1 foundation. This migration creates new application objects only.
-- It does not touch any existing Skulena database or activate financial services.

create extension if not exists pgcrypto with schema extensions;

create type public.app_role as enum (
  'parent', 'school_owner', 'school_admin', 'school_finance', 'school_staff',
  'operations', 'underwriter', 'finance_operations', 'reconciliation', 'support',
  'compliance', 'risk', 'platform_admin', 'super_admin'
);

create type public.school_status as enum (
  'draft', 'submitted', 'under_review', 'information_required', 'approved', 'active', 'suspended', 'rejected'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'parent',
  display_name text not null default '',
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.profiles is 'Private user profile. Role is assigned only by trusted server/database operators, never signup metadata.';

create table public.parent_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  date_of_birth date,
  address_line text,
  city text,
  state text,
  lga text,
  relationship_to_child text,
  employment_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.parent_profiles is 'Sensitive parent profile; server-controlled during Phase 1.';

create table public.schools (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  status public.school_status not null default 'draft',
  directory_visible boolean not null default false,
  city text,
  state text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schools_public_visibility_requires_active check (not directory_visible or status = 'active')
);
create index schools_directory_search_idx on public.schools (status, directory_visible, name);

create table public.school_branches (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete restrict,
  name text not null,
  city text,
  state text,
  created_at timestamptz not null default now(),
  unique (school_id, name)
);

create table public.school_members (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null check (role in ('school_owner', 'school_admin', 'school_finance', 'school_staff')),
  created_at timestamptz not null default now(),
  unique (school_id, user_id)
);
create index school_members_user_idx on public.school_members(user_id, school_id);

-- All execution switches start false and are intentionally readable only by trusted servers.
create table public.feature_flags (
  key text primary key check (key in (
    'schoolpay_enabled', 'applications_enabled', 'identity_verification_enabled',
    'underwriting_enabled', 'offers_enabled', 'agreements_enabled',
    'disbursement_enabled', 'repayments_enabled', 'refunds_enabled'
  )),
  enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);
insert into public.feature_flags(key, enabled) values
  ('schoolpay_enabled', false), ('applications_enabled', false),
  ('identity_verification_enabled', false), ('underwriting_enabled', false),
  ('offers_enabled', false), ('agreements_enabled', false),
  ('disbursement_enabled', false), ('repayments_enabled', false), ('refunds_enabled', false);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  actor_role public.app_role,
  action text not null,
  resource_type text not null,
  resource_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_resource_idx on public.audit_logs(resource_type, resource_id, created_at desc);
create index audit_logs_actor_idx on public.audit_logs(actor_id, created_at desc);

-- Signup role and display name come from controlled server/database defaults; user metadata is ignored.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.profiles (id, role, display_name)
  values (new.id, 'parent', coalesce(nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''), ''));
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.parent_profiles enable row level security;
alter table public.schools enable row level security;
alter table public.school_branches enable row level security;
alter table public.school_members enable row level security;
alter table public.feature_flags enable row level security;
alter table public.audit_logs enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

create policy "Users can read their own parent profile"
  on public.parent_profiles for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Approved schools visible in public directory"
  on public.schools for select to anon, authenticated
  using (status = 'active' and directory_visible = true);

create policy "Approved school branches visible in public directory"
  on public.school_branches for select to anon, authenticated
  using (exists (
    select 1 from public.schools s
    where s.id = school_id and s.status = 'active' and s.directory_visible = true
  ));

create policy "School members can read their own memberships"
  on public.school_members for select to authenticated
  using ((select auth.uid()) = user_id);

-- Profile owners may edit only safe contact fields. Role changes remain server/operator controlled.
revoke all on public.profiles from anon, authenticated;
revoke all on public.schools, public.school_branches from anon, authenticated;
grant select (id, role, display_name, phone, created_at, updated_at) on public.profiles to authenticated;
grant update (display_name, phone, updated_at) on public.profiles to authenticated;

revoke all on public.parent_profiles, public.school_members, public.feature_flags, public.audit_logs from anon, authenticated;
grant select on public.parent_profiles, public.school_members to authenticated;
grant select (id, slug, name, status, directory_visible, city, state, description, created_at, updated_at) on public.schools to anon, authenticated;
grant select (id, school_id, name, city, state, created_at) on public.school_branches to anon, authenticated;

-- No authenticated role can add members, change role, expose private flags, or read audit records.
