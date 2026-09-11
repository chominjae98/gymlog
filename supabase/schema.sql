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

-- 같은 사람이 예전에 올린 사진과 내용이 완전히 같은 사진(SHA-256 해시 일치)을
-- 재사용하는 것을 막기 위한 해시 목록. photo_urls와 같은 순서/개수를 유지한다.
-- 이 컬럼이 생기기 전에 만들어진 기존 행은 빈 배열('{}')로 채워지며, 그런 사진은
-- 중복 검사 대상에서 자연히 제외된다(안전한 방향).
alter table public.workout_logs
  add column if not exists photo_hashes text[] not null default '{}';

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
-- 6. workout_log_comments : 인증 게시물 댓글
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
-- 7. fine_exceptions : 벌금 예외 사유서 (피치 못할 사정으로 못 갔을 때 제출)
--    승인(approved)되면 그 주 목표 달성일수에 +1로 카운트되어 벌금 계산에서 빠진다.
--    상태(status)는 여기서 직접 update 하지 않는다 — 아래 트리거가 투표 결과를
--    보고 자동으로 확정한다(사용자가 임의로 자기 사유서를 승인 처리하지 못하도록
--    일반 사용자용 update 정책을 아예 두지 않았다).
-- ------------------------------------------------------------
create table if not exists public.fine_exceptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  week_start date not null, -- 그 주의 월요일 (weekly_goals와 동일한 기준)
  reason text not null check (char_length(reason) between 1 and 500),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists fine_exceptions_week_idx on public.fine_exceptions (week_start);
create index if not exists fine_exceptions_user_idx on public.fine_exceptions (user_id);

alter table public.fine_exceptions enable row level security;

drop policy if exists "fine exceptions are viewable by every logged in friend" on public.fine_exceptions;
create policy "fine exceptions are viewable by every logged in friend"
  on public.fine_exceptions for select
  to authenticated
  using (true);

drop policy if exists "user can submit own fine exception" on public.fine_exceptions;
create policy "user can submit own fine exception"
  on public.fine_exceptions for insert
  to authenticated
  with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 8. fine_exception_votes : 사유서에 대한 찬반 투표 (본인 것엔 투표 불가, 1인 1표)
-- ------------------------------------------------------------
create table if not exists public.fine_exception_votes (
  id uuid primary key default gen_random_uuid(),
  exception_id uuid not null references public.fine_exceptions (id) on delete cascade,
  voter_id uuid not null references public.profiles (id) on delete cascade,
  vote text not null check (vote in ('approve', 'reject')),
  created_at timestamptz not null default now(),
  unique (exception_id, voter_id)
);

create index if not exists fine_exception_votes_exception_idx on public.fine_exception_votes (exception_id);

alter table public.fine_exception_votes enable row level security;

drop policy if exists "votes are viewable by every logged in friend" on public.fine_exception_votes;
create policy "votes are viewable by every logged in friend"
  on public.fine_exception_votes for select
  to authenticated
  using (true);

-- 본인 사유서에는 투표할 수 없고, 아직 결론이 안 난(pending) 사유서에만 투표할 수 있다.
drop policy if exists "user can vote on others pending fine exception" on public.fine_exception_votes;
create policy "user can vote on others pending fine exception"
  on public.fine_exception_votes for insert
  to authenticated
  with check (
    auth.uid() = voter_id
    and exists (
      select 1 from public.fine_exceptions fe
      where fe.id = exception_id
        and fe.status = 'pending'
        and fe.user_id <> auth.uid()
    )
  );

-- 투표가 들어올 때마다 다수결(과반) 여부를 계산해 사유서 상태를 자동 확정한다.
-- security definer로 실행되어, 일반 사용자에게는 없는 update 권한으로 상태를 바꾼다.
create or replace function public.resolve_fine_exception()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  requester_id uuid;
  eligible_voters integer;
  majority_threshold integer;
  approve_count integer;
  reject_count integer;
begin
  select user_id into requester_id from public.fine_exceptions where id = new.exception_id;

  -- 본인은 투표 대상에서 제외한 나머지 멤버 수를 기준으로 과반을 계산한다.
  select count(*) into eligible_voters from public.profiles where id <> requester_id;
  majority_threshold := (eligible_voters / 2) + 1;

  select
    count(*) filter (where vote = 'approve'),
    count(*) filter (where vote = 'reject')
    into approve_count, reject_count
    from public.fine_exception_votes
    where exception_id = new.exception_id;

  if approve_count >= majority_threshold then
    update public.fine_exceptions
      set status = 'approved', resolved_at = now()
      where id = new.exception_id and status = 'pending';
  elsif reject_count >= majority_threshold then
    update public.fine_exceptions
      set status = 'rejected', resolved_at = now()
      where id = new.exception_id and status = 'pending';
  end if;

  return new;
end;
$$;

drop trigger if exists on_fine_exception_vote on public.fine_exception_votes;
create trigger on_fine_exception_vote
  after insert on public.fine_exception_votes
  for each row execute procedure public.resolve_fine_exception();

-- ------------------------------------------------------------
-- 9. (제거된 기능 정리) 웹 푸시 알림 리마인더와 이모지 리액션 기능을 뺐다.
--    예전 버전을 실행해서 아래 테이블이 이미 생성돼 있다면 이 문장들이 정리해준다.
--    (workout_logs, weekly_goals, workout_log_comments 등 남겨둔 테이블의
--    기존 데이터는 전혀 건드리지 않는다.)
-- ------------------------------------------------------------
drop table if exists public.push_subscriptions;
drop table if exists public.workout_log_reactions;
