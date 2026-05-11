create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  client_name text not null,
  client_email text not null,
  title text not null,
  price integer not null check (price > 0),
  status text not null default 'unpaid' check (status in ('unpaid', 'paid')),
  preview_url text not null,
  file_url text not null,
  download_limit integer not null default 3 check (download_limit > 0 and download_limit <= 3),
  downloads_used integer not null default 0 check (downloads_used >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  amount integer not null check (amount > 0),
  paystack_ref text not null unique,
  status text not null,
  created_at timestamptz not null default now()
);

create index if not exists projects_created_at_idx on public.projects (created_at desc);
create index if not exists payments_project_id_idx on public.payments (project_id);

alter table public.projects enable row level security;
alter table public.payments enable row level security;
