-- AI Ops Automation V1 schema and V0 compatibility upgrade.
-- Run this manually in the Supabase SQL editor before using the application.
-- This migration is transactional, idempotent, and does not delete tables or records.

begin;

create extension if not exists pgcrypto;

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

-- Reconcile an existing V0 suppliers table with the V1 server types.
alter table public.suppliers add column if not exists id uuid default gen_random_uuid();
alter table public.suppliers add column if not exists name text;
alter table public.suppliers add column if not exists verified boolean default false;
alter table public.suppliers add column if not exists created_at timestamptz default now();

update public.suppliers
set
  id = coalesce(id, gen_random_uuid()),
  verified = coalesce(verified, false),
  created_at = coalesce(created_at, now());

-- Preserve duplicate V0 supplier rows while making their names safely unique.
with normalized_suppliers as (
  select
    id,
    case
      when name is null or btrim(name) = '' then 'Legacy supplier ' || id::text
      else btrim(name)
    end as normalized_name,
    created_at
  from public.suppliers
),
ranked_suppliers as (
  select
    id,
    normalized_name,
    row_number() over (
      partition by lower(normalized_name)
      order by created_at, id
    ) as duplicate_number
  from normalized_suppliers
)
update public.suppliers as supplier
set name = case
  when ranked_suppliers.duplicate_number = 1 then ranked_suppliers.normalized_name
  else ranked_suppliers.normalized_name || ' (legacy ' || supplier.id::text || ')'
end
from ranked_suppliers
where supplier.id = ranked_suppliers.id;

alter table public.suppliers alter column id set default gen_random_uuid();
alter table public.suppliers alter column id set not null;
alter table public.suppliers alter column name set not null;
alter table public.suppliers alter column verified set default false;
alter table public.suppliers alter column verified set not null;
alter table public.suppliers alter column created_at set default now();
alter table public.suppliers alter column created_at set not null;

do $migration$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.suppliers'::regclass
      and contype = 'p'
  ) then
    alter table public.suppliers
      add constraint suppliers_pkey primary key (id);
  end if;
end;
$migration$;

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

-- Add every V1 column before upgrading values and constraints on an existing V0 table.
alter table public.workflows add column if not exists id uuid default gen_random_uuid();
alter table public.workflows add column if not exists source_type text;
alter table public.workflows add column if not exists original_filename text;
alter table public.workflows add column if not exists raw_text text;
alter table public.workflows add column if not exists document_type text;
alter table public.workflows add column if not exists classification_confidence double precision;
alter table public.workflows add column if not exists extracted_data jsonb default '{}'::jsonb;
alter table public.workflows add column if not exists decision text;
alter table public.workflows add column if not exists status text default 'processing';
alter table public.workflows add column if not exists generated_response text;
alter table public.workflows add column if not exists supplier_id uuid;
alter table public.workflows add column if not exists invoice_number text;
alter table public.workflows add column if not exists amount numeric(15, 2);
alter table public.workflows add column if not exists currency text;
alter table public.workflows add column if not exists created_at timestamptz default now();
alter table public.workflows add column if not exists updated_at timestamptz default now();

-- Type changes can be blocked by V0 checks or a previously-created decision index.
drop index if exists public.workflows_decision_idx;

do $migration$
declare
  existing_constraint record;
  decision_type text;
  status_type text;
  extracted_data_type text;
