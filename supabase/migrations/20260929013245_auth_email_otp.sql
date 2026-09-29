-- Password + email-code second factor for the SchoolPay web sign-in flow.
-- Challenges are server-only, short lived, rate limited, and single use.

begin;

create table private.auth_email_otp_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  code_digest text not null check (code_digest ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  failed_attempts smallint not null default 0 check (failed_attempts between 0 and 5),
  consumed_at timestamptz,
  constraint auth_email_otp_challenges_expiry_check
    check (expires_at > created_at and expires_at <= created_at + interval '10 minutes')
);

create index auth_email_otp_challenges_user_created_idx
  on private.auth_email_otp_challenges (user_id, created_at desc);

alter table private.auth_email_otp_challenges enable row level security;
revoke all on table private.auth_email_otp_challenges from public, anon, authenticated, service_role;

create or replace function public.begin_email_otp_challenge(p_user_id uuid, p_code_digest text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  challenge_id uuid;
  attempts_in_last_hour integer;
  last_request_at timestamptz;
  request_time timestamptz := pg_catalog.now();
begin
  if p_user_id is null or p_code_digest !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'Invalid email code challenge.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 637241));

  delete from private.auth_email_otp_challenges
  where user_id = p_user_id
    and created_at < request_time - interval '1 day';

  select pg_catalog.count(*), pg_catalog.max(created_at)
    into attempts_in_last_hour, last_request_at
    from private.auth_email_otp_challenges
    where user_id = p_user_id
      and created_at >= request_time - interval '1 hour';

  if attempts_in_last_hour >= 5
     or (last_request_at is not null and last_request_at > request_time - interval '60 seconds') then
    raise exception using errcode = 'P0001', message = 'otp_rate_limited';
  end if;

  update private.auth_email_otp_challenges
    set consumed_at = request_time
    where user_id = p_user_id and consumed_at is null;

  insert into private.auth_email_otp_challenges (user_id, code_digest, created_at, expires_at)
    values (p_user_id, p_code_digest, request_time, request_time + interval '10 minutes')
    returning id into challenge_id;

  return challenge_id;
end;
$$;

create or replace function public.verify_email_otp_challenge(p_challenge_id uuid, p_code_digest text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  challenge private.auth_email_otp_challenges%rowtype;
  verification_time timestamptz := pg_catalog.now();
begin
  if p_challenge_id is null or p_code_digest !~ '^[0-9a-f]{64}$' then
    return false;
  end if;

  select * into challenge
    from private.auth_email_otp_challenges
    where id = p_challenge_id
    for update;

  if not found
     or challenge.consumed_at is not null
     or challenge.expires_at <= verification_time
     or challenge.failed_attempts >= 5 then
    return false;
  end if;

  if challenge.code_digest = p_code_digest then
    update private.auth_email_otp_challenges
      set consumed_at = verification_time
      where id = p_challenge_id;
    return true;
  end if;

  update private.auth_email_otp_challenges
    set failed_attempts = failed_attempts + 1
    where id = p_challenge_id;
  return false;
end;
$$;

create or replace function public.cancel_email_otp_challenge(p_challenge_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update private.auth_email_otp_challenges
    set consumed_at = pg_catalog.now()
    where id = p_challenge_id and consumed_at is null;
$$;

revoke all on function public.begin_email_otp_challenge(uuid, text) from public, anon, authenticated;
revoke all on function public.verify_email_otp_challenge(uuid, text) from public, anon, authenticated;
revoke all on function public.cancel_email_otp_challenge(uuid) from public, anon, authenticated;
grant usage on schema private to service_role;
grant execute on function public.begin_email_otp_challenge(uuid, text) to service_role;
grant execute on function public.verify_email_otp_challenge(uuid, text) to service_role;
grant execute on function public.cancel_email_otp_challenge(uuid) to service_role;

commit;
