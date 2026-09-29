-- SchoolPay Phase 3: school onboarding and the first school operations workflows.
-- Approval is operational onboarding only. Schools remain hidden from the public
-- directory until a separate, trusted verification process activates them.

begin;

create table public.school_onboarding_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete restrict,
  school_id uuid unique references public.schools(id) on delete restrict,
  school_name text not null check (char_length(btrim(school_name)) between 2 and 180),
  website text check (website is null or website ~* '^https://'),
  address_line1 text not null check (char_length(btrim(address_line1)) between 3 and 160),
  city text not null check (char_length(btrim(city)) between 2 and 100),
  state text not null check (state ~ '^[A-Z]{2}$'),
  zip_code text not null check (zip_code ~ '^[0-9]{5}(-[0-9]{4})?$'),
  public_phone text check (public_phone is null or char_length(btrim(public_phone)) <= 30),
  school_type text not null check (school_type in ('public', 'private', 'charter', 'other')),
  grades_served text[] not null default '{}',
  contact_name text not null check (char_length(btrim(contact_name)) between 2 and 120),
  contact_title text not null check (char_length(btrim(contact_title)) between 2 and 100),
  contact_email text not null check (char_length(btrim(contact_email)) <= 254),
  contact_phone text not null check (char_length(btrim(contact_phone)) <= 30),
  additional_information text check (additional_information is null or char_length(additional_information) <= 2000),
  status text not null default 'submitted' check (status in ('submitted', 'reviewing', 'information_required', 'approved', 'rejected')),
  review_note text check (review_note is null or char_length(review_note) <= 2000),
  reviewed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_onboarding_approved_has_school check (status <> 'approved' or school_id is not null)
);

create unique index school_onboarding_active_duplicate_idx
  on public.school_onboarding_requests(requester_id, lower(btrim(school_name)), zip_code)
  where status in ('submitted', 'reviewing', 'information_required', 'approved');
create index school_onboarding_status_created_idx
  on public.school_onboarding_requests(status, created_at desc);
create index school_onboarding_requester_created_idx
  on public.school_onboarding_requests(requester_id, created_at desc);

create table public.school_onboarding_status_history (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.school_onboarding_requests(id) on delete cascade,
  previous_status text,
  new_status text not null,
  actor_id uuid references public.profiles(id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);
create index school_onboarding_history_request_idx
  on public.school_onboarding_status_history(request_id, created_at);

alter table public.school_onboarding_requests enable row level security;
alter table public.school_onboarding_status_history enable row level security;

create or replace function private.has_verified_email()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, auth
as $$
  select exists (
    select 1 from auth.users u
    where u.id = auth.uid() and u.email_confirmed_at is not null
  );
$$;

create policy "Verified users can submit a school onboarding request"
  on public.school_onboarding_requests for insert to authenticated
  with check (
    requester_id = (select auth.uid())
    and private.has_verified_email()
    and status = 'submitted'
    and school_id is null
    and reviewed_by is null
    and review_note is null
  );
create policy "Requesters can read their own school onboarding requests"
  on public.school_onboarding_requests for select to authenticated
  using (requester_id = (select auth.uid()));
create policy "Operations can read school onboarding requests"
  on public.school_onboarding_requests for select to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role in ('operations', 'platform_admin', 'super_admin')
  ));
create policy "Requesters can read their own onboarding history"
  on public.school_onboarding_status_history for select to authenticated
  using (exists (
    select 1 from public.school_onboarding_requests r
    where r.id = request_id and r.requester_id = (select auth.uid())
  ));
create policy "Operations can read school onboarding history"
  on public.school_onboarding_status_history for select to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role in ('operations', 'platform_admin', 'super_admin')
  ));

revoke all on public.school_onboarding_requests, public.school_onboarding_status_history from anon, authenticated;
grant select (id, requester_id, school_id, school_name, website, address_line1, city, state, zip_code,
  public_phone, school_type, grades_served, contact_name, contact_title, contact_email, contact_phone,
  additional_information, status, review_note, reviewed_by, created_at, updated_at)
  on public.school_onboarding_requests to authenticated;
grant insert (requester_id, school_name, website, address_line1, city, state, zip_code, public_phone,
  school_type, grades_served, contact_name, contact_title, contact_email, contact_phone, additional_information)
  on public.school_onboarding_requests to authenticated;
grant select on public.school_onboarding_status_history to authenticated;

-- School staff must see their own school's private onboarding fields, while public
-- directory users continue to receive only the explicit public column grants.
create policy "School members can read their own school"
  on public.schools for select to authenticated
  using (exists (
    select 1 from public.school_members sm
    where sm.user_id = (select auth.uid()) and sm.school_id = schools.id
  ));
