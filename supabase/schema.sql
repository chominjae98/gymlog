-- ============================================================
-- FitLog(가칭) 스키마
-- Supabase SQL Editor에서 그대로 실행하세요.
-- ============================================================

-- 확장
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- 1. profiles : 카카오 로그인한 사용자 프로필
--    auth.users 와 1:1, 트리거로 자동 생성됨
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null default '친구',
  avatar_url text,
  kakao_id text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles are viewable by every logged in friend"
  on public.profiles for select
  to authenticated
  using (true);

create policy "user can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

create policy "user can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- 신규 유저 가입 시 profiles row 자동 생성
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nickname, avatar_url, kakao_id)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1),
      '친구'
    ),
    new.raw_user_meta_data ->> 'avatar_url',
    new.raw_user_meta_data ->> 'provider_id'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ------------------------------------------------------------
-- 2. weekly_goals : 주간 운동 목표 (해당 주 월요일 날짜 기준)
-- ------------------------------------------------------------
create table if not exists public.weekly_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  week_start date not null, -- 그 주의 월요일
  target_days smallint not null check (target_days between 1 and 7),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start)
);

alter table public.weekly_goals enable row level security;

create policy "weekly goals are viewable by every logged in friend"
  on public.weekly_goals for select
  to authenticated
  using (true);

create policy "user can upsert own weekly goal"
  on public.weekly_goals for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "user can update own weekly goal"
  on public.weekly_goals for update
  to authenticated
  using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 3. workout_logs : 하루 운동 인증 (사진 + 메모)
-- ------------------------------------------------------------
create table if not exists public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  log_date date not null default (now() at time zone 'Asia/Seoul')::date,
  photo_url text not null,
  memo text,
  created_at timestamptz not null default now()
);

create index if not exists workout_logs_log_date_idx on public.workout_logs (log_date);
create index if not exists workout_logs_user_idx on public.workout_logs (user_id);

alter table public.workout_logs enable row level security;

create policy "workout logs are viewable by every logged in friend"
  on public.workout_logs for select
  to authenticated
  using (true);

create policy "user can insert own workout log"
  on public.workout_logs for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "user can delete own workout log"
  on public.workout_logs for delete
  to authenticated
  using (auth.uid() = user_id);

create policy "user can update own workout log"
  on public.workout_logs for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 4. app_settings : 벌금 단가 등 전역 설정 (한 행만 사용)
-- ------------------------------------------------------------
create table if not exists public.app_settings (
  id smallint primary key default 1,
  fine_per_day integer not null default 5000,
  constraint single_row check (id = 1)
);

insert into public.app_settings (id, fine_per_day)
values (1, 5000)
on conflict (id) do nothing;

alter table public.app_settings enable row level security;

create policy "settings are viewable by every logged in friend"
  on public.app_settings for select
  to authenticated
  using (true);

-- ------------------------------------------------------------
-- 5. Storage : 운동 인증 사진 버킷
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('workout-photos', 'workout-photos', true)
on conflict (id) do nothing;

create policy "anyone logged in can view workout photos"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'workout-photos');

create policy "user can upload own workout photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'workout-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "user can delete own workout photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'workout-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
