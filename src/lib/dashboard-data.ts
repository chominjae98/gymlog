import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  Profile,
  WeeklyProgress,
  WorkoutLogWithProfile,
} from "@/types/database";
import {
  getMonthRangeKeys,
  getWeekRangeKeys,
  getWeekStartKey,
  remainingDaysInWeekIncludingToday,
  toDateKey,
} from "@/lib/date";

type Client = SupabaseClient<Database>;

export async function getProfile(supabase: Client, userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, nickname, avatar_url, toss_user_key, created_at")
    .eq("id", userId)
    .single();
  if (error) {
    console.error("getProfile 조회 실패:", userId, error);
  }
  return data as Profile | null;
}

/**
 * 특정 달의 인증 기록. 캘린더 표시(monthLogs)뿐 아니라 "달력을 다른 달로 넘겼을 때"의
 * 유일한 데이터 소스이기도 하므로, 조회 실패를 빈 배열로 감춰버리면 실제로는 아무도
 * 인증하지 않은 것처럼 보이는 잘못된 화면이 뜬다. 호출부(Dashboard.handleMonthChange 등)가
 * "진짜 빈 달"과 "조회 실패"를 구분해 에러를 보여줄 수 있도록 실패 시 예외를 던진다.
 */
export async function getMonthLogs(supabase: Client, monthDate: Date, roomId: string) {
  const { start, end } = getMonthRangeKeys(monthDate);
  const { data, error } = await supabase
    .from("workout_logs")
    .select(
      "id, user_id, log_date, photo_urls, photo_hashes, memo, created_at, profile:profiles(id, nickname, avatar_url)"
    )
    .eq("room_id", roomId)
    .gte("log_date", start)
    .lte("log_date", end)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getMonthLogs 조회 실패:", roomId, error);
    throw error;
  }

  return (data ?? []) as unknown as WorkoutLogWithProfile[];
}

/** 목표 미달(fined) 상태일 때만 weeklyFine 전액이 부과되고, 그 외엔 0원. */
export function computeFineAmount(
  status: WeeklyProgress["status"],
  weeklyFine: number
) {
  return status === "fined" ? weeklyFine : 0;
}

/**
 * 이번 주 현황 status별 화면 표기(라벨/배지 스타일). FineSection, FineWatchlist가 공유한다.
 * "at-risk"는 아직 남은 요일로 목표 달성이 가능한 상태이므로(computeWeeklyStatus 참고),
 * 이미 실패가 확정된 것처럼 보이지 않도록 "fined"와 다른 문구를 쓴다.
 */
export const WEEKLY_STATUS_META: Record<
  WeeklyProgress["status"],
  { label: string; badgeClass: string }
> = {
  "no-goal": { label: "목표 미설정", badgeClass: "bg-surface-muted text-muted" },
  safe: { label: "순항 중", badgeClass: "bg-brand-soft text-brand-strong" },
  "at-risk": { label: "목표 달성 중", badgeClass: "bg-amber-100 text-amber-700" },
  fined: { label: "벌금 확정", badgeClass: "bg-warn-soft text-warn" },
};

/**
 * 목표 대비 현재 상태를 계산하는 순수 함수. 서버(getWeeklyProgress)뿐 아니라
 * 클라이언트에서 사용자가 방금 한 행동(목표 변경 등)을 화면에 즉시 반영하는
 * 낙관적 업데이트(optimistic update)에도 그대로 재사용한다.
 *
 * 규칙: 남은 요일 수와 상관없이, 이번 주 목표를 다 채우기 전까지는 계속 "위기(at-risk)"다.
 * 목표를 달성하는 순간에만 "순항 중(safe)"으로 바뀌고, 남은 요일을 다 채워도 더 이상
 * 목표에 도달할 수 없게 된 순간에는 "벌금 확정(fined)"으로 확정된다.
 */
export function computeWeeklyStatus(
  achievedDays: number,
  targetDays: number | null,
  remainingDaysInWeek: number
): WeeklyProgress["status"] {
  if (targetDays == null) return "no-goal";
  if (achievedDays >= targetDays) return "safe";
  const possibleMax = achievedDays + remainingDaysInWeek;
  if (possibleMax < targetDays) return "fined";
  return "at-risk";
}

/**
 * 오늘 기준 이번 주, 멤버별 목표 달성 현황 (벌금 위기 계산 포함).
 *
 * roomId: 멤버 목록/인증 기록/벌금 예외를 조회할 방(이 방 활동 기준으로 achievedDays가 계산됨).
 * goalRoomId: 주간 목표(target_days)를 조회할 방. 기본은 roomId와 같지만, "주간 목표는
 *   방마다 따로 세우는 게 아니라 사람마다 하나(모두가 함께 쓰는 홈 기준)"로 통일하면서
 *   친구 방 대시보드에서도 항상 홈에 설정된 같은 목표를 보여주기 위해 분리했다.
 */