grant select (id, slug, name, status, directory_visible, address_line1, city, state, zip_code,
  website, public_phone, school_type, grades_served, description, created_at, updated_at)
  on public.schools to authenticated;

create policy "School members can read branches at their own school"
  on public.school_branches for select to authenticated
  using (exists (
    select 1 from public.school_members sm
    where sm.user_id = (select auth.uid()) and sm.school_id = school_branches.school_id
  ));

create policy "School finance members can read their school's invoice files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'schoolpay-private-documents'
    and exists (
      select 1 from public.invoice_documents d
      join public.school_members sm on sm.school_id = d.school_id
      where d.storage_path = storage.objects.name
        and sm.user_id = (select auth.uid())
        and sm.role in ('school_owner', 'school_admin', 'school_finance')
    )
  );

create or replace function private.record_school_onboarding_status()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.school_onboarding_status_history(request_id, previous_status, new_status, actor_id, reason)
    values (new.id, null, new.status, coalesce(auth.uid(), new.requester_id), new.review_note);
  elsif old.status is distinct from new.status then
    insert into public.school_onboarding_status_history(request_id, previous_status, new_status, actor_id, reason)
    values (new.id, old.status, new.status, coalesce(auth.uid(), new.reviewed_by, new.requester_id), new.review_note);
  end if;
  return new;
end;
$$;

create or replace function public.review_school_onboarding_request(
  p_request_id uuid,
  p_decision text,
  p_review_note text default null
)
returns table (request_id uuid, request_status text, created_school_id uuid)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor_id_value uuid := auth.uid();
  request_row public.school_onboarding_requests%rowtype;
  school_id_value uuid;
  membership_id_value uuid;
  base_slug text;
begin
  if actor_id_value is null or not exists (
    select 1 from public.profiles p
    where p.id = actor_id_value and p.role in ('operations', 'platform_admin', 'super_admin')
  ) then
    raise exception 'Operations authorization required' using errcode = '42501';
  end if;
  if p_decision not in ('reviewing', 'information_required', 'approved', 'rejected') then
    raise exception 'Unsupported review decision' using errcode = '22023';
  end if;
  if p_review_note is not null and char_length(p_review_note) > 2000 then
    raise exception 'Review note is too long' using errcode = '22023';
  end if;

  select r.* into request_row
  from public.school_onboarding_requests r
  where r.id = p_request_id
  for update;
  if not found or request_row.status not in ('submitted', 'reviewing', 'information_required') then
    raise exception 'Request is unavailable for review' using errcode = 'P0002';
  end if;

  if p_decision = 'approved' then
    if exists (
      select 1 from public.schools s
      where lower(btrim(s.name)) = lower(btrim(request_row.school_name))
        and s.state = request_row.state
        and s.zip_code = request_row.zip_code
    ) then
      raise exception 'A school with these details already exists; review the existing record' using errcode = '23505';
    end if;

    base_slug := trim(both '-' from regexp_replace(lower(request_row.school_name), '[^a-z0-9]+', '-', 'g'));
    insert into public.schools (
      slug, name, status, directory_visible, address_line1, city, state, zip_code,
      website, public_phone, school_type, grades_served
    ) values (
      base_slug || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10),
      request_row.school_name, 'approved', false, request_row.address_line1,
      request_row.city, request_row.state, request_row.zip_code, request_row.website,
      request_row.public_phone, request_row.school_type, request_row.grades_served
    ) returning id into school_id_value;

    insert into public.school_members(school_id, user_id, role)
    values (school_id_value, request_row.requester_id, 'school_owner')
    returning id into membership_id_value;

    insert into public.audit_logs(actor_id, actor_role, action, resource_type, resource_id, metadata)
    select actor_id_value, p.role, 'schools.created_from_onboarding', 'schools', school_id_value,
      jsonb_build_object('request_id', p_request_id)
    from public.profiles p where p.id = actor_id_value;
    insert into public.audit_logs(actor_id, actor_role, action, resource_type, resource_id, metadata)
    select actor_id_value, p.role, 'school_members.owner_assigned', 'school_members', membership_id_value,
      jsonb_build_object('school_id', school_id_value, 'user_id', request_row.requester_id)
    from public.profiles p where p.id = actor_id_value;
  end if;

  update public.school_onboarding_requests r set
    status = p_decision,
    school_id = school_id_value,
    reviewed_by = actor_id_value,
    review_note = nullif(btrim(p_review_note), ''),
    updated_at = now()
  where r.id = p_request_id;

  insert into public.audit_logs(actor_id, actor_role, action, resource_type, resource_id, metadata)
  select actor_id_value, p.role, 'school_onboarding_requests.' || p_decision,
    'school_onboarding_requests', p_request_id,
    jsonb_build_object('school_id', school_id_value, 'decision', p_decision)
  from public.profiles p where p.id = actor_id_value;

  return query select p_request_id, p_decision, school_id_value;
