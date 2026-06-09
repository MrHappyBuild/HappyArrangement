-- Supabase bootstrap/upgrade schema for the event workspace + receipt engine.
-- Safe to run multiple times. It creates missing tables, adds missing columns,
-- enables RLS, and prepares the private receipt image bucket.

begin;

create extension if not exists pgcrypto;
create extension if not exists citext;

create table if not exists public.authorized_users (
  email citext primary key,
  role text not null default 'member' check (role in ('member', 'admin')),
  approved boolean not null default false,
  note text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table if exists public.authorized_users
  add column if not exists role text,
  add column if not exists approved boolean,
  add column if not exists note text,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

update public.authorized_users
set
  role = coalesce(role, 'member'),
  approved = coalesce(approved, false),
  note = coalesce(note, ''),
  created_at = coalesce(created_at, timezone('utc', now())),
  updated_at = coalesce(updated_at, timezone('utc', now()));

alter table public.authorized_users
  alter column role set default 'member',
  alter column approved set default false,
  alter column note set default '',
  alter column created_at set default timezone('utc', now()),
  alter column updated_at set default timezone('utc', now());

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email citext unique,
  display_name text not null default '',
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table if exists public.profiles
  add column if not exists email citext,
  add column if not exists display_name text,
  add column if not exists avatar_url text,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

create table if not exists public.user_capabilities (
  user_id uuid primary key references auth.users (id) on delete cascade,
  is_platform_admin boolean not null default false,
  can_create_events boolean not null default false,
  can_submit_receipts boolean not null default false,
  can_submit_manual_invoices boolean not null default false,
  can_send_to_ai_directly boolean not null default false,
  can_manage_planning boolean not null default false,
  can_manage_projects boolean not null default false,
  can_manage_finance boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table if exists public.user_capabilities
  add column if not exists is_platform_admin boolean,
  add column if not exists can_create_events boolean,
  add column if not exists can_submit_receipts boolean,
  add column if not exists can_submit_manual_invoices boolean,
  add column if not exists can_send_to_ai_directly boolean,
  add column if not exists can_manage_planning boolean,
  add column if not exists can_manage_projects boolean,
  add column if not exists can_manage_finance boolean,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users (id) on delete set null,
  slug text unique,
  name text not null,
  title text not null default '',
  description text not null default '',
  location text not null default '',
  starts_at timestamptz,
  ends_at timestamptz,
  dress_code text not null default '',
  practical_info text not null default '',
  workspace_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table if exists public.events
  add column if not exists owner_user_id uuid,
  add column if not exists slug text,
  add column if not exists name text,
  add column if not exists title text,
  add column if not exists description text,
  add column if not exists location text,
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz,
  add column if not exists dress_code text,
  add column if not exists practical_info text,
  add column if not exists workspace_state jsonb,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

update public.events
set workspace_state = coalesce(workspace_state, '{}'::jsonb)
where workspace_state is null;

alter table public.events
  alter column owner_user_id drop not null,
  alter column workspace_state set default '{}'::jsonb;

create table if not exists public.event_people (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  linked_user_id uuid references auth.users (id) on delete set null,
  created_by_user_id uuid references auth.users (id) on delete set null,
  display_name text not null,
  email citext,
  note text not null default '',
  rsvp_status text not null default 'pending'
    check (rsvp_status in ('pending', 'accepted', 'maybe', 'declined')),
  invited_at timestamptz,
  responded_at timestamptz,
  is_finance_member boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table if exists public.event_people
  add column if not exists linked_user_id uuid,
  add column if not exists created_by_user_id uuid,
  add column if not exists display_name text,
  add column if not exists email citext,
  add column if not exists note text,
  add column if not exists rsvp_status text,
  add column if not exists invited_at timestamptz,
  add column if not exists responded_at timestamptz,
  add column if not exists is_finance_member boolean,
  add column if not exists sort_order integer,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

create unique index if not exists event_people_id_event_id_key
  on public.event_people (id, event_id);

create unique index if not exists event_people_event_user_key
  on public.event_people (event_id, linked_user_id)
  where linked_user_id is not null;

create unique index if not exists event_people_event_email_key
  on public.event_people (event_id, email)
  where email is not null;

create table if not exists public.event_access_grants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  person_id uuid,
  planning_role text not null default 'none'
    check (planning_role in ('none', 'viewer', 'manager', 'owner')),
  project_role text not null default 'none'
    check (project_role in ('none', 'helper', 'manager', 'owner')),
  finance_role text not null default 'none'
    check (finance_role in ('none', 'member', 'manager', 'owner')),
  guest_read boolean not null default true,
  guest_rsvp boolean not null default true,
  can_self_claim_finance boolean not null default false,
  created_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (event_id, user_id),
  constraint event_access_grants_person_fkey
    foreign key (person_id)
    references public.event_people (id)
    on delete set null
);

alter table if exists public.event_access_grants
  add column if not exists event_id uuid,
  add column if not exists user_id uuid,
  add column if not exists person_id uuid,
  add column if not exists planning_role text,
  add column if not exists project_role text,
  add column if not exists finance_role text,
  add column if not exists guest_read boolean,
  add column if not exists guest_rsvp boolean,
  add column if not exists can_self_claim_finance boolean,
  add column if not exists created_by_user_id uuid,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

create table if not exists public.event_invites (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  person_id uuid,
  invited_by_user_id uuid references auth.users (id) on delete set null,
  email citext not null,
  invite_token uuid not null default gen_random_uuid(),
  planning_role text not null default 'none'
    check (planning_role in ('none', 'viewer', 'manager', 'owner')),
  project_role text not null default 'none'
    check (project_role in ('none', 'helper', 'manager', 'owner')),
  finance_role text not null default 'none'
    check (finance_role in ('none', 'member', 'manager', 'owner')),
  guest_read boolean not null default true,
  guest_rsvp boolean not null default true,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'accepted', 'declined', 'revoked', 'expired')),
  message text not null default '',
  sent_at timestamptz,
  responded_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (invite_token),
  constraint event_invites_person_fkey
    foreign key (person_id)
    references public.event_people (id)
    on delete set null
);

