-- AI Ops Automation V1 schema.
-- Run this manually in the Supabase SQL editor before using the application.
-- The migration only creates missing objects and columns; it does not remove data.

create extension if not exists pgcrypto;

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists suppliers_name_lower_unique
  on public.suppliers (lower(name));

create table if not exists public.workflows (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('pdf', 'email')),
  original_filename text,
  raw_text text not null,
  document_type text,
  classification_confidence double precision,
  extracted_data jsonb not null default '{}'::jsonb,
  decision text,
  status text not null default 'processing',
  generated_response text,
  supplier_id uuid references public.suppliers(id) on delete set null,
  invoice_number text,
  amount numeric(15, 2),
  currency text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workflows_confidence_range
    check (classification_confidence is null or classification_confidence between 0 and 1),
  constraint workflows_decision_values
    check (decision is null or decision in ('auto_process', 'human_review', 'blocked')),
  constraint workflows_status_values
    check (status in ('processing', 'completed', 'failed')),
  constraint workflows_amount_nonnegative
    check (amount is null or amount >= 0),
  constraint workflows_currency_format
    check (currency is null or currency ~ '^[A-Z]{3}$')
);

-- Support an existing minimal workflows table without dropping or renaming anything.
alter table public.workflows add column if not exists source_type text;
alter table public.workflows add column if not exists original_filename text;
alter table public.workflows add column if not exists raw_text text;
alter table public.workflows add column if not exists document_type text;
alter table public.workflows add column if not exists classification_confidence double precision;
alter table public.workflows add column if not exists extracted_data jsonb default '{}'::jsonb;
alter table public.workflows add column if not exists decision text;
alter table public.workflows add column if not exists status text default 'processing';
alter table public.workflows add column if not exists generated_response text;
alter table public.workflows add column if not exists supplier_id uuid references public.suppliers(id) on delete set null;
alter table public.workflows add column if not exists invoice_number text;
alter table public.workflows add column if not exists amount numeric(15, 2);
alter table public.workflows add column if not exists currency text;
alter table public.workflows add column if not exists created_at timestamptz default now();
alter table public.workflows add column if not exists updated_at timestamptz default now();

create index if not exists workflows_created_at_idx
  on public.workflows (created_at desc);
create index if not exists workflows_decision_idx
  on public.workflows (decision);
create index if not exists workflows_document_type_idx
  on public.workflows (document_type);
create index if not exists workflows_supplier_id_idx
  on public.workflows (supplier_id);
create index if not exists workflows_invoice_number_idx
  on public.workflows (invoice_number);

create table if not exists public.workflow_events (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflows(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists workflow_events_workflow_created_idx
  on public.workflow_events (workflow_id, created_at asc);

-- V1 has no browser-side database access. The server secret key bypasses RLS.
alter table public.suppliers enable row level security;
alter table public.workflows enable row level security;
alter table public.workflow_events enable row level security;

comment on table public.workflows is 'AI Ops Automation processing records';
comment on table public.workflow_events is 'Persisted audit trail for workflow processing';
comment on table public.suppliers is 'Supplier verification register';