end;
$$;

-- A parent's explicit consent scopes school-visible child details to the selected
-- school connection request. The student table itself stays private to school staff.
alter table public.student_records
  add constraint student_records_id_school_unique unique (id, school_id);
alter table public.child_school_links
  add column parent_student_identifier text check (parent_student_identifier is null or char_length(btrim(parent_student_identifier)) between 1 and 80),
  add column parent_consent_at timestamptz,
  add column student_record_id uuid,
  add column school_confirmed_at timestamptz,
  add column school_confirmed_by uuid references public.profiles(id) on delete set null,
  add column school_confirmation_note text check (school_confirmation_note is null or char_length(school_confirmation_note) <= 500),
  add constraint child_school_links_student_school_fkey foreign key (student_record_id, school_id) references public.student_records(id, school_id) on delete restrict;
create index child_school_links_school_status_idx
  on public.child_school_links(school_id, status, created_at desc);
create index child_school_links_student_record_idx
  on public.child_school_links(student_record_id) where student_record_id is not null;

revoke insert, update on public.child_school_links from authenticated;
revoke insert (parent_id, child_id, school_id, branch_id, academic_period_id, status)
  on public.child_school_links from authenticated;
revoke update (status, updated_at) on public.child_school_links from authenticated;

drop policy "School staff can review connections for their school" on public.child_school_links;
create policy "School staff can read consented pending connections"
  on public.child_school_links for select to authenticated
  using (
    parent_consent_at is not null
    and status = 'school_confirmation_required'
    and exists (
      select 1 from public.school_members sm
      where sm.user_id = (select auth.uid()) and sm.school_id = child_school_links.school_id
        and sm.role in ('school_owner', 'school_admin', 'school_staff')
    )
  );