export async function getWeeklyProgress(
  supabase: Client,
  today: Date,
  roomId: string,
  goalRoomId: string = roomId
): Promise<WeeklyProgress[]> {
  const weekStart = getWeekStartKey(today);
  const { start, end } = getWeekRangeKeys(today);
  const remaining = remainingDaysInWeekIncludingToday(today);

  const [
    { data: members, error: membersError },
    { data: goals, error: goalsError },
    { data: logs, error: logsError },
    { data: exceptions, error: exceptionsError },
  ] = await Promise.all([
    supabase
      .from("room_members")
      .select("profile:profiles(id, nickname, avatar_url)")
      .eq("room_id", roomId),
    supabase
      .from("weekly_goals")
      .select("user_id, target_days")
      .eq("room_id", goalRoomId)
      .eq("week_start", weekStart),
    supabase
      .from("workout_logs")
      .select("user_id, log_date")
      .eq("room_id", roomId)
      .gte("log_date", start)
      .lte("log_date", end),
    supabase
      .from("fine_exceptions")
      .select("user_id")
      .eq("room_id", roomId)
      .eq("week_start", weekStart)
      .eq("status", "approved"),
  ]);

  // 이 함수의 결과(achievedDays/status)는 벌금 위기 여부와 정산 금액에 직결된다.
  // 네 쿼리 중 하나라도 실패했는데 조용히 빈 배열로 넘어가면(예: logs 실패 → 아무도
  // 인증하지 않은 것처럼 계산 → 실제로 목표를 채운 사람도 "벌금 확정"으로 잘못 표시),
  // 실제와 다른 금액이 아무 표시 없이 화면에 뜨게 된다. 그런 경우를 절대 조용히
  // 넘기지 않고 예외를 던져 호출부가 에러 상태로 처리하게 한다.
  const firstError = membersError ?? goalsError ?? logsError ?? exceptionsError;
  if (firstError) {
    console.error("getWeeklyProgress 조회 실패:", roomId, {
      membersError,
      goalsError,
      logsError,
      exceptionsError,
    });
    throw firstError;
  }

  const profiles = (
    (members ?? []) as unknown as { profile: Pick<Profile, "id" | "nickname" | "avatar_url"> }[]
  ).map((m) => m.profile);

  const goalByUser = new Map(
    (goals ?? []).map((g) => [g.user_id, g.target_days])
  );
  const achievedByUser = new Map<string, Set<string>>();
  for (const log of logs ?? []) {
    const set = achievedByUser.get(log.user_id) ?? new Set<string>();
    set.add(log.log_date);
    achievedByUser.set(log.user_id, set);
  }
  // 다수결로 가결된 벌금 예외 사유서는 실제 인증 없이도 그 주 달성일수에 +1로 카운트된다.
  // 사람당 그 주에 가결될 수 있는 사유서는 최대 1건(DB 부분 유니크 인덱스로 강제됨)이므로,
  // 여기서도 +1을 넘지 않도록 캡을 둔다 — 마이그레이션 전 잔여 데이터 등으로 그 이상이
  // 존재하더라도 벌금 회피에 쓰이지 않도록 방어한다.
  const exceptionCreditByUser = new Set<string>();
  for (const ex of exceptions ?? []) {
    exceptionCreditByUser.add(ex.user_id);
  }

  return (profiles ?? []).map((profile) => {
    const targetDays = goalByUser.get(profile.id) ?? null;
    const achievedDays =
      (achievedByUser.get(profile.id)?.size ?? 0) +
      (exceptionCreditByUser.has(profile.id) ? 1 : 0);

    return {
      profile,
      targetDays,
      achievedDays,
      remainingDaysInWeek: remaining,
      status: computeWeeklyStatus(achievedDays, targetDays, remaining),
    };
  });
}

export async function getMyWeeklyGoal(
  supabase: Client,
  userId: string,
  today: Date,
  roomId: string
) {
  const weekStart = getWeekStartKey(today);
  const { data, error } = await supabase
    .from("weekly_goals")
    .select("target_days")
    .eq("user_id", userId)
    .eq("room_id", roomId)
    .eq("week_start", weekStart)
    .maybeSingle();
  if (error) {
    console.error("getMyWeeklyGoal 조회 실패:", userId, roomId, error);
  }
  return data?.target_days ?? null;
}

export function groupLogsByDate(logs: WorkoutLogWithProfile[]) {
  const map = new Map<string, WorkoutLogWithProfile[]>();
  for (const log of logs) {
    const arr = map.get(log.log_date) ?? [];
    arr.push(log);
    map.set(log.log_date, arr);
  }
  return map;
}

export function todayKey(today: Date) {
  return toDateKey(today);
}

/** 같은 사람이 하루에 사진을 여러 장 올려도 "명" 수는 중복 없이 세야 한다. */
export function countUniquePeople(logs: WorkoutLogWithProfile[]) {
  return new Set(logs.map((log) => log.user_id)).size;
}

/**
 * 아바타 미리보기처럼 사람 목록을 보여줄 때, 같은 사람이 여러 장을 올렸어도
 * 대표 기록(가장 먼저 나온 것) 하나만 남긴다. logs는 이미 최신순으로 정렬돼 있으므로
 * 결과도 "가장 최근에 인증한 사람 순"이 된다.
 */
export function uniqueLogsByUser(logs: WorkoutLogWithProfile[]): WorkoutLogWithProfile[] {
  const seen = new Set<string>();
  const result: WorkoutLogWithProfile[] = [];
  for (const log of logs) {
    if (seen.has(log.user_id)) continue;
    seen.add(log.user_id);
    result.push(log);
  }
  return result;
}