alter table if exists public.event_invites
  add column if not exists event_id uuid,
  add column if not exists person_id uuid,
  add column if not exists invited_by_user_id uuid,
  add column if not exists email citext,
  add column if not exists invite_token uuid,
  add column if not exists planning_role text,
  add column if not exists project_role text,
  add column if not exists finance_role text,
  add column if not exists guest_read boolean,
  add column if not exists guest_rsvp boolean,
  add column if not exists status text,
  add column if not exists message text,
  add column if not exists sent_at timestamptz,
  add column if not exists responded_at timestamptz,
  add column if not exists expires_at timestamptz,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

create index if not exists event_invites_event_email_idx
  on public.event_invites (event_id, email);

create table if not exists public.event_tasks (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  created_by_user_id uuid references auth.users (id) on delete set null,
  title text not null,
  description text not null default '',
  status text not null default 'todo'
    check (status in ('todo', 'in_progress', 'blocked', 'done', 'canceled')),
  due_at timestamptz,
  desired_start_at timestamptz,
  duration_minutes integer not null default 60 check (duration_minutes > 0),
  order_index integer not null default 0,
  scheduled_start_at timestamptz,
  scheduled_end_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table if exists public.event_tasks
  add column if not exists event_id uuid,
  add column if not exists created_by_user_id uuid,
  add column if not exists title text,
  add column if not exists description text,
  add column if not exists status text,
  add column if not exists due_at timestamptz,
  add column if not exists desired_start_at timestamptz,
  add column if not exists duration_minutes integer,
  add column if not exists order_index integer,
  add column if not exists scheduled_start_at timestamptz,
  add column if not exists scheduled_end_at timestamptz,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

create unique index if not exists event_tasks_id_event_id_key
  on public.event_tasks (id, event_id);

create index if not exists event_tasks_event_order_idx
  on public.event_tasks (event_id, order_index, desired_start_at);

create table if not exists public.event_task_assignees (
  task_id uuid not null,
  event_id uuid not null,
  person_id uuid not null,
  assigned_at timestamptz not null default timezone('utc', now()),
  created_by_user_id uuid references auth.users (id) on delete set null,
  primary key (task_id, person_id),
  constraint event_task_assignees_task_fkey
    foreign key (task_id)
    references public.event_tasks (id)
    on delete cascade,
  constraint event_task_assignees_person_fkey
    foreign key (person_id)
    references public.event_people (id)
    on delete cascade
);

alter table if exists public.event_task_assignees
  add column if not exists task_id uuid,
  add column if not exists event_id uuid,
  add column if not exists person_id uuid,
  add column if not exists assigned_at timestamptz,
  add column if not exists created_by_user_id uuid;

create table if not exists public.event_task_dependencies (
  task_id uuid not null,
  event_id uuid not null,
  depends_on_task_id uuid not null,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (task_id, depends_on_task_id),
  constraint event_task_dependencies_self_check
    check (task_id <> depends_on_task_id),
  constraint event_task_dependencies_task_fkey
    foreign key (task_id)
    references public.event_tasks (id)
    on delete cascade,
  constraint event_task_dependencies_depends_on_fkey
    foreign key (depends_on_task_id)
    references public.event_tasks (id)
    on delete cascade
);

alter table if exists public.event_task_dependencies
  add column if not exists task_id uuid,
  add column if not exists event_id uuid,
  add column if not exists depends_on_task_id uuid,
  add column if not exists created_at timestamptz;

create table if not exists public.event_submissions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  submitted_by_user_id uuid references auth.users (id) on delete set null,
  submitted_by_person_id uuid,
  approved_by_user_id uuid references auth.users (id) on delete set null,
  title text not null,
  kind text not null default 'receipt_upload'
    check (kind in ('receipt_upload', 'manual_invoice', 'advance_contribution')),
  approval_status text not null default 'pending_approval'
    check (
      approval_status in (
        'pending_approval',
        'approved',
        'processing_ai',
        'processed',
        'rejected',
        'needs_changes'
      )
    ),
  note text not null default '',
  payload jsonb not null default '{}'::jsonb,
  requested_amount numeric(12, 2),
  approved_at timestamptz,
  processed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint event_submissions_person_fkey
    foreign key (submitted_by_person_id)
    references public.event_people (id)
    on delete set null
);

