-- ============================================================
-- FitLog(가칭) 스키마
-- Supabase SQL Editor에서 그대로 실행하세요.
-- 이 파일은 몇 번을 다시 실행해도 안전하도록(idempotent) 작성되어 있습니다.
-- (테이블/인덱스는 if not exists, 정책은 drop 후 재생성)
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

drop policy if exists "profiles are viewable by every logged in friend" on public.profiles;
create policy "profiles are viewable by every logged in friend"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "user can update own profile" on public.profiles;
create policy "user can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

drop policy if exists "user can insert own profile" on public.profiles;
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

drop policy if exists "weekly goals are viewable by every logged in friend" on public.weekly_goals;
create policy "weekly goals are viewable by every logged in friend"
  on public.weekly_goals for select
  to authenticated
  using (true);

drop policy if exists "user can upsert own weekly goal" on public.weekly_goals;
create policy "user can upsert own weekly goal"
  on public.weekly_goals for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "user can update own weekly goal" on public.weekly_goals;
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
  photo_urls text[] not null default '{}',
  memo text,
  created_at timestamptz not null default now(),
  constraint workout_logs_has_photo check (array_length(photo_urls, 1) > 0),
  -- 과거 날짜 기록 업로드는 허용하되, 클라이언트 검증을 우회해서 미래 날짜로
  -- 기록을 만드는 것은 DB 레벨에서도 막는다.
  constraint workout_logs_log_date_not_future check (log_date <= (now() at time zone 'Asia/Seoul')::date)
);

create index if not exists workout_logs_log_date_idx on public.workout_logs (log_date);
create index if not exists workout_logs_user_idx on public.workout_logs (user_id);

alter table public.workout_logs enable row level security;

drop policy if exists "workout logs are viewable by every logged in friend" on public.workout_logs;
create policy "workout logs are viewable by every logged in friend"
  on public.workout_logs for select
  to authenticated
  using (true);

drop policy if exists "user can insert own workout log" on public.workout_logs;
create policy "user can insert own workout log"
  on public.workout_logs for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "user can delete own workout log" on public.workout_logs;
create policy "user can delete own workout log"
  on public.workout_logs for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "user can update own workout log" on public.workout_logs;
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

drop policy if exists "settings are viewable by every logged in friend" on public.app_settings;
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

drop policy if exists "anyone logged in can view workout photos" on storage.objects;
create policy "anyone logged in can view workout photos"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'workout-photos');

drop policy if exists "user can upload own workout photos" on storage.objects;
create policy "user can upload own workout photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'workout-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "user can delete own workout photos" on storage.objects;
create policy "user can delete own workout photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'workout-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ------------------------------------------------------------
-- 6. workout_log_reactions : 인증 게시물 이모지 리액션
--    한 사람당 게시물 하나에 이모지 하나만 (다시 누르면 토글로 취소/변경)
-- ------------------------------------------------------------
create table if not exists public.workout_log_reactions (
  id uuid primary key default gen_random_uuid(),
  log_id uuid not null references public.workout_logs (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (log_id, user_id)
);

create index if not exists workout_log_reactions_log_idx on public.workout_log_reactions (log_id);

alter table public.workout_log_reactions enable row level security;

drop policy if exists "reactions are viewable by every logged in friend" on public.workout_log_reactions;
create policy "reactions are viewable by every logged in friend"
  on public.workout_log_reactions for select
  to authenticated
  using (true);

drop policy if exists "user can upsert own reaction" on public.workout_log_reactions;
create policy "user can upsert own reaction"
  on public.workout_log_reactions for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "user can update own reaction" on public.workout_log_reactions;
create policy "user can update own reaction"
  on public.workout_log_reactions for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user can delete own reaction" on public.workout_log_reactions;
create policy "user can delete own reaction"
  on public.workout_log_reactions for delete
  to authenticated
  using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 7. workout_log_comments : 인증 게시물 댓글
-- ------------------------------------------------------------
create table if not exists public.workout_log_comments (
  id uuid primary key default gen_random_uuid(),
  log_id uuid not null references public.workout_logs (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 300),
  created_at timestamptz not null default now()
);

create index if not exists workout_log_comments_log_idx on public.workout_log_comments (log_id);

alter table public.workout_log_comments enable row level security;

drop policy if exists "comments are viewable by every logged in friend" on public.workout_log_comments;
create policy "comments are viewable by every logged in friend"
  on public.workout_log_comments for select
  to authenticated
  using (true);

drop policy if exists "user can insert own comment" on public.workout_log_comments;
create policy "user can insert own comment"
  on public.workout_log_comments for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "user can delete own comment" on public.workout_log_comments;
create policy "user can delete own comment"
  on public.workout_log_comments for delete
  to authenticated
  using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 8. push_subscriptions : 웹 푸시 알림 구독 정보
--    브라우저(기기)당 하나. 같은 사람이 여러 기기에서 구독하면 여러 행이 생긴다.
-- ------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- 본인 구독 정보는 본인만 보고 관리한다 (다른 사람에게 노출될 이유가 없음).
-- 알림 발송(크론) 서버는 service role 키를 쓰므로 RLS 자체를 우회해서 전체를 조회한다.
drop policy if exists "user can view own push subscriptions" on public.push_subscriptions;
create policy "user can view own push subscriptions"
  on public.push_subscriptions for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "user can insert own push subscription" on public.push_subscriptions;
create policy "user can insert own push subscription"
  on public.push_subscriptions for insert
  to authenticated
  with check (auth.uid() = user_id);

-- endpoint가 unique라서 같은 기기에서 다시 구독(upsert)하면 INSERT ... ON CONFLICT DO UPDATE로
-- 처리된다. 이 update 정책이 없으면 그 upsert 자체가 RLS에 막혀 실패한다.
drop policy if exists "user can update own push subscription" on public.push_subscriptions;
create policy "user can update own push subscription"
  on public.push_subscriptions for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user can delete own push subscription" on public.push_subscriptions;
create policy "user can delete own push subscription"
  on public.push_subscriptions for delete
  to authenticated
  using (auth.uid() = user_id);
