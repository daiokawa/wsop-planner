-- WSOP Planner 2026 — Initial schema

-- profiles
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz default now()
);

alter table profiles enable row level security;
create policy "Users can view own profile" on profiles for select using (id = auth.uid());
create policy "Users can update own profile" on profiles for update using (id = auth.uid());

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.email));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- preferences
create table preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  total_budget integer,
  max_single_buyin integer,
  policy_slider integer default 50,
  reentry_limit integer default 1,
  game_types text[],
  updated_at timestamptz default now(),
  unique(user_id)
);

alter table preferences enable row level security;
create policy "Users manage own preferences" on preferences for all using (user_id = auth.uid());

-- buy_ins
create table buy_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  tournament_id integer not null,
  amount integer not null,
  is_reentry boolean default false,
  created_at timestamptz default now()
);

alter table buy_ins enable row level security;
create policy "Users manage own buy_ins" on buy_ins for all using (user_id = auth.uid());

-- prizes
create table prizes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  tournament_id integer not null,
  amount integer not null,
  finish_position integer,
  created_at timestamptz default now()
);

alter table prizes enable row level security;
create policy "Users manage own prizes" on prizes for all using (user_id = auth.uid());

-- api_keys (B2B)
create table api_keys (
  id uuid primary key default gen_random_uuid(),
  key_hash text unique not null,
  owner_name text,
  created_at timestamptz default now(),
  is_active boolean default true
);