alter table if exists public.event_submissions
  add column if not exists event_id uuid,
  add column if not exists submitted_by_user_id uuid,
  add column if not exists submitted_by_person_id uuid,
  add column if not exists approved_by_user_id uuid,
  add column if not exists title text,
  add column if not exists kind text,
  add column if not exists approval_status text,
  add column if not exists note text,
  add column if not exists payload jsonb,
  add column if not exists requested_amount numeric(12, 2),
  add column if not exists approved_at timestamptz,
  add column if not exists processed_at timestamptz,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

create unique index if not exists event_submissions_id_event_id_key
  on public.event_submissions (id, event_id);

create table if not exists public.receipt_jobs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events (id) on delete set null,
  source_submission_id uuid references public.event_submissions (id) on delete set null,
  created_by_user_id uuid references auth.users (id) on delete set null,
  submitted_by_person_id uuid,
  paid_by_member_id uuid,
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'completed', 'failed', 'canceled')),
  source_kind text not null default 'image_upload'
    check (source_kind in ('image_upload', 'manual_invoice', 'imported')),
  original_filename text,
  stored_image_path text,
  storage_bucket text,
  storage_object_path text,
  sanitized_content_type text,
  input_sha256 text,
  merchant_name text,
  merchant_category text not null default 'unknown',
  receipt_date date,
  receipt_time time,
  currency text not null default 'NOK',
  subtotal numeric(12, 2),
  tax_total numeric(12, 2),
  grand_total numeric(12, 2),
  notes text[] not null default '{}',
  result jsonb,
  distribution_state jsonb,
  error_message text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  constraint receipt_jobs_submitted_by_person_fkey
    foreign key (submitted_by_person_id)
    references public.event_people (id)
    on delete set null,
  constraint receipt_jobs_paid_by_member_fkey
    foreign key (paid_by_member_id)
    references public.event_people (id)
    on delete set null
);

alter table if exists public.receipt_jobs
  add column if not exists event_id uuid,
  add column if not exists source_submission_id uuid,
  add column if not exists created_by_user_id uuid,
  add column if not exists submitted_by_person_id uuid,
  add column if not exists paid_by_member_id uuid,
  add column if not exists source_kind text,
  add column if not exists original_filename text,
  add column if not exists stored_image_path text,
  add column if not exists storage_bucket text,
  add column if not exists storage_object_path text,
  add column if not exists sanitized_content_type text,
  add column if not exists input_sha256 text,
  add column if not exists merchant_name text,
  add column if not exists merchant_category text,
  add column if not exists receipt_date date,
  add column if not exists receipt_time time,
  add column if not exists currency text,
  add column if not exists subtotal numeric(12, 2),
  add column if not exists tax_total numeric(12, 2),
  add column if not exists grand_total numeric(12, 2),
  add column if not exists notes text[],
  add column if not exists result jsonb,
  add column if not exists distribution_state jsonb,
  add column if not exists error_message text,
  add column if not exists completed_at timestamptz;

create unique index if not exists receipt_jobs_id_event_id_key
  on public.receipt_jobs (id, event_id);

create index if not exists receipt_jobs_event_status_idx
  on public.receipt_jobs (event_id, status, created_at desc);

create table if not exists public.receipt_line_items (
  id uuid primary key default gen_random_uuid(),
  receipt_job_id uuid not null,
  event_id uuid,
  sort_index integer not null default 0,
  name text not null default '',
  quantity numeric(12, 3) not null default 1,
  unit_price numeric(12, 2),
  line_total numeric(12, 2),
  raw_line text,
  source_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint receipt_line_items_receipt_job_fkey
    foreign key (receipt_job_id)
    references public.receipt_jobs (id)
    on delete cascade
);

alter table if exists public.receipt_line_items
  add column if not exists receipt_job_id uuid,
  add column if not exists event_id uuid,
  add column if not exists sort_index integer,
  add column if not exists name text,
  add column if not exists quantity numeric(12, 3),
  add column if not exists unit_price numeric(12, 2),
  add column if not exists line_total numeric(12, 2),
  add column if not exists raw_line text,
  add column if not exists source_payload jsonb,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

create unique index if not exists receipt_line_items_id_event_id_key
  on public.receipt_line_items (id, event_id);

create index if not exists receipt_line_items_receipt_sort_idx
  on public.receipt_line_items (receipt_job_id, sort_index);

create table if not exists public.line_claims (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  receipt_job_id uuid not null,
  line_item_id uuid not null,
  event_person_id uuid not null,
  claimed_by_user_id uuid references auth.users (id) on delete set null,
  claim_type text not null default 'whole'
    check (claim_type in ('whole', 'split', 'manual')),
  label text not null default '',
  quantity numeric(12, 3),
  amount numeric(12, 2),
  percent numeric(9, 4),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint line_claims_receipt_job_fkey
    foreign key (receipt_job_id)
    references public.receipt_jobs (id)
    on delete cascade,
  constraint line_claims_line_item_fkey
    foreign key (line_item_id)
    references public.receipt_line_items (id)
    on delete cascade,
  constraint line_claims_person_fkey
    foreign key (event_person_id)
    references public.event_people (id)
    on delete cascade
);

