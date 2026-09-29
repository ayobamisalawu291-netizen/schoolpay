-- SchoolPay Phase 2: U.S. parent onboarding, child/school relationships,
-- private invoice documents, and resumable application drafts.
-- No demo records are inserted and no financing execution is enabled.

begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.is_current_parent()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'parent'
  );
$$;

-- Replace the Phase 1 Nigerian/unused parent fields with U.S. profile fields.
-- Phase 1's migration was not applied to a configured SchoolPay project.
alter table public.parent_profiles
  drop column if exists date_of_birth,
  drop column if exists address_line,
  drop column if exists lga,
  drop column if exists relationship_to_child,
  drop column if exists employment_status,
  add column if not exists first_name text,
  add column if not exists middle_name text,
  add column if not exists last_name text,
  add column if not exists phone text,
  add column if not exists address_line1 text,
  add column if not exists address_line2 text,
  add column if not exists zip_code text,
  add column if not exists preferred_contact_method text,
  add column if not exists email_updates boolean not null default true,
  add column if not exists onboarding_step smallint not null default 0,
  add column if not exists onboarding_completed_at timestamptz;

alter table public.parent_profiles
  add constraint parent_profiles_state_code_check check (state is null or state ~ '^[A-Z]{2}$'),
  add constraint parent_profiles_zip_code_check check (zip_code is null or zip_code ~ '^[0-9]{5}(-[0-9]{4})?$'),
  add constraint parent_profiles_contact_method_check check (preferred_contact_method is null or preferred_contact_method in ('email', 'phone')),
  add constraint parent_profiles_onboarding_step_check check (onboarding_step between 0 and 2);

create or replace function private.is_current_parent_complete()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select private.is_current_parent() and exists (
    select 1 from public.parent_profiles pp
    where pp.user_id = auth.uid()
      and nullif(btrim(pp.first_name), '') is not null
      and nullif(btrim(pp.last_name), '') is not null
      and nullif(btrim(pp.phone), '') is not null
      and nullif(btrim(pp.address_line1), '') is not null
      and nullif(btrim(pp.city), '') is not null
      and nullif(btrim(pp.state), '') is not null
      and nullif(btrim(pp.zip_code), '') is not null
      and pp.preferred_contact_method is not null
      and pp.onboarding_completed_at is not null
  );
$$;

create policy "Parents can update their own safe profile fields"
  on public.profiles for update to authenticated
    using ((select auth.uid()) = id)
    with check ((select auth.uid()) = id);

drop policy if exists "Users can read their own parent profile" on public.parent_profiles;
drop policy if exists "Parents can read their own parent profile" on public.parent_profiles;
create policy "Parents can read their own parent profile"
  on public.parent_profiles for select to authenticated
  using (private.is_current_parent() and (select auth.uid()) = user_id);
create policy "Parents can create their own parent profile"
  on public.parent_profiles for insert to authenticated
  with check (private.is_current_parent() and (select auth.uid()) = user_id);
create policy "Parents can update their own parent profile"
  on public.parent_profiles for update to authenticated
  using (private.is_current_parent() and (select auth.uid()) = user_id)
  with check (private.is_current_parent() and (select auth.uid()) = user_id);

-- Public directory fields only. Private school settlement and review data remain
-- outside the granted column list and the directory policy.
alter table public.schools
  add column if not exists address_line1 text,
  add column if not exists zip_code text,
  add column if not exists website text,
  add column if not exists public_phone text,
  add column if not exists school_type text,
  add column if not exists grades_served text[] not null default '{}';
alter table public.school_branches
  add column if not exists address_line1 text,
  add column if not exists zip_code text,
  add column if not exists public_phone text,
  add constraint school_branches_us_state_code_check check (state is null or state ~ '^[A-Z]{2}$'),
  add constraint school_branches_us_zip_code_check check (zip_code is null or zip_code ~ '^[0-9]{5}(-[0-9]{4})?$'),
  add constraint school_branches_id_school_unique unique (id, school_id);
alter table public.schools
  add constraint schools_us_state_code_check check (state is null or state ~ '^[A-Z]{2}$'),
  add constraint schools_us_zip_code_check check (zip_code is null or zip_code ~ '^[0-9]{5}(-[0-9]{4})?$'),
  add constraint schools_website_check check (website is null or website ~* '^https://');
create index schools_directory_location_idx on public.schools(state, city, zip_code, name) where status = 'active' and directory_visible;

revoke all on public.schools, public.school_branches from anon, authenticated;
grant select (id, slug, name, status, directory_visible, address_line1, city, state, zip_code, website, public_phone, school_type, grades_served, description, created_at, updated_at)
  on public.schools to anon, authenticated;
grant select (id, school_id, name, address_line1, city, state, zip_code, public_phone, created_at)
  on public.school_branches to anon, authenticated;
revoke all on public.parent_profiles from anon, authenticated;

create table public.children (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles(id) on delete cascade,
  first_name text not null check (char_length(btrim(first_name)) between 1 and 80),
  middle_name text check (middle_name is null or char_length(btrim(middle_name)) <= 80),
  last_name text not null check (char_length(btrim(last_name)) between 1 and 80),
  grade text check (grade is null or char_length(btrim(grade)) <= 40),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, parent_id)
);
create index children_parent_created_idx on public.children(parent_id, created_at desc) where archived_at is null;
alter table public.children enable row level security;
create policy "Parents can read their own children" on public.children for select to authenticated using (private.is_current_parent() and (select auth.uid()) = parent_id);
create policy "Parents can add their own children" on public.children for insert to authenticated with check (private.is_current_parent_complete() and (select auth.uid()) = parent_id);
create policy "Parents can update their own children" on public.children for update to authenticated using (private.is_current_parent_complete() and (select auth.uid()) = parent_id) with check (private.is_current_parent_complete() and (select auth.uid()) = parent_id);
revoke all on public.children from anon, authenticated;
grant select (id, parent_id, first_name, middle_name, last_name, grade, archived_at, created_at, updated_at) on public.children to authenticated;
grant insert (parent_id, first_name, middle_name, last_name, grade) on public.children to authenticated;
grant update (first_name, middle_name, last_name, grade, archived_at, updated_at) on public.children to authenticated;

