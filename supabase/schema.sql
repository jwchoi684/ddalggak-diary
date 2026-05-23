-- 딸깍일기 — Supabase schema (Option C deployment)
-- Run this in the Supabase SQL editor for a new project.
--
-- What this creates:
--   profiles      — one row per auth user (mirror of auth.users for app data)
--   diaries       — one row per diary entry; one entry per (user_id, date)
--   photos        — one row per attached photo (image bytes live in storage bucket diary-photos)
--   conversations — one row per AI chat session (messages stored as JSONB)
--   settings      — one row per user holding the JSON settings blob
--
-- Security:
--   RLS enabled on every table.
--   Every policy filters on `auth.uid() = user_id`, so a logged-in user can only
--   see/insert/update/delete their own rows. No service-role key is used by the app.
--
-- Storage:
--   Bucket `diary-photos` is created and policy-protected so users can only
--   read/write objects under their own `${user_id}/...` path prefix.
--
-- Safe to re-run: every create uses IF NOT EXISTS or DROP/CREATE for policies.

-- ─── Helper: keep updated_at fresh ───────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─── profiles ────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles self select" on public.profiles;
create policy "profiles self select" on public.profiles
  for select using (auth.uid() = user_id);

drop policy if exists "profiles self upsert" on public.profiles;
create policy "profiles self upsert" on public.profiles
  for insert with check (auth.uid() = user_id);

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles
  for update using (auth.uid() = user_id);

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── diaries ────────────────────────────────────────────────────────────────
create table if not exists public.diaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,                              -- "YYYY-MM-DD"
  mood text not null,                              -- MoodId | ActivityId (string union)
  text text not null default '',
  text_align text not null default 'left' check (text_align in ('left', 'center')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)                           -- enforces 1-per-day rule
);

create index if not exists diaries_user_date_idx on public.diaries (user_id, date desc);

alter table public.diaries enable row level security;

drop policy if exists "diaries self select" on public.diaries;
create policy "diaries self select" on public.diaries
  for select using (auth.uid() = user_id);

drop policy if exists "diaries self insert" on public.diaries;
create policy "diaries self insert" on public.diaries
  for insert with check (auth.uid() = user_id);

drop policy if exists "diaries self update" on public.diaries;
create policy "diaries self update" on public.diaries
  for update using (auth.uid() = user_id);

drop policy if exists "diaries self delete" on public.diaries;
create policy "diaries self delete" on public.diaries
  for delete using (auth.uid() = user_id);

drop trigger if exists diaries_touch_updated_at on public.diaries;
create trigger diaries_touch_updated_at
  before update on public.diaries
  for each row execute function public.touch_updated_at();

-- ─── photos ─────────────────────────────────────────────────────────────────
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  diary_id uuid not null references public.diaries(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,                      -- ${user_id}/${diary_id}/${uuid}.jpg
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  added_at timestamptz not null default now()
);

create index if not exists photos_diary_idx on public.photos (diary_id, added_at);

alter table public.photos enable row level security;

drop policy if exists "photos self select" on public.photos;
create policy "photos self select" on public.photos
  for select using (auth.uid() = user_id);

drop policy if exists "photos self insert" on public.photos;
create policy "photos self insert" on public.photos
  for insert with check (auth.uid() = user_id);

drop policy if exists "photos self delete" on public.photos;
create policy "photos self delete" on public.photos
  for delete using (auth.uid() = user_id);

-- ─── conversations ─────────────────────────────────────────────────────────
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  persona_id text not null,
  title text not null default '새 대화',
  messages jsonb not null default '[]'::jsonb,    -- ChatMessage[]
  started_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  is_closed boolean not null default false
);

create index if not exists conversations_user_last_idx
  on public.conversations (user_id, last_message_at desc);

alter table public.conversations enable row level security;

drop policy if exists "conversations self select" on public.conversations;
create policy "conversations self select" on public.conversations
  for select using (auth.uid() = user_id);

drop policy if exists "conversations self insert" on public.conversations;
create policy "conversations self insert" on public.conversations
  for insert with check (auth.uid() = user_id);

drop policy if exists "conversations self update" on public.conversations;
create policy "conversations self update" on public.conversations
  for update using (auth.uid() = user_id);

drop policy if exists "conversations self delete" on public.conversations;
create policy "conversations self delete" on public.conversations
  for delete using (auth.uid() = user_id);

-- ─── settings ──────────────────────────────────────────────────────────────
-- One row per user holding the JSON settings blob (userName, etc.)
create table if not exists public.settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.settings enable row level security;

drop policy if exists "settings self select" on public.settings;
create policy "settings self select" on public.settings
  for select using (auth.uid() = user_id);

drop policy if exists "settings self upsert" on public.settings;
create policy "settings self upsert" on public.settings
  for insert with check (auth.uid() = user_id);

drop policy if exists "settings self update" on public.settings;
create policy "settings self update" on public.settings
  for update using (auth.uid() = user_id);

drop trigger if exists settings_touch_updated_at on public.settings;
create trigger settings_touch_updated_at
  before update on public.settings
  for each row execute function public.touch_updated_at();

-- ─── Storage bucket: diary-photos ──────────────────────────────────────────
-- Create the bucket (private). Run once; safe to re-run.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'diary-photos',
  'diary-photos',
  false,
  5 * 1024 * 1024,                                -- 5 MB per file
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage policies — users can only read/write objects under their own user_id/* prefix.
drop policy if exists "diary-photos self select" on storage.objects;
create policy "diary-photos self select" on storage.objects
  for select to authenticated using (
    bucket_id = 'diary-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "diary-photos self insert" on storage.objects;
create policy "diary-photos self insert" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'diary-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "diary-photos self delete" on storage.objects;
create policy "diary-photos self delete" on storage.objects
  for delete to authenticated using (
    bucket_id = 'diary-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
