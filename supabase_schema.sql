-- ==========================================
-- SUPABASE DATABASE SETUP SCHEMA
-- Copy and run this inside the "SQL Editor" of your Supabase Dashboard
-- ==========================================

-- 1. Create Profiles Table (Stores user information)
create table if not exists public.profiles (
  id text primary key, -- Supports both Supabase UUIDs and special bot IDs (e.g. 'ai-zara')
  username text unique not null,
  name text not null,
  avatar_seed text not null default 'neon',
  status text not null default 'offline',
  bio text,
  is_ai boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS) on Profiles
alter table public.profiles enable row level security;

-- Create Policies for Profiles
create policy "Allow public read access to profiles" 
  on public.profiles for select 
  using (true);

create policy "Allow users to update their own profile" 
  on public.profiles for update 
  using (auth.uid()::text = id);

create policy "Allow users to insert their own profile" 
  on public.profiles for insert 
  with check (auth.uid()::text = id);


-- 2. Create Messages Table (Stores chat/messages)
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  sender_id text not null,
  recipient_id text not null,
  text text not null,
  timestamp bigint not null default (extract(epoch from now()) * 1000)::bigint, -- Millisecond epoch timestamp
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS) on Messages
alter table public.messages enable row level security;

-- Create Policies for Messages
create policy "Allow all users to read messages they are involved in" 
  on public.messages for select 
  using (
    sender_id = 'all' or 
    recipient_id = 'all' or 
    auth.uid()::text = sender_id or 
    auth.uid()::text = recipient_id
  );

create policy "Allow users to insert messages they sent" 
  on public.messages for insert 
  with check (auth.uid()::text = sender_id);


-- 3. Trigger for Automatic Profile Creation on Signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, name, avatar_seed, bio, status, is_ai)
  values (
    new.id::text,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_seed', 'neon'),
    coalesce(new.raw_user_meta_data->>'bio', 'Explorer of the glowing grid.'),
    'online',
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists and recreate
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 4. Seed Futuristic AI bots into Profiles (So they appear in user list out of the box)
insert into public.profiles (id, username, name, avatar_seed, bio, status, is_ai)
values 
  (
    'ai-zara', 
    'zara', 
    'Zara (Quantum AI)', 
    'zara-neon', 
    'Neural network hologram specializing in deep space frequency synthesis.', 
    'online', 
    true
  ),
  (
    'ai-kael', 
    'kaelen', 
    'Kaelen (Core Architect)', 
    'kael-glow', 
    'Lead system designer of Luminal Space. Ping me for latency checks.', 
    'online', 
    true
  ),
  (
    'ai-neo', 
    'neo', 
    'Neo (Cyber Security)', 
    'neo-cyber', 
    'Encrypted communication advisor. Keeping the mesh net secure.', 
    'online', 
    true
  )
on conflict (id) do update set 
  status = 'online',
  is_ai = true;


-- 5. Enable Supabase Realtime for messages and profiles
-- This allows instant messaging and status/presence updates
begin;
  -- drop publication if exists "supabase_realtime"; -- uncomment if resetting
  alter publication supabase_realtime add table public.messages;
  alter publication supabase_realtime add table public.profiles;
commit;