create table public.academic_periods (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete restrict,
  branch_id uuid references public.school_branches(id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  period_type text not null check (period_type in ('academic_year', 'semester', 'trimester', 'quarter', 'term', 'other')),
  academic_year text not null check (academic_year ~ '^[0-9]{4}(-[0-9]{2,4})?$'),
  starts_on date,
  ends_on date,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint academic_periods_date_order check (starts_on is null or ends_on is null or starts_on <= ends_on),
  unique (id, school_id)
);
alter table public.academic_periods
  add constraint academic_periods_branch_school_fkey foreign key (branch_id, school_id) references public.school_branches(id, school_id) on delete restrict;
create index academic_periods_school_active_idx on public.academic_periods(school_id, active, starts_on);
alter table public.academic_periods enable row level security;
create policy "Parents can read periods for participating schools" on public.academic_periods for select to authenticated
  using (private.is_current_parent() and active and exists (select 1 from public.schools s where s.id = school_id and s.status = 'active' and s.directory_visible));
create policy "School staff can read their academic periods" on public.academic_periods for select to authenticated
  using (exists (select 1 from public.school_members sm where sm.user_id = (select auth.uid()) and sm.school_id = academic_periods.school_id and sm.role in ('school_owner', 'school_admin', 'school_finance', 'school_staff')));
create policy "School admins can manage academic periods" on public.academic_periods for all to authenticated
  using (exists (select 1 from public.school_members sm where sm.user_id = (select auth.uid()) and sm.school_id = academic_periods.school_id and sm.role in ('school_owner', 'school_admin')))
  with check (exists (select 1 from public.school_members sm where sm.user_id = (select auth.uid()) and sm.school_id = academic_periods.school_id and sm.role in ('school_owner', 'school_admin')));
revoke all on public.academic_periods from anon, authenticated;
grant select, insert, update on public.academic_periods to authenticated;

create table public.school_fee_structures (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete restrict,
  branch_id uuid references public.school_branches(id) on delete restrict,
  academic_period_id uuid not null references public.academic_periods(id) on delete restrict,
  grade text,
  label text not null check (char_length(btrim(label)) between 1 and 160),
  amount_minor bigint not null check (amount_minor >= 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, school_id)
);
alter table public.school_fee_structures
  add constraint school_fee_structures_branch_school_fkey foreign key (branch_id, school_id) references public.school_branches(id, school_id) on delete restrict,
  add constraint school_fee_structures_period_school_fkey foreign key (academic_period_id, school_id) references public.academic_periods(id, school_id) on delete restrict;
create index school_fee_structures_school_period_idx on public.school_fee_structures(school_id, academic_period_id, active);
alter table public.school_fee_structures enable row level security;
create policy "Parents can view active fee structures at participating schools" on public.school_fee_structures for select to authenticated
  using (private.is_current_parent() and active and currency = 'USD' and exists (select 1 from public.schools s where s.id = school_fee_structures.school_id and s.status = 'active' and s.directory_visible));
create policy "School finance staff can manage their fee structures" on public.school_fee_structures for all to authenticated
  using (exists (select 1 from public.school_members sm where sm.user_id = (select auth.uid()) and sm.school_id = school_fee_structures.school_id and sm.role in ('school_owner', 'school_admin', 'school_finance')))
  with check (exists (select 1 from public.school_members sm where sm.user_id = (select auth.uid()) and sm.school_id = school_fee_structures.school_id and sm.role in ('school_owner', 'school_admin', 'school_finance')));
revoke all on public.school_fee_structures from anon, authenticated;
grant select, insert, update on public.school_fee_structures to authenticated;

-- Student data is school-owned and never available to parents or the public.
create table public.student_records (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete restrict,
  branch_id uuid references public.school_branches(id) on delete restrict,
  academic_period_id uuid references public.academic_periods(id) on delete restrict,
  student_number text not null check (char_length(btrim(student_number)) between 1 and 80),
  first_name text not null check (char_length(btrim(first_name)) between 1 and 80),
  last_name text not null check (char_length(btrim(last_name)) between 1 and 80),
  grade text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, student_number)
);
alter table public.student_records
  add constraint student_records_branch_school_fkey foreign key (branch_id, school_id) references public.school_branches(id, school_id) on delete restrict,
  add constraint student_records_period_school_fkey foreign key (academic_period_id, school_id) references public.academic_periods(id, school_id) on delete restrict;
create index student_records_school_period_idx on public.student_records(school_id, academic_period_id, active);
alter table public.student_records enable row level security;
create policy "School staff can access students at their school" on public.student_records for select to authenticated
  using (exists (select 1 from public.school_members sm where sm.user_id = (select auth.uid()) and sm.school_id = student_records.school_id and sm.role in ('school_owner', 'school_admin', 'school_staff')));
create policy "School admins can add students at their school" on public.student_records for insert to authenticated
  with check (exists (select 1 from public.school_members sm where sm.user_id = (select auth.uid()) and sm.school_id = student_records.school_id and sm.role in ('school_owner', 'school_admin')));
create policy "School admins can update students at their school" on public.student_records for update to authenticated
  using (exists (select 1 from public.school_members sm where sm.user_id = (select auth.uid()) and sm.school_id = student_records.school_id and sm.role in ('school_owner', 'school_admin')))
  with check (exists (select 1 from public.school_members sm where sm.user_id = (select auth.uid()) and sm.school_id = student_records.school_id and sm.role in ('school_owner', 'school_admin')));
revoke all on public.student_records from anon, authenticated;
grant select, insert, update on public.student_records to authenticated;

