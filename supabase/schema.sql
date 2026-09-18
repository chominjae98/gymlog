-- ============================================================
-- FitLog(가칭) 스키마
-- Supabase SQL Editor에서 그대로 실행하세요.
-- 이 파일은 몇 번을 다시 실행해도 안전하도록(idempotent) 작성되어 있습니다.
-- (테이블/인덱스는 if not exists, 정책은 drop 후 재생성)
-- ============================================================

-- 확장
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- 1. profiles : 토스 로그인한 사용자 프로필
--    auth.users 와 1:1, 트리거로 자동 생성됨
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null default '친구',
  avatar_url text,
  created_at timestamptz not null default now()
);

-- 카카오 로그인 → 토스 로그인 전환. 기존 카카오 계정은 새 토스 계정과 자동 연결되지 않으며,
-- 친구들이 새로 온보딩한다(합의된 사항이라 kakao_id는 완전히 제거한다).
alter table public.profiles drop column if exists kakao_id;
alter table public.profiles add column if not exists toss_user_key text;

create unique index if not exists profiles_toss_user_key_key
  on public.profiles (toss_user_key)
  where toss_user_key is not null;

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
  insert into public.profiles (id, nickname, avatar_url, toss_user_key)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      '친구'
    ),
    new.raw_user_meta_data ->> 'avatar_url',
    new.raw_user_meta_data ->> 'toss_user_key'
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
-- 2. rooms / room_members : 친구 그룹 단위 "방"
--    한 사용자가 여러 방에 동시에 속할 수 있다. profiles 전체를 공유하는 대신,
--    사진·벌금·투표 같은 민감한 데이터는 전부 이 방 멤버십을 기준으로 격리된다
--    (토스 로그인으로 낯선 사용자도 앱에 들어올 수 있게 되면서 필요해진 경계).
-- ------------------------------------------------------------
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  fine_per_day integer not null default 5000,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.room_members (
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

alter table public.rooms enable row level security;

drop policy if exists "rooms are viewable by their members" on public.rooms;
create policy "rooms are viewable by their members"
  on public.rooms for select
  to authenticated
  using (
    exists (
      select 1 from public.room_members rm
      where rm.room_id = rooms.id and rm.user_id = auth.uid()
    )
  );

-- 실제 생성은 아래 create_room() 함수를 통해서만 한다. 이 정책은 최소한의 안전장치.
drop policy if exists "user can create room as self" on public.rooms;
create policy "user can create room as self"
  on public.rooms for insert
  to authenticated
  with check (created_by = auth.uid());

alter table public.room_members enable row level security;

drop policy if exists "members can view their room roster" on public.room_members;
create policy "members can view their room roster"
  on public.room_members for select
  to authenticated
  using (
    exists (
      select 1 from public.room_members rm2
      where rm2.room_id = room_members.room_id and rm2.user_id = auth.uid()
    )
  );

-- 실제 가입은 create_room()/join_room_by_code() 함수를 통해서만 한다. 안전장치용 정책.
drop policy if exists "user can add self as member" on public.room_members;
create policy "user can add self as member"
  on public.room_members for insert
  to authenticated
  with check (user_id = auth.uid());

-- 사람이 부르거나 타이핑하기 쉬운 8자리 대문자 영숫자 초대 코드를 만든다.
create or replace function public.generate_room_invite_code()
returns text
language sql
as $$
  select upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
$$;

-- 방 생성 + 생성자를 멤버로 등록까지 한 번에 처리한다. 코드 충돌 시 자동 재시도한다.
create or replace function public.create_room(name text, fine_per_day integer default 5000)
returns public.rooms
language plpgsql
security invoker
as $$
declare
  new_room public.rooms;
  candidate_code text;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요해요.';
  end if;

  loop
    candidate_code := public.generate_room_invite_code();
    begin
      insert into public.rooms (name, invite_code, fine_per_day, created_by)
      values (name, candidate_code, fine_per_day, auth.uid())
      returning * into new_room;
      exit;
    exception when unique_violation then
      -- 코드가 겹치면 다시 생성해 재시도한다.
    end;
  end loop;

  insert into public.room_members (room_id, user_id)
  values (new_room.id, auth.uid());

  return new_room;
end;
$$;

-- 초대 코드로 참가한다. 아직 멤버가 아닌 사람도 코드로 방을 조회할 수 있어야 하므로
-- 이 함수만 예외적으로 security definer로 RLS를 우회한다(조회 범위는 함수 안에서 제한).
create or replace function public.join_room_by_code(code text)
returns public.rooms
language plpgsql
security definer set search_path = public
as $$
declare
  target_room public.rooms;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요해요.';
  end if;

  select * into target_room from public.rooms where invite_code = upper(code);
  if not found then
    raise exception '초대 코드를 찾을 수 없어요.';
  end if;

  insert into public.room_members (room_id, user_id)
  values (target_room.id, auth.uid())
  on conflict (room_id, user_id) do nothing;

  return target_room;
end;
$$;

-- 방과 무관한 전체 이용자 랭킹(누적 인증 일수). 닉네임/아바타/집계 수치만 노출하고
-- 사진·메모·어느 방 소속인지는 절대 노출하지 않는다.
create or replace function public.get_global_leaderboard(limit_count integer default 100)
returns table (
  user_id uuid,
  nickname text,
  avatar_url text,
  total_days bigint
)
language sql
security definer set search_path = public
stable
as $$
  select
    p.id as user_id,
    p.nickname,
    p.avatar_url,
    count(distinct wl.log_date) as total_days
  from public.profiles p
  join public.workout_logs wl on wl.user_id = p.id
  group by p.id, p.nickname, p.avatar_url
  order by total_days desc, p.created_at asc
  limit limit_count;
$$;

grant execute on function public.create_room(text, integer) to authenticated;
grant execute on function public.join_room_by_code(text) to authenticated;
grant execute on function public.get_global_leaderboard(integer) to authenticated;

-- ------------------------------------------------------------
-- 3. weekly_goals : 주간 운동 목표 (해당 주 월요일 날짜 기준)
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

-- 방 도입: 같은 주에 여러 방에서 각자 목표를 세울 수 있어야 하므로 room_id를 유니크 키에 포함한다.
alter table public.weekly_goals
  add column if not exists room_id uuid references public.rooms (id) on delete cascade;

alter table public.weekly_goals drop constraint if exists weekly_goals_user_id_week_start_key;
alter table public.weekly_goals
  add constraint weekly_goals_user_id_week_start_room_id_key unique (user_id, week_start, room_id);

alter table public.weekly_goals enable row level security;

drop policy if exists "weekly goals are viewable by every logged in friend" on public.weekly_goals;
drop policy if exists "weekly goals are viewable by room members" on public.weekly_goals;
create policy "weekly goals are viewable by room members"
  on public.weekly_goals for select
  to authenticated
  using (
    exists (
      select 1 from public.room_members rm
      where rm.room_id = weekly_goals.room_id and rm.user_id = auth.uid()
    )
  );

drop policy if exists "user can upsert own weekly goal" on public.weekly_goals;
create policy "user can upsert own weekly goal"
  on public.weekly_goals for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.room_members rm
      where rm.room_id = weekly_goals.room_id and rm.user_id = auth.uid()
    )
  );