begin
  for existing_constraint in
    select distinct constraint_row.conname
    from pg_constraint as constraint_row
    join pg_attribute as column_row
      on column_row.attrelid = constraint_row.conrelid
      and column_row.attnum = any (constraint_row.conkey)
    where constraint_row.conrelid = 'public.workflows'::regclass
      and constraint_row.contype = 'c'
      and column_row.attname in ('decision', 'status')
  loop
    execute format(
      'alter table public.workflows drop constraint %I',
      existing_constraint.conname
    );
  end loop;

  select attribute_row.atttypid::regtype::text
  into decision_type
  from pg_attribute as attribute_row
  where attribute_row.attrelid = 'public.workflows'::regclass
    and attribute_row.attname = 'decision'
    and not attribute_row.attisdropped;

  alter table public.workflows alter column decision drop default;

  if decision_type in ('json', 'jsonb') then
    execute $conversion$
      alter table public.workflows
      alter column decision type text
      using (
        case
          when decision is null then null
          when jsonb_typeof(decision::jsonb) = 'object'
            and lower(btrim(coalesce(decision::jsonb ->> 'action', '')))
              in ('auto_process', 'human_review', 'blocked')
            then lower(btrim(decision::jsonb ->> 'action'))
          when jsonb_typeof(decision::jsonb) = 'string'
            and lower(btrim(decision::jsonb #>> '{}'))
              in ('auto_process', 'human_review', 'blocked')
            then lower(btrim(decision::jsonb #>> '{}'))
          else null
        end
      )
    $conversion$;
  elsif decision_type <> 'text' then
    execute
      'alter table public.workflows alter column decision type text using decision::text';
  end if;

  select attribute_row.atttypid::regtype::text
  into status_type
  from pg_attribute as attribute_row
  where attribute_row.attrelid = 'public.workflows'::regclass
    and attribute_row.attname = 'status'
    and not attribute_row.attisdropped;

  alter table public.workflows alter column status drop default;

  if status_type <> 'text' then
    execute
      'alter table public.workflows alter column status type text using status::text';
  end if;

  select attribute_row.atttypid::regtype::text
  into extracted_data_type
  from pg_attribute as attribute_row
  where attribute_row.attrelid = 'public.workflows'::regclass
    and attribute_row.attname = 'extracted_data'
    and not attribute_row.attisdropped;

  if extracted_data_type = 'json' then
    alter table public.workflows alter column extracted_data drop default;
    execute
      'alter table public.workflows alter column extracted_data type jsonb using extracted_data::jsonb';
  end if;
end;
$migration$;

-- Normalize V0 values before applying the V1 constraints.
update public.workflows
set decision = case lower(btrim(decision))
  when 'auto_process' then 'auto_process'
  when 'human_review' then 'human_review'
  when 'blocked' then 'blocked'
  else null
end
where decision is not null;

update public.workflows
set status = case
  when lower(btrim(coalesce(status, ''))) in ('processing', 'completed', 'failed')
    then lower(btrim(status))
  when lower(btrim(coalesce(status, ''))) = 'received'
    then case when decision is null then 'processing' else 'completed' end
  when lower(btrim(coalesce(status, ''))) in ('complete', 'processed', 'done')
    then 'completed'
  when lower(btrim(coalesce(status, ''))) in ('error', 'errored', 'failure')
    then 'failed'
  when decision is not null
    then 'completed'
  else 'processing'
end;

update public.workflows
set
  id = coalesce(id, gen_random_uuid()),
  source_type = case
    when lower(btrim(coalesce(source_type, ''))) in ('pdf', 'email')
      then lower(btrim(source_type))
    when lower(coalesce(original_filename, '')) like '%.pdf'
      then 'pdf'
    else 'email'
  end,
  raw_text = coalesce(raw_text, ''),
  document_type = case
    when lower(btrim(coalesce(document_type, '')))
      in ('invoice', 'purchase_order', 'customer_request', 'other')
      then lower(btrim(document_type))
    when document_type is null or btrim(document_type) = ''
      then null
    else 'other'
  end,
  classification_confidence = case
    when classification_confidence between 0 and 1 then classification_confidence
    else null
  end,
  extracted_data = coalesce(extracted_data, '{}'::jsonb),
  amount = case when amount >= 0 then amount else null end,
  currency = case
    when upper(btrim(coalesce(currency, ''))) ~ '^[A-Z]{3}$'
      then upper(btrim(currency))
    else null
  end,
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, created_at, now());

-- V0 supplier references that no longer resolve follow the V1 ON DELETE SET NULL rule.
update public.workflows as workflow
set supplier_id = null
where supplier_id is not null
  and not exists (
    select 1
    from public.suppliers as supplier
    where supplier.id = workflow.supplier_id
  );

alter table public.workflows alter column id set default gen_random_uuid();
alter table public.workflows alter column id set not null;
alter table public.workflows alter column source_type set not null;
alter table public.workflows alter column raw_text set not null;
alter table public.workflows alter column extracted_data set default '{}'::jsonb;
alter table public.workflows alter column extracted_data set not null;
alter table public.workflows alter column status set default 'processing';
alter table public.workflows alter column status set not null;
alter table public.workflows alter column created_at set default now();
alter table public.workflows alter column created_at set not null;
alter table public.workflows alter column updated_at set default now();
alter table public.workflows alter column updated_at set not null;

alter table public.workflows drop constraint if exists workflows_source_type_check;
alter table public.workflows drop constraint if exists workflows_source_type_values;
alter table public.workflows drop constraint if exists workflows_document_type_values;
alter table public.workflows drop constraint if exists workflows_confidence_range;
alter table public.workflows drop constraint if exists workflows_decision_values;
alter table public.workflows drop constraint if exists workflows_status_values;
alter table public.workflows drop constraint if exists workflows_amount_nonnegative;
alter table public.workflows drop constraint if exists workflows_currency_format;

alter table public.workflows
  add constraint workflows_source_type_values
    check (source_type in ('pdf', 'email')),
  add constraint workflows_document_type_values
    check (
      document_type is null
      or document_type in ('invoice', 'purchase_order', 'customer_request', 'other')
    ),
  add constraint workflows_confidence_range
    check (
      classification_confidence is null
      or classification_confidence between 0 and 1
    ),
  add constraint workflows_decision_values
    check (decision is null or decision in ('auto_process', 'human_review', 'blocked')),
  add constraint workflows_status_values
    check (status in ('processing', 'completed', 'failed')),
  add constraint workflows_amount_nonnegative
    check (amount is null or amount >= 0),
  add constraint workflows_currency_format
    check (currency is null or currency ~ '^[A-Z]{3}$');

do $migration$
declare
  existing_constraint record;
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.workflows'::regclass
      and contype = 'p'
  ) then
    alter table public.workflows
      add constraint workflows_pkey primary key (id);
  end if;

  for existing_constraint in
    select distinct constraint_row.conname
    from pg_constraint as constraint_row
    join pg_attribute as column_row
      on column_row.attrelid = constraint_row.conrelid
      and column_row.attnum = any (constraint_row.conkey)
    where constraint_row.conrelid = 'public.workflows'::regclass
      and constraint_row.contype = 'f'
      and column_row.attname = 'supplier_id'
  loop
    execute format(
      'alter table public.workflows drop constraint %I',
      existing_constraint.conname
    );
  end loop;

  alter table public.workflows
    add constraint workflows_supplier_id_fkey
    foreign key (supplier_id)
    references public.suppliers(id)
    on delete set null;
end;
$migration$;

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

-- Reconcile an existing V0 audit table without reconstructing or deleting events.
alter table public.workflow_events add column if not exists id uuid default gen_random_uuid();
alter table public.workflow_events add column if not exists workflow_id uuid;
alter table public.workflow_events add column if not exists event_type text;
alter table public.workflow_events add column if not exists payload jsonb default '{}'::jsonb;
alter table public.workflow_events add column if not exists created_at timestamptz default now();

do $migration$
declare
  payload_type text;
begin
  select attribute_row.atttypid::regtype::text
  into payload_type
  from pg_attribute as attribute_row
  where attribute_row.attrelid = 'public.workflow_events'::regclass
    and attribute_row.attname = 'payload'
    and not attribute_row.attisdropped;

  if payload_type = 'json' then
    alter table public.workflow_events alter column payload drop default;
    execute
      'alter table public.workflow_events alter column payload type jsonb using payload::jsonb';
  end if;
end;
$migration$;

update public.workflow_events
set
  id = coalesce(id, gen_random_uuid()),
  event_type = case
    when event_type is null or btrim(event_type) = '' then 'legacy_event'
    else btrim(event_type)
  end,
  payload = coalesce(payload, '{}'::jsonb),
  created_at = coalesce(created_at, now());

do $migration$
begin
  if exists (
    select 1
    from public.workflow_events as event
    where event.workflow_id is null
      or not exists (
        select 1
        from public.workflows as workflow
        where workflow.id = event.workflow_id
      )
  ) then
    raise exception
      'workflow_events contains an event without a valid workflow_id; repair that V0 reference before rerunning the migration';
  end if;
end;
$migration$;

alter table public.workflow_events alter column id set default gen_random_uuid();
alter table public.workflow_events alter column id set not null;
alter table public.workflow_events alter column workflow_id set not null;
alter table public.workflow_events alter column event_type set not null;
alter table public.workflow_events alter column payload set default '{}'::jsonb;
alter table public.workflow_events alter column payload set not null;
alter table public.workflow_events alter column created_at set default now();
alter table public.workflow_events alter column created_at set not null;

do $migration$
declare
  existing_constraint record;
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.workflow_events'::regclass
      and contype = 'p'
  ) then
    alter table public.workflow_events
      add constraint workflow_events_pkey primary key (id);
  end if;

  for existing_constraint in
    select distinct constraint_row.conname
    from pg_constraint as constraint_row
    join pg_attribute as column_row
      on column_row.attrelid = constraint_row.conrelid
      and column_row.attnum = any (constraint_row.conkey)
    where constraint_row.conrelid = 'public.workflow_events'::regclass
      and constraint_row.contype = 'f'
      and column_row.attname = 'workflow_id'
  loop
    execute format(
      'alter table public.workflow_events drop constraint %I',
      existing_constraint.conname
    );
  end loop;

  alter table public.workflow_events
    add constraint workflow_events_workflow_id_fkey
    foreign key (workflow_id)
    references public.workflows(id)
    on delete cascade;
end;
$migration$;

create index if not exists workflow_events_workflow_created_idx
  on public.workflow_events (workflow_id, created_at asc);

-- V1 has no browser-side database access. The server secret key bypasses RLS.
alter table public.suppliers enable row level security;
alter table public.workflows enable row level security;
alter table public.workflow_events enable row level security;

comment on table public.workflows is 'AI Ops Automation processing records';
comment on table public.workflow_events is 'Persisted audit trail for workflow processing';
comment on table public.suppliers is 'Supplier verification register';

commit;
