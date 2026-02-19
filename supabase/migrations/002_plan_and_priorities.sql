-- WSOP Planner 2026 — Plan & Priorities + preferences columns

-- plan_entries
create table plan_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  tournament_id integer not null,
  added_manually boolean default true,
  score real,
  created_at timestamptz default now(),
  unique(user_id, tournament_id)
);

alter table plan_entries enable row level security;
create policy "Users manage own plan_entries" on plan_entries for all using (user_id = auth.uid());

-- priorities
create table priorities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  tournament_id integer not null,
  created_at timestamptz default now(),
  unique(user_id, tournament_id)
);

alter table priorities enable row level security;
create policy "Users manage own priorities" on priorities for all using (user_id = auth.uid());

-- Add missing columns to preferences
alter table preferences
  add column if not exists min_single_buyin integer,
  add column if not exists date_start date,
  add column if not exists date_end date;