drop policy if exists "user can update own weekly goal" on public.weekly_goals;
create policy "user can update own weekly goal"
  on public.weekly_goals for update
  to authenticated
  using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 4. workout_logs : 하루 운동 인증 (사진 + 메모)
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

alter table public.workout_logs
  add column if not exists room_id uuid references public.rooms (id) on delete cascade;

create index if not exists workout_logs_log_date_idx on public.workout_logs (log_date);
create index if not exists workout_logs_user_idx on public.workout_logs (user_id);
create index if not exists workout_logs_room_idx on public.workout_logs (room_id);

alter table public.workout_logs enable row level security;

drop policy if exists "workout logs are viewable by every logged in friend" on public.workout_logs;
drop policy if exists "workout logs are viewable by room members" on public.workout_logs;
create policy "workout logs are viewable by room members"
  on public.workout_logs for select
  to authenticated
  using (
    exists (
      select 1 from public.room_members rm
      where rm.room_id = workout_logs.room_id and rm.user_id = auth.uid()
    )
  );

drop policy if exists "user can insert own workout log" on public.workout_logs;
create policy "user can insert own workout log"
  on public.workout_logs for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.room_members rm
      where rm.room_id = workout_logs.room_id and rm.user_id = auth.uid()
    )
  );

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
-- 5. app_settings : (더 이상 쓰지 않음) 벌금 단가는 이제 방마다 rooms.fine_per_day로 관리한다.
--    앱 코드는 더 이상 이 테이블을 읽지 않는다. 백필 시 초기값 참고용으로만 남겨둔다.
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
-- 6. Storage : 운동 인증 사진 버킷
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
-- 7. workout_log_comments : 인증 게시물 댓글
--    room_id 컬럼을 따로 두지 않고, 부모 workout_logs의 room_id로 소속을 판단한다.
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
drop policy if exists "comments are viewable by room members" on public.workout_log_comments;
create policy "comments are viewable by room members"
  on public.workout_log_comments for select
  to authenticated
  using (
    exists (
      select 1 from public.workout_logs wl
      join public.room_members rm on rm.room_id = wl.room_id
      where wl.id = workout_log_comments.log_id and rm.user_id = auth.uid()
    )
  );