alter table if exists public.line_claims
  add column if not exists event_id uuid,
  add column if not exists receipt_job_id uuid,
  add column if not exists line_item_id uuid,
  add column if not exists event_person_id uuid,
  add column if not exists claimed_by_user_id uuid,
  add column if not exists claim_type text,
  add column if not exists label text,
  add column if not exists quantity numeric(12, 3),
  add column if not exists amount numeric(12, 2),
  add column if not exists percent numeric(9, 4),
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

create index if not exists line_claims_event_person_idx
  on public.line_claims (event_id, event_person_id);

create index if not exists line_claims_receipt_line_idx
  on public.line_claims (receipt_job_id, line_item_id);

create table if not exists public.event_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  member_person_id uuid not null,
  counterparty_person_id uuid,
  created_by_user_id uuid references auth.users (id) on delete set null,
  related_submission_id uuid references public.event_submissions (id) on delete set null,
  related_receipt_job_id uuid references public.receipt_jobs (id) on delete set null,
  entry_type text not null default 'advance_contribution'
    check (entry_type in ('advance_contribution', 'settlement_transfer', 'manual_adjustment', 'refund')),
  approval_status text not null default 'approved'
    check (approval_status in ('approved', 'pending_approval', 'rejected')),
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null default 'NOK',
  note text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint event_ledger_entries_member_fkey
    foreign key (member_person_id)
    references public.event_people (id)
    on delete cascade,
  constraint event_ledger_entries_counterparty_fkey
    foreign key (counterparty_person_id)
    references public.event_people (id)
    on delete set null
);

alter table if exists public.event_ledger_entries
  add column if not exists event_id uuid,
  add column if not exists member_person_id uuid,
  add column if not exists counterparty_person_id uuid,
  add column if not exists created_by_user_id uuid,
  add column if not exists related_submission_id uuid,
  add column if not exists related_receipt_job_id uuid,
  add column if not exists entry_type text,
  add column if not exists approval_status text,
  add column if not exists amount numeric(12, 2),
  add column if not exists currency text,
  add column if not exists note text,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

