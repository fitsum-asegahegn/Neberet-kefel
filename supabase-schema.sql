-- supabase-schema.sql
-- Run once in Supabase SQL Editor. Creates every table the app syncs to,
-- plus role-based access control and a profiles table for display names.
-- Safe to re-run: every statement is IF NOT EXISTS / CREATE OR REPLACE.

-- ========== data tables ==========
create table if not exists assets (
  id text primary key,
  code text, name text, category text, source text,
  "dateReceived" text, status text, location text, "letterRef" text, notes text,
  "updatedAt" text, synced boolean default true, owner uuid references auth.users
);

create table if not exists income (
  id text primary key,
  date text, source text, amount numeric, deposited boolean,
  "depositDate" text, "receiptTo" text, "recordedBy" text, notes text,
  "updatedAt" text, synced boolean default true, owner uuid references auth.users
);

create table if not exists expenses (
  id text primary key,
  date text, purpose text, amount numeric, "authorizedBy" text,
  "signatureConfirmed" boolean, reconciled boolean, "recordedBy" text, notes text,
  "updatedAt" text, synced boolean default true, owner uuid references auth.users
);

create table if not exists repairs (
  id text primary key,
  "itemName" text, description text, "dateReported" text, assignee text,
  volunteer boolean, cost numeric, status text, "resolvedDate" text,
  "updatedAt" text, synced boolean default true, owner uuid references auth.users
);

create table if not exists contributions (
  id text primary key,
  period text, "leaderName" text, expected numeric, paid numeric,
  "datePaid" text, "collectedBy" text,
  "updatedAt" text, synced boolean default true, owner uuid references auth.users
);

create table if not exists plan_items (
  id text primary key,
  no integer, "subUnit" text, title text, details text, outcome text,
  indicator text, target text, timing text, executor text, budget text, weight text,
  category text, history jsonb default '[]'::jsonb,
  "nextDateEC" jsonb, "nextDateGC" text,
  "updatedAt" text, synced boolean default true, owner uuid references auth.users
);

-- ========== roles ==========
create table if not exists user_roles (
  user_id uuid primary key references auth.users on delete cascade,
  role text not null default 'member' check (role in ('member', 'admin'))
);

-- ========== profiles (display name only — deliberately separate from
-- user_roles so editing your own display name can never touch your role) ==========
create table if not exists profiles (
  user_id uuid primary key references auth.users on delete cascade,
  display_name text
);

-- Auto-create a member role + a default display name on every sign-up.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_roles (user_id, role) values (new.id, 'member')
    on conflict (user_id) do nothing;
  insert into public.profiles (user_id, display_name)
    values (new.id, split_part(new.email, '@', 1))
    on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ========== RLS ==========
alter table assets enable row level security;
alter table income enable row level security;
alter table expenses enable row level security;
alter table repairs enable row level security;
alter table contributions enable row level security;
alter table plan_items enable row level security;
alter table user_roles enable row level security;
alter table profiles enable row level security;

-- Any signed-in user can read/write the shared data tables; only admins delete.
do $$
declare t text;
begin
  foreach t in array array['assets','income','expenses','repairs','contributions','plan_items']
  loop
    execute format('drop policy if exists "read_%1$s" on %1$s', t);
    execute format('create policy "read_%1$s" on %1$s for select using (auth.role() = ''authenticated'')', t);
    execute format('drop policy if exists "write_%1$s" on %1$s', t);
    execute format('create policy "write_%1$s" on %1$s for insert with check (auth.role() = ''authenticated'')', t);
    execute format('drop policy if exists "update_%1$s" on %1$s', t);
    execute format('create policy "update_%1$s" on %1$s for update using (auth.role() = ''authenticated'')', t);
    execute format('drop policy if exists "delete_%1$s" on %1$s', t);
    execute format(
      'create policy "delete_%1$s" on %1$s for delete using (exists (select 1 from user_roles where user_id = auth.uid() and role = ''admin''))',
      t
    );
  end loop;
end $$;

-- user_roles: everyone can read roles (needed to check admin status client-side);
-- nobody can self-edit their own role from the client.
drop policy if exists "read_roles" on user_roles;
create policy "read_roles" on user_roles for select using (auth.role() = 'authenticated');

-- profiles: read all (for "called by" style display), edit only your own row.
drop policy if exists "read_profiles" on profiles;
create policy "read_profiles" on profiles for select using (auth.role() = 'authenticated');
drop policy if exists "upsert_own_profile" on profiles;
create policy "upsert_own_profile" on profiles for insert with check (auth.uid() = user_id);
drop policy if exists "update_own_profile" on profiles;
create policy "update_own_profile" on profiles for update using (auth.uid() = user_id);

-- Promote someone to admin from the SQL editor:
--   update user_roles set role = 'admin' where user_id = '...';