drop policy if exists "user can insert own comment" on public.workout_log_comments;
create policy "user can insert own comment"
  on public.workout_log_comments for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.workout_logs wl
      join public.room_members rm on rm.room_id = wl.room_id
      where wl.id = workout_log_comments.log_id and rm.user_id = auth.uid()
    )
  );

drop policy if exists "user can delete own comment" on public.workout_log_comments;
create policy "user can delete own comment"
  on public.workout_log_comments for delete
  to authenticated
  using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 8. fine_exceptions : 벌금 예외 사유서 (피치 못할 사정으로 못 갔을 때 제출)
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

alter table public.fine_exceptions
  add column if not exists room_id uuid references public.rooms (id) on delete cascade;

create index if not exists fine_exceptions_week_idx on public.fine_exceptions (week_start);
create index if not exists fine_exceptions_user_idx on public.fine_exceptions (user_id);
create index if not exists fine_exceptions_room_idx on public.fine_exceptions (room_id);

alter table public.fine_exceptions enable row level security;

drop policy if exists "fine exceptions are viewable by every logged in friend" on public.fine_exceptions;
drop policy if exists "fine exceptions are viewable by room members" on public.fine_exceptions;
create policy "fine exceptions are viewable by room members"
  on public.fine_exceptions for select
  to authenticated
  using (
    exists (
      select 1 from public.room_members rm
      where rm.room_id = fine_exceptions.room_id and rm.user_id = auth.uid()
    )
  );

drop policy if exists "user can submit own fine exception" on public.fine_exceptions;
create policy "user can submit own fine exception"
  on public.fine_exceptions for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.room_members rm
      where rm.room_id = fine_exceptions.room_id and rm.user_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- 9. fine_exception_votes : 사유서에 대한 찬반 투표 (본인 것엔 투표 불가, 1인 1표)