create table public.child_school_links (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete restrict,
  school_id uuid not null references public.schools(id) on delete restrict,
  branch_id uuid references public.school_branches(id) on delete restrict,
  academic_period_id uuid references public.academic_periods(id) on delete restrict,
  status text not null default 'school_confirmation_required' check (status in ('not_started', 'pending', 'matched', 'not_found', 'school_confirmation_required', 'rejected', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint child_school_link_child_parent_fkey foreign key (child_id, parent_id) references public.children(id, parent_id) on delete restrict,
  constraint child_school_link_branch_school_fkey foreign key (branch_id, school_id) references public.school_branches(id, school_id) on delete restrict,
  constraint child_school_link_period_school_fkey foreign key (academic_period_id, school_id) references public.academic_periods(id, school_id) on delete restrict,
  unique (id, child_id, parent_id, school_id)
);
create index child_school_links_parent_idx on public.child_school_links(parent_id, created_at desc);
create index child_school_links_child_idx on public.child_school_links(child_id, status, updated_at desc);
create unique index child_school_links_active_school_unique on public.child_school_links(child_id, school_id)
  where status in ('pending', 'matched', 'school_confirmation_required');
alter table public.child_school_links enable row level security;
create policy "Parents can read their own child school links" on public.child_school_links for select to authenticated
  using (private.is_current_parent() and (select auth.uid()) = parent_id);
create policy "Parents can request their own child school connection" on public.child_school_links for insert to authenticated
  with check (
    private.is_current_parent_complete()
    and
    (select auth.uid()) = parent_id
    and status = 'school_confirmation_required'
    and exists (select 1 from public.children c where c.id = child_id and c.parent_id = (select auth.uid()) and c.archived_at is null)
    and exists (select 1 from public.schools s where s.id = school_id and s.status = 'active' and s.directory_visible)
    and (branch_id is null or exists (select 1 from public.school_branches b where b.id = child_school_links.branch_id and b.school_id = child_school_links.school_id))
  );
create policy "School staff can review connections for their school" on public.child_school_links for select to authenticated
  using (exists (select 1 from public.school_members sm where sm.user_id = (select auth.uid()) and sm.school_id = child_school_links.school_id and sm.role in ('school_owner', 'school_admin', 'school_staff')));
create policy "School admins can update school connection status" on public.child_school_links for update to authenticated
  using (exists (select 1 from public.school_members sm where sm.user_id = (select auth.uid()) and sm.school_id = child_school_links.school_id and sm.role in ('school_owner', 'school_admin', 'school_staff')))
  with check (exists (select 1 from public.school_members sm where sm.user_id = (select auth.uid()) and sm.school_id = child_school_links.school_id and sm.role in ('school_owner', 'school_admin', 'school_staff')));
revoke all on public.child_school_links from anon, authenticated;
grant select (id, parent_id, child_id, school_id, branch_id, academic_period_id, status, created_at, updated_at) on public.child_school_links to authenticated;
grant insert (parent_id, child_id, school_id, branch_id, academic_period_id, status) on public.child_school_links to authenticated;
grant update (status, updated_at) on public.child_school_links to authenticated;

create table public.school_requests (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles(id) on delete cascade,
  school_name text not null check (char_length(btrim(school_name)) between 2 and 180),
  website text check (website is null or website ~* '^https?://'),
  address_line1 text,
  city text not null check (char_length(btrim(city)) between 2 and 100),
  state text not null check (state ~ '^[A-Z]{2}$'),
  zip_code text not null check (zip_code ~ '^[0-9]{5}(-[0-9]{4})?$'),
  phone text,
  relationship text not null check (relationship in ('parent_guardian', 'student', 'staff', 'other')),
  additional_information text check (additional_information is null or char_length(additional_information) <= 2000),
  status text not null default 'submitted' check (status in ('submitted', 'reviewing', 'contacted', 'onboarding', 'available', 'unable_to_verify', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index school_requests_parent_created_idx on public.school_requests(parent_id, created_at desc);
create unique index school_requests_active_duplicate_idx on public.school_requests(parent_id, lower(btrim(school_name)), zip_code)
  where status not in ('cancelled', 'unable_to_verify');
alter table public.school_requests enable row level security;
create policy "Parents can read their own school requests" on public.school_requests for select to authenticated
  using (private.is_current_parent() and (select auth.uid()) = parent_id);
create policy "Parents can submit school requests" on public.school_requests for insert to authenticated
  with check (private.is_current_parent_complete() and (select auth.uid()) = parent_id and status = 'submitted');
create policy "Parents can cancel their submitted school requests" on public.school_requests for update to authenticated
  using (private.is_current_parent_complete() and (select auth.uid()) = parent_id and status = 'submitted')
  with check (private.is_current_parent_complete() and (select auth.uid()) = parent_id and status = 'cancelled');
create policy "SchoolPay operations can review school requests" on public.school_requests for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('operations', 'platform_admin', 'super_admin')))
  with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('operations', 'platform_admin', 'super_admin')));
create policy "SchoolPay operations can read school requests" on public.school_requests for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('operations', 'platform_admin', 'super_admin')));
revoke all on public.school_requests from anon, authenticated;
grant select on public.school_requests to authenticated;
grant insert (parent_id, school_name, website, address_line1, city, state, zip_code, phone, relationship, additional_information, status) on public.school_requests to authenticated;
grant update (status, updated_at) on public.school_requests to authenticated;

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete restrict,
  school_id uuid not null references public.schools(id) on delete restrict,
  child_school_link_id uuid not null references public.child_school_links(id) on delete restrict,
  academic_period_id uuid references public.academic_periods(id) on delete restrict,
  invoice_reference text not null check (char_length(btrim(invoice_reference)) between 1 and 100),
  issue_date date,
  due_date date,
  original_amount_minor bigint not null check (original_amount_minor between 1 and 9007199254740991),
  amount_paid_minor bigint not null default 0 check (amount_paid_minor between 0 and 9007199254740991),
  outstanding_amount_minor bigint generated always as (original_amount_minor - amount_paid_minor) stored,
  currency text not null default 'USD' check (currency = 'USD'),
  status text not null default 'open' check (status in ('open', 'paid', 'cancelled')),
  source text not null default 'parent_upload' check (source in ('parent_upload', 'school_record')),
  verification_status text not null default 'pending' check (verification_status in ('pending', 'matched', 'mismatch', 'school_confirmation_required', 'not_found', 'rejected')),
  internal_review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invoices_amounts_valid check (amount_paid_minor <= original_amount_minor),
  constraint invoices_due_after_issue check (issue_date is null or due_date is null or issue_date <= due_date),
  constraint invoices_child_parent_fkey foreign key (child_id, parent_id) references public.children(id, parent_id) on delete restrict,
  constraint invoices_parent_school_link_fkey foreign key (child_school_link_id, child_id, parent_id, school_id) references public.child_school_links(id, child_id, parent_id, school_id) on delete restrict,
  constraint invoices_period_school_fkey foreign key (academic_period_id, school_id) references public.academic_periods(id, school_id) on delete restrict,
  unique (id, parent_id),
  unique (id, parent_id, child_id, school_id)
);
create unique index invoices_reference_unique_idx on public.invoices(school_id, child_id, lower(btrim(invoice_reference)));
create index invoices_parent_created_idx on public.invoices(parent_id, created_at desc);
create index invoices_child_school_period_idx on public.invoices(child_id, school_id, academic_period_id, verification_status);

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  label text not null check (char_length(btrim(label)) between 1 and 160),
  amount_minor bigint not null check (amount_minor >= 0),
  created_at timestamptz not null default now()
);
create index invoice_items_invoice_idx on public.invoice_items(invoice_id);