create or replace function public.create_parent_child_school_link(
  p_child_id uuid,
  p_school_id uuid,
  p_branch_id uuid default null,
  p_student_identifier text default null,
  p_share_child_information boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  parent_id_value uuid := auth.uid();
  link_id_value uuid;
begin
  if parent_id_value is null or not private.is_current_parent_complete() then
    raise exception 'A complete parent account is required' using errcode = '42501';
  end if;
  if not p_share_child_information then
    raise exception 'Parent consent is required' using errcode = '42501';
  end if;
  if p_student_identifier is not null and char_length(btrim(p_student_identifier)) > 80 then
    raise exception 'Student identifier is invalid' using errcode = '22023';
  end if;
  if not exists (select 1 from public.children c where c.id = p_child_id and c.parent_id = parent_id_value and c.archived_at is null) then
    raise exception 'Child record is unavailable' using errcode = '42501';
  end if;
  if not exists (select 1 from public.schools s where s.id = p_school_id and s.status = 'active' and s.directory_visible) then
    raise exception 'Participating school is unavailable' using errcode = '42501';
  end if;
  if p_branch_id is not null and not exists (
    select 1 from public.school_branches b where b.id = p_branch_id and b.school_id = p_school_id
  ) then
    raise exception 'School campus is unavailable' using errcode = '22023';
  end if;

  insert into public.child_school_links(
    parent_id, child_id, school_id, branch_id, status, parent_student_identifier, parent_consent_at
  ) values (
    parent_id_value, p_child_id, p_school_id, p_branch_id, 'school_confirmation_required',
    nullif(btrim(p_student_identifier), ''), now()
  ) returning id into link_id_value;
  return link_id_value;
end;
$$;

create or replace function public.get_school_child_link_requests(p_school_id uuid)
returns table (
  link_id uuid,
  child_first_name text,
  child_last_name text,
  child_grade text,
  parent_student_identifier text,
  branch_id uuid,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.school_members sm
    where sm.user_id = auth.uid() and sm.school_id = p_school_id
      and sm.role in ('school_owner', 'school_admin', 'school_staff')
  ) then
    raise exception 'School staff authorization required' using errcode = '42501';
  end if;

  return query
  select l.id, c.first_name, c.last_name, c.grade, l.parent_student_identifier, l.branch_id, l.created_at
  from public.child_school_links l
  join public.children c on c.id = l.child_id and c.parent_id = l.parent_id
  where l.school_id = p_school_id and l.status = 'school_confirmation_required'
    and l.parent_consent_at is not null
  order by l.created_at asc
  limit 100;
end;
$$;

create or replace function public.confirm_school_child_connection(
  p_link_id uuid,
  p_student_record_id uuid
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor_id_value uuid := auth.uid();
  link_row public.child_school_links%rowtype;
  child_row public.children%rowtype;
  student_row public.student_records%rowtype;
  matched boolean := false;
  next_status text;
begin
  if actor_id_value is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  select l.* into link_row from public.child_school_links l where l.id = p_link_id for update;
  if not found or link_row.status <> 'school_confirmation_required'
    or link_row.parent_consent_at is null
    or not exists (
      select 1 from public.school_members sm
      where sm.user_id = actor_id_value and sm.school_id = link_row.school_id
        and sm.role in ('school_owner', 'school_admin', 'school_staff')
    ) then
    raise exception 'School connection is unavailable for review' using errcode = '42501';
  end if;

  select c.* into child_row from public.children c where c.id = link_row.child_id and c.parent_id = link_row.parent_id;
  select s.* into student_row from public.student_records s
    where s.id = p_student_record_id and s.school_id = link_row.school_id and s.active;
  if not found then
    next_status := 'not_found';
  else
    matched := lower(regexp_replace(btrim(child_row.first_name), '\\s+', ' ', 'g')) = lower(regexp_replace(btrim(student_row.first_name), '\\s+', ' ', 'g'))
      and lower(regexp_replace(btrim(child_row.last_name), '\\s+', ' ', 'g')) = lower(regexp_replace(btrim(student_row.last_name), '\\s+', ' ', 'g'))
      and (child_row.grade is null or student_row.grade is null or lower(btrim(child_row.grade)) = lower(btrim(student_row.grade)))
      and (link_row.parent_student_identifier is null or lower(btrim(link_row.parent_student_identifier)) = lower(btrim(student_row.student_number)));
    next_status := case when matched then 'matched' else 'not_found' end;
  end if;

  update public.child_school_links set
    status = next_status,
    student_record_id = case when matched then student_row.id else null end,
    school_confirmed_at = now(),
    school_confirmed_by = actor_id_value,
    school_confirmation_note = case when matched then 'School staff matched the request to an active school record.' else 'No school record matched the supplied information.' end,
    updated_at = now()
  where id = p_link_id;
  return next_status;
end;
$$;

create or replace function private.record_child_school_status()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.child_school_status_history(child_school_link_id, previous_status, new_status, actor_id, reason)
    values (new.id, null, new.status, auth.uid(), null);
  elsif old.status is distinct from new.status then
    insert into public.child_school_status_history(child_school_link_id, previous_status, new_status, actor_id, reason)
    values (new.id, old.status, new.status, coalesce(auth.uid(), new.school_confirmed_by), new.school_confirmation_note);
  end if;
  return new;
end;
$$;

revoke all on function public.create_parent_child_school_link(uuid, uuid, uuid, text, boolean) from public, anon;
revoke all on function public.get_school_child_link_requests(uuid) from public, anon;
revoke all on function public.confirm_school_child_connection(uuid, uuid) from public, anon;
grant execute on function public.create_parent_child_school_link(uuid, uuid, uuid, text, boolean) to authenticated;
grant execute on function public.get_school_child_link_requests(uuid) to authenticated;
grant execute on function public.confirm_school_child_connection(uuid, uuid) to authenticated;

revoke all on function private.has_verified_email() from public, anon, authenticated;
revoke all on function private.record_school_onboarding_status() from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.has_verified_email() to authenticated;
revoke all on function public.review_school_onboarding_request(uuid, text, text) from public, anon;
grant execute on function public.review_school_onboarding_request(uuid, text, text) to authenticated;

create trigger school_onboarding_history_write
  after insert or update of status on public.school_onboarding_requests
  for each row execute function private.record_school_onboarding_status();
create trigger school_onboarding_updated_at
  before update on public.school_onboarding_requests
  for each row execute function private.touch_updated_at();

create trigger audit_school_onboarding_requests after insert or update on public.school_onboarding_requests
  for each row execute function private.record_parent_audit();
create trigger audit_school_academic_periods after insert or update on public.academic_periods
  for each row execute function private.record_parent_audit();
create trigger audit_school_fee_structures after insert or update on public.school_fee_structures
  for each row execute function private.record_parent_audit();
create trigger audit_school_student_records after insert or update on public.student_records
  for each row execute function private.record_parent_audit();

commit;