--    room_id 컬럼을 따로 두지 않고, 부모 fine_exceptions의 room_id로 소속을 판단한다.
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
drop policy if exists "votes are viewable by room members" on public.fine_exception_votes;
create policy "votes are viewable by room members"
  on public.fine_exception_votes for select
  to authenticated
  using (
    exists (
      select 1 from public.fine_exceptions fe
      join public.room_members rm on rm.room_id = fe.room_id
      where fe.id = fine_exception_votes.exception_id and rm.user_id = auth.uid()
    )
  );

-- 본인 사유서에는 투표할 수 없고, 아직 결론이 안 난(pending) 사유서에만, 같은 방
-- 멤버만 투표할 수 있다(낯선 사용자가 다수결에 끼어드는 것을 막는 핵심 조건).
drop policy if exists "user can vote on others pending fine exception" on public.fine_exception_votes;
create policy "user can vote on others pending fine exception"
  on public.fine_exception_votes for insert
  to authenticated
  with check (
    auth.uid() = voter_id
    and exists (
      select 1 from public.fine_exceptions fe
      join public.room_members rm on rm.room_id = fe.room_id
      where fe.id = exception_id
        and fe.status = 'pending'
        and fe.user_id <> auth.uid()
        and rm.user_id = auth.uid()
    )
  );

-- 투표가 들어올 때마다 다수결(과반) 여부를 계산해 사유서 상태를 자동 확정한다.
-- security definer로 실행되어, 일반 사용자에게는 없는 update 권한으로 상태를 바꾼다.
-- 과반 기준(eligible_voters)은 전체 profiles가 아니라 그 사유서가 속한 방의 멤버 수로
-- 계산한다 — 그렇지 않으면 그 방과 무관한 사용자가 늘어날 때마다 기준이 흔들리고,
-- 심지어 그 사용자가 직접 투표를 던져 결과를 좌우할 수 있었다.
create or replace function public.resolve_fine_exception()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  requester_id uuid;
  exception_room_id uuid;
  eligible_voters integer;
  majority_threshold integer;
  approve_count integer;
  reject_count integer;
begin
  select user_id, room_id into requester_id, exception_room_id
    from public.fine_exceptions where id = new.exception_id;

  select count(*) into eligible_voters
    from public.room_members
    where room_id = exception_room_id and user_id <> requester_id;
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
-- 10. 기존 데이터 백필 : "방(rooms)" 도입 이전에 쌓인 데이터를 기본 방 하나로 이관한다.
--     rooms가 이미 하나라도 있으면(=이미 백필했으면) 건너뛰므로 몇 번을 다시 실행해도 안전하다.
-- ------------------------------------------------------------
do $$
declare
  default_room_id uuid;
  default_fine integer;
begin
  if not exists (select 1 from public.rooms) then
    select fine_per_day into default_fine from public.app_settings where id = 1;

    insert into public.rooms (name, invite_code, fine_per_day)
    values ('오운완 친구들', public.generate_room_invite_code(), coalesce(default_fine, 5000))
    returning id into default_room_id;

    insert into public.room_members (room_id, user_id)
    select default_room_id, id from public.profiles
    on conflict do nothing;

    update public.weekly_goals set room_id = default_room_id where room_id is null;
    update public.workout_logs set room_id = default_room_id where room_id is null;
    update public.fine_exceptions set room_id = default_room_id where room_id is null;
  end if;
end $$;

alter table public.weekly_goals alter column room_id set not null;
alter table public.workout_logs alter column room_id set not null;
alter table public.fine_exceptions alter column room_id set not null;

-- ------------------------------------------------------------
-- 11. (제거된 기능 정리) 웹 푸시 알림 리마인더와 이모지 리액션 기능을 뺐다.
--     예전 버전을 실행해서 아래 테이블이 이미 생성돼 있다면 이 문장들이 정리해준다.
--     (workout_logs, weekly_goals, workout_log_comments 등 남겨둔 테이블의
--     기존 데이터는 전혀 건드리지 않는다.)
-- ------------------------------------------------------------
drop table if exists public.push_subscriptions;
drop table if exists public.workout_log_reactions;