create table public.invoice_documents (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete restrict,
  school_id uuid not null references public.schools(id) on delete restrict,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  storage_path text not null unique,
  original_filename text not null check (char_length(original_filename) between 1 and 240),
  mime_type text not null check (mime_type in ('application/pdf', 'image/jpeg', 'image/png')),
  byte_size bigint not null check (byte_size between 1 and 4194304),
  review_status text not null default 'uploaded' check (review_status in ('uploaded', 'pending_review', 'verified', 'information_required', 'rejected', 'replaced')),
  replaces_document_id uuid references public.invoice_documents(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint invoice_documents_child_parent_fkey foreign key (child_id, parent_id) references public.children(id, parent_id) on delete restrict,
  constraint invoice_documents_invoice_parent_fkey foreign key (invoice_id, parent_id, child_id, school_id) references public.invoices(id, parent_id, child_id, school_id) on delete cascade
);
create index invoice_documents_parent_created_idx on public.invoice_documents(parent_id, created_at desc);
create index invoice_documents_invoice_idx on public.invoice_documents(invoice_id, created_at desc);

alter table public.invoices add column current_document_id uuid references public.invoice_documents(id) on delete set null;

create table public.invoice_revisions (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  invoice_reference text not null,
  issue_date date,
  due_date date,
  original_amount_minor bigint not null,
  amount_paid_minor bigint not null,
  document_id uuid references public.invoice_documents(id) on delete set null,
  created_at timestamptz not null default now()
);
create index invoice_revisions_invoice_idx on public.invoice_revisions(invoice_id, created_at desc);

create table public.financing_applications (
  id uuid primary key default gen_random_uuid(),
  public_reference text not null unique default ('SP-APP-' || upper(replace(gen_random_uuid()::text, '-', ''))),
  parent_id uuid not null references public.profiles(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete restrict,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'information_required', 'school_verification', 'invoice_verification', 'school_confirmation', 'withdrawn', 'cancelled')),
  current_step smallint not null default 4 check (current_step between 1 and 6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint financing_applications_reference_format_check check (public_reference ~ '^SP-APP-[A-F0-9]{32}$'),
  constraint financing_applications_invoice_parent_fkey foreign key (invoice_id, parent_id) references public.invoices(id, parent_id) on delete restrict,
  unique (id, parent_id)
);
create unique index financing_applications_active_obligation_unique on public.financing_applications(invoice_id)
  where status not in ('withdrawn', 'cancelled');
create index financing_applications_parent_updated_idx on public.financing_applications(parent_id, updated_at desc);
create index financing_applications_status_idx on public.financing_applications(status, updated_at desc);

create table public.application_documents (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles(id) on delete cascade,
  application_id uuid not null references public.financing_applications(id) on delete cascade,
  invoice_document_id uuid not null references public.invoice_documents(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (application_id, invoice_document_id),
  constraint application_documents_application_parent_fkey foreign key (application_id, parent_id) references public.financing_applications(id, parent_id) on delete cascade
);
create index application_documents_parent_idx on public.application_documents(parent_id, created_at desc);

create table public.application_status_history (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles(id) on delete cascade,
  application_id uuid not null references public.financing_applications(id) on delete cascade,
  previous_status text,
  new_status text not null,
  actor_id uuid references public.profiles(id) on delete set null,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint application_status_history_parent_fkey foreign key (application_id, parent_id) references public.financing_applications(id, parent_id) on delete cascade
);
create index application_status_history_application_idx on public.application_status_history(application_id, created_at);

create table public.school_request_status_history (
  id uuid primary key default gen_random_uuid(),
  school_request_id uuid not null references public.school_requests(id) on delete cascade,
  previous_status text,
  new_status text not null,
  actor_id uuid references public.profiles(id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);
create index school_request_status_history_request_idx on public.school_request_status_history(school_request_id, created_at);

create table public.child_school_status_history (
  id uuid primary key default gen_random_uuid(),
  child_school_link_id uuid not null references public.child_school_links(id) on delete cascade,
  previous_status text,
  new_status text not null,
  actor_id uuid references public.profiles(id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);
create index child_school_status_history_link_idx on public.child_school_status_history(child_school_link_id, created_at);

create table public.invoice_verification_discrepancies (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  expected_amount_minor bigint check (expected_amount_minor is null or expected_amount_minor >= 0),
  submitted_amount_minor bigint not null check (submitted_amount_minor >= 0),
  reason_code text not null check (reason_code in ('amount_mismatch', 'student_not_found', 'period_mismatch', 'reference_mismatch', 'other')),
  resolution_status text not null default 'open' check (resolution_status in ('open', 'confirmed', 'corrected', 'rejected')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index invoice_verification_discrepancies_open_idx on public.invoice_verification_discrepancies(resolution_status, created_at) where resolution_status = 'open';

-- Row-level access. Public users only see the explicit school directory columns;
-- parent financial and student records are never exposed through broad grants.
alter table public.invoice_items enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_revisions enable row level security;
alter table public.invoice_documents enable row level security;
alter table public.financing_applications enable row level security;
alter table public.application_documents enable row level security;
alter table public.application_status_history enable row level security;
alter table public.school_request_status_history enable row level security;
alter table public.child_school_status_history enable row level security;
alter table public.invoice_verification_discrepancies enable row level security;

create policy "Parents can read their own invoices" on public.invoices for select to authenticated
  using (private.is_current_parent() and (select auth.uid()) = parent_id);
create policy "Parents can submit their own invoice records" on public.invoices for insert to authenticated
  with check (
    private.is_current_parent_complete()
    and
    (select auth.uid()) = parent_id
    and source = 'parent_upload'
    and status = 'open'
    and verification_status in ('pending', 'school_confirmation_required')
    and exists (select 1 from public.child_school_links l where l.id = invoices.child_school_link_id and l.parent_id = (select auth.uid()) and l.child_id = invoices.child_id and l.school_id = invoices.school_id and l.status in ('matched', 'school_confirmation_required'))
    and (academic_period_id is null or exists (select 1 from public.academic_periods ap where ap.id = invoices.academic_period_id and ap.school_id = invoices.school_id and ap.active))
  );
create policy "Parents can revise unverified invoice details" on public.invoices for update to authenticated
  using (
    private.is_current_parent_complete()
    and
    (select auth.uid()) = parent_id
    and source = 'parent_upload'
    and verification_status in ('pending', 'school_confirmation_required')
    and not exists (select 1 from public.financing_applications fa where fa.invoice_id = invoices.id and fa.status not in ('draft', 'withdrawn', 'cancelled'))
  )
  with check (
    private.is_current_parent_complete()
    and
    (select auth.uid()) = parent_id
    and source = 'parent_upload'
    and status = 'open'
    and verification_status in ('pending', 'school_confirmation_required')
    and (current_document_id is null or exists (select 1 from public.invoice_documents d where d.id = invoices.current_document_id and d.invoice_id = invoices.id and d.parent_id = (select auth.uid())))
  );
create policy "School staff can read invoices for their school" on public.invoices for select to authenticated
  using (exists (select 1 from public.school_members sm where sm.user_id = (select auth.uid()) and sm.school_id = invoices.school_id and sm.role in ('school_owner', 'school_admin', 'school_finance')));

create policy "Parents can read invoice items for their invoices" on public.invoice_items for select to authenticated
  using (private.is_current_parent() and exists (select 1 from public.invoices i where i.id = invoice_id and i.parent_id = (select auth.uid())));
create policy "School finance staff can read invoice items for their school" on public.invoice_items for select to authenticated
  using (exists (select 1 from public.invoices i join public.school_members sm on sm.school_id = i.school_id where i.id = invoice_id and sm.user_id = (select auth.uid()) and sm.role in ('school_owner', 'school_admin', 'school_finance')));
create policy "School finance staff can manage invoice items" on public.invoice_items for all to authenticated
  using (exists (select 1 from public.invoices i join public.school_members sm on sm.school_id = i.school_id where i.id = invoice_id and sm.user_id = (select auth.uid()) and sm.role in ('school_owner', 'school_admin', 'school_finance')))
  with check (exists (select 1 from public.invoices i join public.school_members sm on sm.school_id = i.school_id where i.id = invoice_id and sm.user_id = (select auth.uid()) and sm.role in ('school_owner', 'school_admin', 'school_finance')));

create policy "Parents can read their invoice documents" on public.invoice_documents for select to authenticated
  using (private.is_current_parent() and (select auth.uid()) = parent_id);
create policy "Parents can add invoice documents to their own invoices" on public.invoice_documents for insert to authenticated
  with check (
    private.is_current_parent_complete()
    and
    (select auth.uid()) = parent_id
    and review_status = 'uploaded'
    and exists (select 1 from public.invoices i where i.id = invoice_documents.invoice_id and i.parent_id = invoice_documents.parent_id and i.child_id = invoice_documents.child_id and i.school_id = invoice_documents.school_id and i.source = 'parent_upload' and i.verification_status in ('pending', 'school_confirmation_required'))
    and (replaces_document_id is null or exists (select 1 from public.invoice_documents old where old.id = invoice_documents.replaces_document_id and old.parent_id = invoice_documents.parent_id and old.invoice_id = invoice_documents.invoice_id))
  );
create policy "School finance staff can read documents for their school" on public.invoice_documents for select to authenticated
  using (exists (select 1 from public.school_members sm where sm.user_id = (select auth.uid()) and sm.school_id = invoice_documents.school_id and sm.role in ('school_owner', 'school_admin', 'school_finance')));

create policy "Parents can read their applications" on public.financing_applications for select to authenticated
  using (private.is_current_parent() and (select auth.uid()) = parent_id);
create policy "Parents can start a draft for their invoice" on public.financing_applications for insert to authenticated
  with check (
    private.is_current_parent_complete()
    and
    (select auth.uid()) = parent_id
    and status = 'draft'
    and exists (select 1 from public.invoices i where i.id = invoice_id and i.parent_id = (select auth.uid()) and i.source = 'parent_upload' and i.status = 'open' and i.verification_status in ('pending', 'school_confirmation_required', 'matched'))
  );
create policy "Parents can save progress on their own draft" on public.financing_applications for update to authenticated
  using (private.is_current_parent_complete() and (select auth.uid()) = parent_id and status = 'draft')
  with check (private.is_current_parent_complete() and (select auth.uid()) = parent_id and status = 'draft');

create policy "Parents can read application document links" on public.application_documents for select to authenticated
  using (private.is_current_parent() and (select auth.uid()) = parent_id);
create policy "Parents can attach their invoice document to their draft" on public.application_documents for insert to authenticated
  with check (
    private.is_current_parent_complete()
    and
    (select auth.uid()) = parent_id
    and exists (select 1 from public.financing_applications fa where fa.id = application_id and fa.parent_id = (select auth.uid()) and fa.status = 'draft')
    and exists (select 1 from public.invoice_documents d join public.financing_applications fa on fa.invoice_id = d.invoice_id where d.id = invoice_document_id and d.parent_id = (select auth.uid()) and fa.id = application_id)
  );
create policy "Parents can read their application status history" on public.application_status_history for select to authenticated
  using (private.is_current_parent() and (select auth.uid()) = parent_id);
create policy "Parents can read their school request status history" on public.school_request_status_history for select to authenticated
  using (private.is_current_parent() and exists (select 1 from public.school_requests sr where sr.id = school_request_id and sr.parent_id = (select auth.uid())));
create policy "Parents can read their child school status history" on public.child_school_status_history for select to authenticated
  using (private.is_current_parent() and exists (select 1 from public.child_school_links l where l.id = child_school_link_id and l.parent_id = (select auth.uid())));

-- Explicit grants are required for newer Supabase projects that do not expose new
-- public-schema tables to the Data API by default. No table is granted to anon.
revoke all on public.children, public.academic_periods, public.school_fee_structures, public.student_records,
  public.child_school_links, public.school_requests, public.invoices, public.invoice_items,
  public.invoice_documents, public.invoice_revisions, public.financing_applications,
  public.application_documents, public.application_status_history, public.school_request_status_history,
  public.child_school_status_history, public.invoice_verification_discrepancies
  from anon, authenticated;
revoke all on public.parent_profiles from anon, authenticated;

grant select (user_id, first_name, middle_name, last_name, phone, address_line1, address_line2, city, state, zip_code, preferred_contact_method, email_updates, onboarding_step, onboarding_completed_at, created_at, updated_at)
  on public.parent_profiles to authenticated;
grant insert (user_id, first_name, middle_name, last_name, phone, onboarding_step)
  on public.parent_profiles to authenticated;
grant update (first_name, middle_name, last_name, phone, address_line1, address_line2, city, state, zip_code, preferred_contact_method, email_updates, onboarding_step, onboarding_completed_at, updated_at)
  on public.parent_profiles to authenticated;

grant select (id, school_id, branch_id, name, period_type, academic_year, starts_on, ends_on, active, created_at, updated_at) on public.academic_periods to authenticated;
grant insert (school_id, branch_id, name, period_type, academic_year, starts_on, ends_on, active) on public.academic_periods to authenticated;
grant update (branch_id, name, period_type, academic_year, starts_on, ends_on, active, updated_at) on public.academic_periods to authenticated;
grant select, insert, update on public.school_fee_structures to authenticated;
grant select, insert, update on public.student_records to authenticated;
grant select (id, parent_id, child_id, school_id, branch_id, academic_period_id, status, created_at, updated_at) on public.child_school_links to authenticated;
grant insert (parent_id, child_id, school_id, branch_id, academic_period_id, status) on public.child_school_links to authenticated;
grant update (status, updated_at) on public.child_school_links to authenticated;
grant select (id, parent_id, school_name, website, address_line1, city, state, zip_code, phone, relationship, additional_information, status, created_at, updated_at) on public.school_requests to authenticated;
grant insert (parent_id, school_name, website, address_line1, city, state, zip_code, phone, relationship, additional_information, status) on public.school_requests to authenticated;
grant update (status, updated_at) on public.school_requests to authenticated;
grant select (id, parent_id, child_id, school_id, child_school_link_id, academic_period_id, invoice_reference, issue_date, due_date, original_amount_minor, amount_paid_minor, outstanding_amount_minor, currency, status, source, verification_status, current_document_id, created_at, updated_at) on public.invoices to authenticated;
grant insert (parent_id, child_id, school_id, child_school_link_id, academic_period_id, invoice_reference, issue_date, due_date, original_amount_minor, amount_paid_minor, currency, status, source, verification_status) on public.invoices to authenticated;
grant update (academic_period_id, invoice_reference, issue_date, due_date, original_amount_minor, amount_paid_minor, current_document_id, updated_at) on public.invoices to authenticated;
grant select, insert, update on public.invoice_items to authenticated;
grant select (id, parent_id, child_id, school_id, invoice_id, storage_path, original_filename, mime_type, byte_size, review_status, replaces_document_id, created_at) on public.invoice_documents to authenticated;
grant insert (parent_id, child_id, school_id, invoice_id, storage_path, original_filename, mime_type, byte_size, review_status, replaces_document_id) on public.invoice_documents to authenticated;
grant select (id, public_reference, parent_id, invoice_id, status, current_step, created_at, updated_at) on public.financing_applications to authenticated;
grant insert (parent_id, invoice_id, status, current_step) on public.financing_applications to authenticated;
grant update (current_step, updated_at) on public.financing_applications to authenticated;
grant select (id, parent_id, application_id, invoice_document_id, created_at) on public.application_documents to authenticated;
grant insert (parent_id, application_id, invoice_document_id) on public.application_documents to authenticated;
grant select on public.application_status_history, public.school_request_status_history, public.child_school_status_history to authenticated;

-- Storage upload is performed first. This invoker-rights RPC then creates or
-- revises the invoice and attaches its document in one database transaction.
create or replace function public.record_parent_invoice(
  p_invoice_id uuid,
  p_child_id uuid,
  p_school_id uuid,
  p_child_school_link_id uuid,
  p_academic_period_id uuid,
  p_invoice_reference text,
  p_issue_date date,
  p_due_date date,
  p_original_amount_minor bigint,
  p_amount_paid_minor bigint,
  p_storage_path text,
  p_original_filename text,
  p_mime_type text,
  p_byte_size bigint,
  p_replaces_document_id uuid
)
returns table (invoice_id uuid, document_id uuid)
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  parent_id_value uuid := auth.uid();
  invoice_id_value uuid;
  document_id_value uuid;
  existing_invoice public.invoices%rowtype;
  link_status text;
begin
  if parent_id_value is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_original_amount_minor <= 0 or p_amount_paid_minor < 0 or p_amount_paid_minor > p_original_amount_minor then
    raise exception 'Invoice amounts are invalid' using errcode = '22023';
  end if;
  if p_byte_size < 1 or p_byte_size > 4194304 then
    raise exception 'Invoice file size is invalid' using errcode = '22023';
  end if;
  if (storage.foldername(p_storage_path))[1] <> parent_id_value::text then
    raise exception 'Invoice storage path is invalid' using errcode = '42501';
  end if;

  select l.status into link_status
  from public.child_school_links l
  where l.id = p_child_school_link_id
    and l.parent_id = parent_id_value
    and l.child_id = p_child_id
    and l.school_id = p_school_id
    and l.status in ('matched', 'school_confirmation_required');
  if link_status is null then
    raise exception 'Child school connection is unavailable' using errcode = '42501';
  end if;

  if p_invoice_id is null then
    insert into public.invoices (
      parent_id, child_id, school_id, child_school_link_id, academic_period_id,
      invoice_reference, issue_date, due_date, original_amount_minor, amount_paid_minor,
      status, source, verification_status
    ) values (
      parent_id_value, p_child_id, p_school_id, p_child_school_link_id, p_academic_period_id,
      btrim(p_invoice_reference), p_issue_date, p_due_date, p_original_amount_minor, p_amount_paid_minor,
      'open', 'parent_upload', case when link_status = 'matched' then 'pending' else 'school_confirmation_required' end
    ) returning id into invoice_id_value;
  else
    select i.* into existing_invoice
    from public.invoices i
    where i.id = p_invoice_id and i.parent_id = parent_id_value
    for update;
    if not found
      or existing_invoice.source <> 'parent_upload'
      or existing_invoice.status <> 'open'
      or existing_invoice.verification_status not in ('pending', 'school_confirmation_required')
      or existing_invoice.child_id <> p_child_id
      or existing_invoice.school_id <> p_school_id
      or existing_invoice.child_school_link_id <> p_child_school_link_id
      or existing_invoice.current_document_id is distinct from p_replaces_document_id
      or exists (select 1 from public.financing_applications fa where fa.invoice_id = p_invoice_id and fa.status not in ('draft', 'withdrawn', 'cancelled')) then
      raise exception 'Invoice cannot be replaced at this stage' using errcode = '42501';
    end if;
    invoice_id_value := existing_invoice.id;
  end if;

  insert into public.invoice_documents (
    parent_id, child_id, school_id, invoice_id, storage_path, original_filename,
    mime_type, byte_size, review_status, replaces_document_id
  ) values (
    parent_id_value, p_child_id, p_school_id, invoice_id_value, p_storage_path,
    left(p_original_filename, 240), p_mime_type, p_byte_size, 'uploaded', p_replaces_document_id
  ) returning id into document_id_value;

  update public.invoices i set
    invoice_reference = btrim(p_invoice_reference),
    academic_period_id = p_academic_period_id,
    issue_date = p_issue_date,
    due_date = p_due_date,
    original_amount_minor = p_original_amount_minor,
    amount_paid_minor = p_amount_paid_minor,
    current_document_id = document_id_value
  where i.id = invoice_id_value and i.parent_id = parent_id_value;

  insert into public.application_documents(parent_id, application_id, invoice_document_id)
  select parent_id_value, fa.id, document_id_value
  from public.financing_applications fa
  where fa.invoice_id = invoice_id_value
    and fa.parent_id = parent_id_value
    and fa.status = 'draft'
  on conflict (application_id, invoice_document_id) do nothing;

  return query select invoice_id_value, document_id_value;
end;
$$;
revoke all on function public.record_parent_invoice(uuid, uuid, uuid, uuid, uuid, text, date, date, bigint, bigint, text, text, text, bigint, uuid) from public, anon;
grant execute on function public.record_parent_invoice(uuid, uuid, uuid, uuid, uuid, text, date, date, bigint, bigint, text, text, text, bigint, uuid) to authenticated;

-- Create/reuse one active draft per invoice and attach the current invoice
-- document atomically so an interrupted browser request can safely retry.
create or replace function public.create_parent_application_draft(p_invoice_id uuid)
returns table (application_id uuid, public_reference text, application_status text)
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  parent_id_value uuid := auth.uid();
  invoice_document_id_value uuid;
  application_id_value uuid;
  reference_value text;
  status_value text;
begin
  if parent_id_value is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select i.current_document_id into invoice_document_id_value
  from public.invoices i
  where i.id = p_invoice_id
    and i.parent_id = parent_id_value
    and i.source = 'parent_upload'
    and i.status = 'open'
    and i.verification_status in ('pending', 'school_confirmation_required', 'matched');
  if not found then
    raise exception 'Invoice is unavailable for a draft' using errcode = '42501';
  end if;

  insert into public.financing_applications(parent_id, invoice_id, status, current_step)
  values (parent_id_value, p_invoice_id, 'draft', 4)
  on conflict (invoice_id) where status not in ('withdrawn', 'cancelled') do nothing
  returning financing_applications.id, financing_applications.public_reference, financing_applications.status
  into application_id_value, reference_value, status_value;

  if application_id_value is null then
    select fa.id, fa.public_reference, fa.status into application_id_value, reference_value, status_value
    from public.financing_applications fa
    where fa.invoice_id = p_invoice_id
      and fa.status not in ('withdrawn', 'cancelled');
  end if;
  if application_id_value is null then
    raise exception 'Application draft could not be created' using errcode = '40001';
  end if;

  if status_value = 'draft' and invoice_document_id_value is not null then
    insert into public.application_documents(parent_id, application_id, invoice_document_id)
    values (parent_id_value, application_id_value, invoice_document_id_value)
    on conflict (application_id, invoice_document_id) do nothing;
  end if;

  return query select application_id_value, reference_value, status_value;
end;
$$;
revoke all on function public.create_parent_application_draft(uuid) from public, anon;
grant execute on function public.create_parent_application_draft(uuid) to authenticated;

-- Private object storage. Access is scoped by authenticated parent folder, and a
-- parent may clean up only an object that has no document metadata row.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('schoolpay-private-documents', 'schoolpay-private-documents', false, 4194304, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do update set public = false, file_size_limit = 4194304, allowed_mime_types = excluded.allowed_mime_types;

create policy "Parents can upload to their private SchoolPay folder" on storage.objects for insert to authenticated
  with check (private.is_current_parent_complete() and bucket_id = 'schoolpay-private-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Parents can read their own private SchoolPay files" on storage.objects for select to authenticated
  using (private.is_current_parent() and bucket_id = 'schoolpay-private-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Parents can delete unreferenced upload objects" on storage.objects for delete to authenticated
  using (
    private.is_current_parent()
    and
    bucket_id = 'schoolpay-private-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and not exists (select 1 from public.invoice_documents d where d.storage_path = name and d.parent_id = (select auth.uid()))
  );

-- Append-only audit and status history writers are private trigger functions.
create or replace function private.record_parent_audit()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  resource_id_value uuid;
  actor_id_value uuid := auth.uid();
  actor_role_value public.app_role;
begin
  if tg_table_name = 'parent_profiles' then
    resource_id_value := case when tg_op = 'DELETE' then old.user_id else new.user_id end;
  else
    resource_id_value := case when tg_op = 'DELETE' then old.id else new.id end;
  end if;

  if tg_table_name = 'financing_applications' and tg_op = 'UPDATE' and old.status is not distinct from new.status then
    return new;
  end if;

  select p.role into actor_role_value from public.profiles p where p.id = actor_id_value;
  insert into public.audit_logs (actor_id, actor_role, action, resource_type, resource_id, metadata)
  values (actor_id_value, actor_role_value, lower(tg_table_name) || '.' || lower(tg_op), tg_table_name, resource_id_value, jsonb_build_object('operation', lower(tg_op)));
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function private.record_application_status()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.application_status_history(parent_id, application_id, previous_status, new_status, actor_id)
    values (new.parent_id, new.id, null, new.status, auth.uid());
  elsif old.status is distinct from new.status then
    insert into public.application_status_history(parent_id, application_id, previous_status, new_status, actor_id)
    values (new.parent_id, new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$;

create or replace function private.record_school_request_status()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.school_request_status_history(school_request_id, previous_status, new_status, actor_id)
    values (new.id, null, new.status, auth.uid());
  elsif old.status is distinct from new.status then
    insert into public.school_request_status_history(school_request_id, previous_status, new_status, actor_id)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$;

create or replace function private.record_child_school_status()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.child_school_status_history(child_school_link_id, previous_status, new_status, actor_id)
    values (new.id, null, new.status, auth.uid());
  elsif old.status is distinct from new.status then
    insert into public.child_school_status_history(child_school_link_id, previous_status, new_status, actor_id)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$;

create or replace function private.record_invoice_revision()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if old.invoice_reference is distinct from new.invoice_reference
    or old.issue_date is distinct from new.issue_date
    or old.due_date is distinct from new.due_date
    or old.original_amount_minor is distinct from new.original_amount_minor
    or old.amount_paid_minor is distinct from new.amount_paid_minor
    or (old.current_document_id is not null and old.current_document_id is distinct from new.current_document_id) then
    insert into public.invoice_revisions(invoice_id, actor_id, invoice_reference, issue_date, due_date, original_amount_minor, amount_paid_minor, document_id)
    values (old.id, auth.uid(), old.invoice_reference, old.issue_date, old.due_date, old.original_amount_minor, old.amount_paid_minor, old.current_document_id);
  end if;
  return new;
end;
$$;

create or replace function private.touch_updated_at()
returns trigger language plpgsql set search_path = pg_catalog as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on all functions in schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.is_current_parent() to authenticated;
grant execute on function private.is_current_parent_complete() to authenticated;

create trigger audit_parent_profiles after insert or update on public.parent_profiles for each row execute function private.record_parent_audit();
create trigger audit_children after insert or update on public.children for each row execute function private.record_parent_audit();
create trigger audit_child_school_links after insert or update on public.child_school_links for each row execute function private.record_parent_audit();
create trigger audit_school_requests after insert or update on public.school_requests for each row execute function private.record_parent_audit();
create trigger audit_invoices after insert or update on public.invoices for each row execute function private.record_parent_audit();
create trigger audit_invoice_documents after insert on public.invoice_documents for each row execute function private.record_parent_audit();
create trigger audit_financing_applications after insert or update on public.financing_applications for each row execute function private.record_parent_audit();
create trigger application_status_history_write after insert or update of status on public.financing_applications for each row execute function private.record_application_status();
create trigger school_request_status_history_write after insert or update of status on public.school_requests for each row execute function private.record_school_request_status();
create trigger child_school_status_history_write after insert or update of status on public.child_school_links for each row execute function private.record_child_school_status();
create trigger invoice_revision_write before update on public.invoices for each row execute function private.record_invoice_revision();

create trigger parent_profiles_updated_at before update on public.parent_profiles for each row execute function private.touch_updated_at();
create trigger children_updated_at before update on public.children for each row execute function private.touch_updated_at();
create trigger academic_periods_updated_at before update on public.academic_periods for each row execute function private.touch_updated_at();
create trigger school_fee_structures_updated_at before update on public.school_fee_structures for each row execute function private.touch_updated_at();
create trigger student_records_updated_at before update on public.student_records for each row execute function private.touch_updated_at();
create trigger child_school_links_updated_at before update on public.child_school_links for each row execute function private.touch_updated_at();
create trigger school_requests_updated_at before update on public.school_requests for each row execute function private.touch_updated_at();
create trigger invoices_updated_at before update on public.invoices for each row execute function private.touch_updated_at();
create trigger financing_applications_updated_at before update on public.financing_applications for each row execute function private.touch_updated_at();

commit;