create index if not exists event_ledger_entries_event_type_idx
  on public.event_ledger_entries (event_id, entry_type, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.current_user_email()
returns citext
language sql
stable
as $$
  select nullif(auth.jwt() ->> 'email', '')::citext;
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  approved_record public.authorized_users%rowtype;
  derived_display_name text;
  is_admin boolean := false;
begin
  select *
  into approved_record
  from public.authorized_users
  where email = new.email::citext;

  derived_display_name :=
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      new.raw_user_meta_data ->> 'full_name',
      split_part(coalesce(new.email, ''), '@', 1),
      ''
    );

  insert into public.profiles (id, email, display_name)
  values (new.id, new.email::citext, derived_display_name)
  on conflict (id) do update
  set
    email = excluded.email,
    display_name = case
      when public.profiles.display_name = '' then excluded.display_name
      else public.profiles.display_name
    end,
    updated_at = timezone('utc', now());

  if approved_record.approved and approved_record.role = 'admin' then
    is_admin := true;
  end if;

  insert into public.user_capabilities (
    user_id,
    is_platform_admin,
    can_create_events,
    can_submit_receipts,
    can_submit_manual_invoices,
    can_send_to_ai_directly,
    can_manage_planning,
    can_manage_projects,
    can_manage_finance
  )
  values (
    new.id,
    is_admin,
    is_admin,
    is_admin,
    is_admin,
    is_admin,
    is_admin,
    is_admin,
    is_admin
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(
      exists (
        select 1
        from public.user_capabilities uc
        where uc.user_id = auth.uid()
          and uc.is_platform_admin = true
      ),
      false
    )
    or coalesce(
      exists (
        select 1
        from public.authorized_users au
        where au.email = public.current_user_email()
          and au.approved = true
          and au.role = 'admin'
      ),
      false
    );
$$;

create or replace function public.is_approved_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_platform_admin()
    or exists (
      select 1
      from public.authorized_users au
      where au.email = public.current_user_email()
        and au.approved = true
    );
$$;

create or replace function public.user_can_create_events()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_platform_admin()
    or exists (
      select 1
      from public.user_capabilities uc
      where uc.user_id = auth.uid()
        and uc.can_create_events = true
    );
$$;

create or replace function public.user_can_submit_receipts()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_platform_admin()
    or exists (
      select 1
      from public.user_capabilities uc
      where uc.user_id = auth.uid()
        and uc.can_submit_receipts = true
    );
$$;

create or replace function public.user_can_submit_manual_invoices()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_platform_admin()
    or exists (
      select 1
      from public.user_capabilities uc
      where uc.user_id = auth.uid()
        and uc.can_submit_manual_invoices = true
    );
$$;

create or replace function public.user_can_send_to_ai_directly()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_platform_admin()
    or exists (
      select 1
      from public.user_capabilities uc
      where uc.user_id = auth.uid()
        and uc.can_send_to_ai_directly = true
    );
$$;

create or replace function public.event_is_owner(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_platform_admin()
    or exists (
      select 1
      from public.events e
      where e.id = p_event_id
        and e.owner_user_id = auth.uid()
    );
$$;

create or replace function public.event_has_access(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.event_is_owner(p_event_id)
    or exists (
      select 1
      from public.event_access_grants eag
      where eag.event_id = p_event_id
        and eag.user_id = auth.uid()
    );
$$;

create or replace function public.event_can_manage_planning(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.event_is_owner(p_event_id)
    or exists (
      select 1
      from public.event_access_grants eag
      where eag.event_id = p_event_id
        and eag.user_id = auth.uid()
        and eag.planning_role in ('manager', 'owner')
    );
$$;

create or replace function public.event_can_view_project(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.event_is_owner(p_event_id)
    or exists (
      select 1
      from public.event_access_grants eag
      where eag.event_id = p_event_id
        and eag.user_id = auth.uid()
        and eag.project_role <> 'none'
    );
$$;

create or replace function public.event_can_manage_project(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.event_is_owner(p_event_id)
    or exists (
      select 1
      from public.event_access_grants eag
      where eag.event_id = p_event_id
        and eag.user_id = auth.uid()
        and eag.project_role in ('manager', 'owner')
    );
$$;

create or replace function public.can_current_user_update_task(p_task_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1
      from public.event_tasks et
      where et.id = p_task_id
        and public.event_can_manage_project(et.event_id)
    )
    or exists (
      select 1
      from public.event_tasks et
      join public.event_task_assignees eta
        on eta.task_id = et.id
       and eta.event_id = et.event_id
      join public.event_access_grants eag
        on eag.event_id = et.event_id
       and eag.user_id = auth.uid()
       and eag.person_id = eta.person_id
      where et.id = p_task_id
        and eag.project_role in ('helper', 'manager', 'owner')
    );
$$;

create or replace function public.event_can_view_finance(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.event_is_owner(p_event_id)
    or exists (
      select 1
      from public.event_access_grants eag
      where eag.event_id = p_event_id
        and eag.user_id = auth.uid()
        and eag.finance_role <> 'none'
    );
$$;

create or replace function public.event_can_manage_finance(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.event_is_owner(p_event_id)
    or exists (
      select 1
      from public.event_access_grants eag
      where eag.event_id = p_event_id
        and eag.user_id = auth.uid()
        and eag.finance_role in ('manager', 'owner')
    );
$$;

create or replace function public.event_can_view_approvals(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.event_can_manage_planning(p_event_id)
    or public.event_can_manage_finance(p_event_id);
$$;

create or replace function public.can_access_receipt_job(p_receipt_job_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.receipt_jobs rj
    where rj.id = p_receipt_job_id
      and (
        public.is_platform_admin()
        or (rj.event_id is not null and public.event_can_view_finance(rj.event_id))
        or (rj.event_id is null and rj.created_by_user_id = auth.uid())
      )
  );
$$;

create or replace function public.can_manage_receipt_job(p_receipt_job_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.receipt_jobs rj
    where rj.id = p_receipt_job_id
      and (
        public.is_platform_admin()
        or (rj.event_id is not null and public.event_can_manage_finance(rj.event_id))
        or (rj.created_by_user_id = auth.uid())
      )
  );
$$;

create or replace function public.event_can_self_claim_finance(
  p_event_id uuid,
  p_person_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.event_can_manage_finance(p_event_id)
    or exists (
      select 1
      from public.event_access_grants eag
      where eag.event_id = p_event_id
        and eag.user_id = auth.uid()
        and eag.person_id = p_person_id
        and (
          eag.can_self_claim_finance = true
          or eag.finance_role in ('member', 'manager', 'owner')
        )
    );
$$;

create or replace function public.guard_event_people_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_platform_admin() or public.event_can_manage_planning(old.event_id) then
    return new;
  end if;

  if old.linked_user_id is distinct from auth.uid() then
    raise exception 'Du har ikke tilgang til aa oppdatere denne personen.';
  end if;

  if new.display_name is distinct from old.display_name
     or new.email is distinct from old.email
     or new.created_by_user_id is distinct from old.created_by_user_id
     or new.invited_at is distinct from old.invited_at
     or new.is_finance_member is distinct from old.is_finance_member
     or new.sort_order is distinct from old.sort_order
     or new.event_id is distinct from old.event_id
     or new.linked_user_id is distinct from old.linked_user_id then
    raise exception 'Du kan bare oppdatere RSVP, svartid og notat pa din egen person.';
  end if;

  return new;
end;
$$;

create or replace function public.guard_event_task_member_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_platform_admin() or public.event_can_manage_project(old.event_id) then
    return new;
  end if;

  if not public.can_current_user_update_task(old.id) then
    raise exception 'Du har ikke tilgang til aa oppdatere denne oppgaven.';
  end if;

  if new.title is distinct from old.title
     or new.description is distinct from old.description
     or new.due_at is distinct from old.due_at
     or new.desired_start_at is distinct from old.desired_start_at
     or new.duration_minutes is distinct from old.duration_minutes
     or new.order_index is distinct from old.order_index
     or new.scheduled_start_at is distinct from old.scheduled_start_at
     or new.scheduled_end_at is distinct from old.scheduled_end_at
     or new.event_id is distinct from old.event_id
     or new.created_by_user_id is distinct from old.created_by_user_id then
    raise exception 'Bare prosjektforvalter kan endre denne oppgaven utover status.';
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_auth_user();

drop trigger if exists set_authorized_users_updated_at on public.authorized_users;
create trigger set_authorized_users_updated_at
before update on public.authorized_users
for each row
execute procedure public.set_updated_at();

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute procedure public.set_updated_at();

drop trigger if exists set_user_capabilities_updated_at on public.user_capabilities;
create trigger set_user_capabilities_updated_at
before update on public.user_capabilities
for each row
execute procedure public.set_updated_at();

drop trigger if exists set_events_updated_at on public.events;
create trigger set_events_updated_at
before update on public.events
for each row
execute procedure public.set_updated_at();

drop trigger if exists set_event_people_updated_at on public.event_people;
create trigger set_event_people_updated_at
before update on public.event_people
for each row
execute procedure public.set_updated_at();

drop trigger if exists guard_event_people_self_update on public.event_people;
create trigger guard_event_people_self_update
before update on public.event_people
for each row
execute procedure public.guard_event_people_self_update();

drop trigger if exists set_event_access_grants_updated_at on public.event_access_grants;
create trigger set_event_access_grants_updated_at
before update on public.event_access_grants
for each row
execute procedure public.set_updated_at();

drop trigger if exists set_event_invites_updated_at on public.event_invites;
create trigger set_event_invites_updated_at
before update on public.event_invites
for each row
execute procedure public.set_updated_at();

drop trigger if exists set_event_tasks_updated_at on public.event_tasks;
create trigger set_event_tasks_updated_at
before update on public.event_tasks
for each row
execute procedure public.set_updated_at();

drop trigger if exists guard_event_task_member_update on public.event_tasks;
create trigger guard_event_task_member_update
before update on public.event_tasks
for each row
execute procedure public.guard_event_task_member_update();

drop trigger if exists set_event_submissions_updated_at on public.event_submissions;
create trigger set_event_submissions_updated_at
before update on public.event_submissions
for each row
execute procedure public.set_updated_at();

drop trigger if exists set_receipt_jobs_updated_at on public.receipt_jobs;
create trigger set_receipt_jobs_updated_at
before update on public.receipt_jobs
for each row
execute procedure public.set_updated_at();

drop trigger if exists set_receipt_line_items_updated_at on public.receipt_line_items;
create trigger set_receipt_line_items_updated_at
before update on public.receipt_line_items
for each row
execute procedure public.set_updated_at();

drop trigger if exists set_line_claims_updated_at on public.line_claims;
create trigger set_line_claims_updated_at
before update on public.line_claims
for each row
execute procedure public.set_updated_at();

drop trigger if exists set_event_ledger_entries_updated_at on public.event_ledger_entries;
create trigger set_event_ledger_entries_updated_at
before update on public.event_ledger_entries
for each row
execute procedure public.set_updated_at();

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

alter table public.authorized_users enable row level security;
alter table public.profiles enable row level security;
alter table public.user_capabilities enable row level security;
alter table public.events enable row level security;
alter table public.event_people enable row level security;
alter table public.event_access_grants enable row level security;
alter table public.event_invites enable row level security;
alter table public.event_tasks enable row level security;
alter table public.event_task_assignees enable row level security;
alter table public.event_task_dependencies enable row level security;
alter table public.event_submissions enable row level security;
alter table public.receipt_jobs enable row level security;
alter table public.receipt_line_items enable row level security;
alter table public.line_claims enable row level security;
alter table public.event_ledger_entries enable row level security;

drop policy if exists authorized_users_select_self_or_admin on public.authorized_users;
create policy authorized_users_select_self_or_admin
on public.authorized_users
for select
to authenticated
using (email = public.current_user_email() or public.is_platform_admin());

drop policy if exists authorized_users_admin_manage on public.authorized_users;
create policy authorized_users_admin_manage
on public.authorized_users
for all
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

drop policy if exists profiles_select_self_or_admin on public.profiles;
create policy profiles_select_self_or_admin
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_platform_admin());

drop policy if exists profiles_update_self_or_admin on public.profiles;
create policy profiles_update_self_or_admin
on public.profiles
for update
to authenticated
using (id = auth.uid() or public.is_platform_admin())
with check (id = auth.uid() or public.is_platform_admin());

drop policy if exists user_capabilities_select_self_or_admin on public.user_capabilities;
create policy user_capabilities_select_self_or_admin
on public.user_capabilities
for select
to authenticated
using (user_id = auth.uid() or public.is_platform_admin());

drop policy if exists user_capabilities_admin_manage on public.user_capabilities;
create policy user_capabilities_admin_manage
on public.user_capabilities
for all
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

drop policy if exists events_select_access on public.events;
create policy events_select_access
on public.events
for select
to authenticated
using (public.event_has_access(id));

drop policy if exists events_insert_creator on public.events;
create policy events_insert_creator
on public.events
for insert
to authenticated
with check (
  public.is_approved_user()
  and public.user_can_create_events()
  and owner_user_id = auth.uid()
);

drop policy if exists events_update_managers on public.events;
create policy events_update_managers
on public.events
for update
to authenticated
using (public.event_is_owner(id) or public.event_can_manage_planning(id))
with check (public.event_is_owner(id) or public.event_can_manage_planning(id));

drop policy if exists events_delete_owner on public.events;
create policy events_delete_owner
on public.events
for delete
to authenticated
using (public.event_is_owner(id));

drop policy if exists event_people_select_access on public.event_people;
create policy event_people_select_access
on public.event_people
for select
to authenticated
using (public.event_has_access(event_id));

drop policy if exists event_people_insert_planning_manager on public.event_people;
create policy event_people_insert_planning_manager
on public.event_people
for insert
to authenticated
with check (public.event_can_manage_planning(event_id));

drop policy if exists event_people_update_self_or_manager on public.event_people;
create policy event_people_update_self_or_manager
on public.event_people
for update
to authenticated
using (public.event_can_manage_planning(event_id) or linked_user_id = auth.uid())
with check (public.event_can_manage_planning(event_id) or linked_user_id = auth.uid());

drop policy if exists event_people_delete_planning_manager on public.event_people;
create policy event_people_delete_planning_manager
on public.event_people
for delete
to authenticated
using (public.event_can_manage_planning(event_id));

drop policy if exists event_access_grants_select_self_or_manager on public.event_access_grants;
create policy event_access_grants_select_self_or_manager
on public.event_access_grants
for select
to authenticated
using (
  user_id = auth.uid()
  or public.event_can_manage_planning(event_id)
  or public.event_is_owner(event_id)
);

drop policy if exists event_access_grants_manage_planning on public.event_access_grants;
create policy event_access_grants_manage_planning
on public.event_access_grants
for all
to authenticated
using (public.event_can_manage_planning(event_id) or public.event_is_owner(event_id))
with check (public.event_can_manage_planning(event_id) or public.event_is_owner(event_id));

drop policy if exists event_invites_select_planning on public.event_invites;
create policy event_invites_select_planning
on public.event_invites
for select
to authenticated
using (public.event_can_manage_planning(event_id) or public.event_is_owner(event_id));

drop policy if exists event_invites_manage_planning on public.event_invites;
create policy event_invites_manage_planning
on public.event_invites
for all
to authenticated
using (public.event_can_manage_planning(event_id) or public.event_is_owner(event_id))
with check (public.event_can_manage_planning(event_id) or public.event_is_owner(event_id));

drop policy if exists event_tasks_select_project on public.event_tasks;
create policy event_tasks_select_project
on public.event_tasks
for select
to authenticated
using (public.event_can_view_project(event_id));

drop policy if exists event_tasks_insert_project_manager on public.event_tasks;
create policy event_tasks_insert_project_manager
on public.event_tasks
for insert
to authenticated
with check (public.event_can_manage_project(event_id));

drop policy if exists event_tasks_update_project_manager_or_helper on public.event_tasks;
create policy event_tasks_update_project_manager_or_helper
on public.event_tasks
for update
to authenticated
using (public.can_current_user_update_task(id))
with check (public.can_current_user_update_task(id));

drop policy if exists event_tasks_delete_project_manager on public.event_tasks;
create policy event_tasks_delete_project_manager
on public.event_tasks
for delete
to authenticated
using (public.event_can_manage_project(event_id));

drop policy if exists event_task_assignees_select_project on public.event_task_assignees;
create policy event_task_assignees_select_project
on public.event_task_assignees
for select
to authenticated
using (public.event_can_view_project(event_id));

drop policy if exists event_task_assignees_manage_project on public.event_task_assignees;
create policy event_task_assignees_manage_project
on public.event_task_assignees
for all
to authenticated
using (public.event_can_manage_project(event_id))
with check (public.event_can_manage_project(event_id));

drop policy if exists event_task_dependencies_select_project on public.event_task_dependencies;
create policy event_task_dependencies_select_project
on public.event_task_dependencies
for select
to authenticated
using (public.event_can_view_project(event_id));

drop policy if exists event_task_dependencies_manage_project on public.event_task_dependencies;
create policy event_task_dependencies_manage_project
on public.event_task_dependencies
for all
to authenticated
using (public.event_can_manage_project(event_id))
with check (public.event_can_manage_project(event_id));

drop policy if exists event_submissions_select_owner_or_approver on public.event_submissions;
create policy event_submissions_select_owner_or_approver
on public.event_submissions
for select
to authenticated
using (
  submitted_by_user_id = auth.uid()
  or public.event_can_view_approvals(event_id)
  or public.event_can_view_finance(event_id)
);

drop policy if exists event_submissions_insert_submitter on public.event_submissions;
create policy event_submissions_insert_submitter
on public.event_submissions
for insert
to authenticated
with check (
  public.event_has_access(event_id)
  and submitted_by_user_id = auth.uid()
  and (
    (kind = 'receipt_upload' and public.user_can_submit_receipts())
    or (kind = 'manual_invoice' and public.user_can_submit_manual_invoices())
    or (kind = 'advance_contribution' and public.event_can_view_finance(event_id))
  )
);

drop policy if exists event_submissions_update_submitter_or_manager on public.event_submissions;
create policy event_submissions_update_submitter_or_manager
on public.event_submissions
for update
to authenticated
using (
  submitted_by_user_id = auth.uid()
  or public.event_can_view_approvals(event_id)
)
with check (
  submitted_by_user_id = auth.uid()
  or public.event_can_view_approvals(event_id)
);

drop policy if exists receipt_jobs_select_finance on public.receipt_jobs;
create policy receipt_jobs_select_finance
on public.receipt_jobs
for select
to authenticated
using (
  public.is_platform_admin()
  or (event_id is not null and public.event_can_view_finance(event_id))
  or (event_id is null and created_by_user_id = auth.uid())
);

drop policy if exists receipt_jobs_insert_finance_or_submitter on public.receipt_jobs;
create policy receipt_jobs_insert_finance_or_submitter
on public.receipt_jobs
for insert
to authenticated
with check (
  created_by_user_id = auth.uid()
  and (
    public.is_platform_admin()
    or (
      event_id is not null
      and (
        public.event_can_manage_finance(event_id)
        or public.user_can_submit_receipts()
        or public.user_can_submit_manual_invoices()
      )
    )
    or (
      event_id is null
      and (
        public.user_can_submit_receipts()
        or public.user_can_submit_manual_invoices()
      )
    )
  )
);

drop policy if exists receipt_jobs_update_finance_or_creator on public.receipt_jobs;
create policy receipt_jobs_update_finance_or_creator
on public.receipt_jobs
for update
to authenticated
using (
  public.is_platform_admin()
  or (event_id is not null and public.event_can_manage_finance(event_id))
  or created_by_user_id = auth.uid()
)
with check (
  public.is_platform_admin()
  or (event_id is not null and public.event_can_manage_finance(event_id))
  or created_by_user_id = auth.uid()
);

drop policy if exists receipt_line_items_select_finance on public.receipt_line_items;
create policy receipt_line_items_select_finance
on public.receipt_line_items
for select
to authenticated
using (
  public.can_access_receipt_job(receipt_job_id)
);

drop policy if exists receipt_line_items_manage_finance on public.receipt_line_items;
create policy receipt_line_items_manage_finance
on public.receipt_line_items
for all
to authenticated
using (
  public.can_manage_receipt_job(receipt_job_id)
)
with check (
  public.can_manage_receipt_job(receipt_job_id)
);

drop policy if exists line_claims_select_finance on public.line_claims;
create policy line_claims_select_finance
on public.line_claims
for select
to authenticated
using (public.event_can_view_finance(event_id));

drop policy if exists line_claims_insert_self_or_manager on public.line_claims;
create policy line_claims_insert_self_or_manager
on public.line_claims
for insert
to authenticated
with check (public.event_can_self_claim_finance(event_id, event_person_id));

drop policy if exists line_claims_update_self_or_manager on public.line_claims;
create policy line_claims_update_self_or_manager
on public.line_claims
for update
to authenticated
using (public.event_can_self_claim_finance(event_id, event_person_id))
with check (public.event_can_self_claim_finance(event_id, event_person_id));

drop policy if exists line_claims_delete_self_or_manager on public.line_claims;
create policy line_claims_delete_self_or_manager
on public.line_claims
for delete
to authenticated
using (public.event_can_self_claim_finance(event_id, event_person_id));

drop policy if exists event_ledger_entries_select_finance on public.event_ledger_entries;
create policy event_ledger_entries_select_finance
on public.event_ledger_entries
for select
to authenticated
using (public.event_can_view_finance(event_id));

drop policy if exists event_ledger_entries_manage_finance on public.event_ledger_entries;
create policy event_ledger_entries_manage_finance
on public.event_ledger_entries
for all
to authenticated
using (public.event_can_manage_finance(event_id))
with check (public.event_can_manage_finance(event_id));

drop policy if exists receipt_images_select on storage.objects;
create policy receipt_images_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'receipt-images'
  and exists (
    select 1
    from public.receipt_jobs rj
    where rj.storage_bucket = bucket_id
      and rj.storage_object_path = name
      and public.can_access_receipt_job(rj.id)
  )
);

drop policy if exists receipt_images_delete on storage.objects;
create policy receipt_images_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'receipt-images'
  and exists (
    select 1
    from public.receipt_jobs rj
    where rj.storage_bucket = bucket_id
      and rj.storage_object_path = name
      and public.can_manage_receipt_job(rj.id)
  )
);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'receipt-images',
  'receipt-images',
  false,
  15728640,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'application/pdf'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

commit;
