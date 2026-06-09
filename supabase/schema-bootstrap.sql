begin;

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid,
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

alter table public.events
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
set
  title = coalesce(title, ''),
  description = coalesce(description, ''),
  location = coalesce(location, ''),
  dress_code = coalesce(dress_code, ''),
  practical_info = coalesce(practical_info, ''),
  workspace_state = coalesce(workspace_state, '{}'::jsonb),
  created_at = coalesce(created_at, timezone('utc', now())),
  updated_at = coalesce(updated_at, timezone('utc', now()));

alter table public.events
  alter column title set default '',
  alter column description set default '',
  alter column location set default '',
  alter column dress_code set default '',
  alter column practical_info set default '',
  alter column workspace_state set default '{}'::jsonb,
  alter column created_at set default timezone('utc', now()),
  alter column updated_at set default timezone('utc', now());

create table if not exists public.receipt_jobs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events (id) on delete set null,
  status text not null default 'queued',
  source_kind text not null default 'image_upload',
  original_filename text,
  stored_image_path text,
  storage_bucket text,
  storage_object_path text,
  sanitized_content_type text,
  input_sha256 text,
  merchant_name text,
  merchant_category text not null default 'unknown',
  receipt_date text,
  receipt_time text,
  currency text not null default 'NOK',
  subtotal numeric(12, 2),
  tax_total numeric(12, 2),
  grand_total numeric(12, 2),
  notes text[] not null default '{}',
  result jsonb,
  distribution_state jsonb,
  error_message text,
  paid_by_member_id text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  constraint receipt_jobs_status_check
    check (status in ('queued', 'processing', 'completed', 'failed', 'canceled')),
  constraint receipt_jobs_source_kind_check
    check (source_kind in ('image_upload', 'manual_invoice', 'imported'))
);

alter table public.receipt_jobs
  add column if not exists event_id uuid,
  add column if not exists status text,
  add column if not exists source_kind text,
  add column if not exists original_filename text,
  add column if not exists stored_image_path text,
  add column if not exists storage_bucket text,
  add column if not exists storage_object_path text,
  add column if not exists sanitized_content_type text,
  add column if not exists input_sha256 text,
  add column if not exists merchant_name text,
  add column if not exists merchant_category text,
  add column if not exists receipt_date text,
  add column if not exists receipt_time text,
  add column if not exists currency text,
  add column if not exists subtotal numeric(12, 2),
  add column if not exists tax_total numeric(12, 2),
  add column if not exists grand_total numeric(12, 2),
  add column if not exists notes text[],
  add column if not exists result jsonb,
  add column if not exists distribution_state jsonb,
  add column if not exists error_message text,
  add column if not exists paid_by_member_id text,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz,
  add column if not exists completed_at timestamptz;

update public.receipt_jobs
set
  status = coalesce(status, 'queued'),
  source_kind = coalesce(source_kind, 'image_upload'),
  merchant_category = coalesce(merchant_category, 'unknown'),
  currency = coalesce(currency, 'NOK'),
  notes = coalesce(notes, '{}'),
  created_at = coalesce(created_at, timezone('utc', now())),
  updated_at = coalesce(updated_at, timezone('utc', now()));

alter table public.receipt_jobs
  alter column status set default 'queued',
  alter column source_kind set default 'image_upload',
  alter column merchant_category set default 'unknown',
  alter column currency set default 'NOK',
  alter column notes set default '{}',
  alter column created_at set default timezone('utc', now()),
  alter column updated_at set default timezone('utc', now());

create index if not exists receipt_jobs_event_status_idx
  on public.receipt_jobs (event_id, status, created_at desc);

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at
before update on public.events
for each row
execute function public.set_updated_at();

drop trigger if exists receipt_jobs_set_updated_at on public.receipt_jobs;
create trigger receipt_jobs_set_updated_at
before update on public.receipt_jobs
for each row
execute function public.set_updated_at();

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
