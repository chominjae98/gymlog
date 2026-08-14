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

export type SettlementRow = {
  weekStart: string;
  profile: Pick<Profile, "id" | "nickname" | "avatar_url">;
  targetDays: number;
  achievedDays: number;
  amount: number;
  paid: boolean;
};

export async function getProfile(supabase: Client, userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("id, nickname, avatar_url, kakao_id, created_at")
    .eq("id", userId)
    .single();
  return data as Profile | null;
}

export async function getMonthLogs(supabase: Client, monthDate: Date) {
  const { start, end } = getMonthRangeKeys(monthDate);
  const { data } = await supabase
    .from("workout_logs")
    .select(
      "id, user_id, log_date, photo_url, memo, created_at, profile:profiles(id, nickname, avatar_url)"
    )
    .gte("log_date", start)
    .lte("log_date", end)
    .order("created_at", { ascending: false });

  return (data ?? []) as unknown as WorkoutLogWithProfile[];
}

export async function getFinePerDay(supabase: Client) {
  const { data } = await supabase
    .from("app_settings")
    .select("fine_per_day")
    .eq("id", 1)
    .single();
  return data?.fine_per_day ?? 5000;
}

/**
 * 목표 대비 현재 상태를 계산하는 순수 함수. 서버(getWeeklyProgress)뿐 아니라
 * 클라이언트에서 사용자가 방금 한 행동(목표 변경 등)을 화면에 즉시 반영하는
 * 낙관적 업데이트(optimistic update)에도 그대로 재사용한다.
 */
export function computeWeeklyStatus(
  achievedDays: number,
  targetDays: number | null,
  remainingDaysInWeek: number
): WeeklyProgress["status"] {
  if (targetDays == null) return "no-goal";
  const possibleMax = achievedDays + remainingDaysInWeek;
  if (achievedDays >= targetDays) return "safe";
  if (possibleMax < targetDays) return "fined";
  if (possibleMax === targetDays) return "at-risk";
  return "safe";
}

/** 오늘 기준 이번 주, 멤버별 목표 달성 현황 (벌금 위기 계산 포함) */
export async function getWeeklyProgress(
  supabase: Client,
  today: Date
): Promise<WeeklyProgress[]> {
  const weekStart = getWeekStartKey(today);
  const { start, end } = getWeekRangeKeys(today);
  const remaining = remainingDaysInWeekIncludingToday(today);

  const [{ data: profiles }, { data: goals }, { data: logs }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, nickname, avatar_url")
        .order("created_at", { ascending: true }),
      supabase
        .from("weekly_goals")
        .select("user_id, target_days")
        .eq("week_start", weekStart),
      supabase
        .from("workout_logs")
        .select("user_id, log_date")
        .gte("log_date", start)
        .lte("log_date", end),
    ]);

  const goalByUser = new Map(
    (goals ?? []).map((g) => [g.user_id, g.target_days])
  );
  const achievedByUser = new Map<string, Set<string>>();
  for (const log of logs ?? []) {
    const set = achievedByUser.get(log.user_id) ?? new Set<string>();
    set.add(log.log_date);
    achievedByUser.set(log.user_id, set);
  }

  return (profiles ?? []).map((profile) => {
    const targetDays = goalByUser.get(profile.id) ?? null;
    const achievedDays = achievedByUser.get(profile.id)?.size ?? 0;

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
  today: Date
) {
  const weekStart = getWeekStartKey(today);
  const { data } = await supabase
    .from("weekly_goals")
    .select("target_days")
    .eq("user_id", userId)
    .eq("week_start", weekStart)
    .maybeSingle();
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
 * 지난 주들 중 목표를 못 채워 벌금이 확정된 기록만 모아서 정산용으로 돌려준다.
 * (이번 주는 아직 진행 중이라 제외 — 완결된 과거 주차만 대상)
 */
export async function getSettlementWeeks(
  supabase: Client,
  today: Date,
  finePerDay: number
): Promise<SettlementRow[]> {
  const currentWeekStart = getWeekStartKey(today);
  const since = new Date(today);
  since.setDate(since.getDate() - 12 * 7); // 최근 12주까지만
  const sinceKey = toDateKey(since);

  const [{ data: goals }, { data: logs }, { data: payments }] =
    await Promise.all([
      supabase
        .from("weekly_goals")
        .select("user_id, week_start, target_days, profile:profiles(id, nickname, avatar_url)")
        .lt("week_start", currentWeekStart)
        .gte("week_start", sinceKey),
      supabase
        .from("workout_logs")
        .select("user_id, log_date")
        .gte("log_date", sinceKey)
        .lt("log_date", currentWeekStart),
      supabase.from("fine_payments").select("user_id, week_start, paid"),
    ]);

  const paidMap = new Map<string, boolean>();
  for (const p of payments ?? []) {
    paidMap.set(`${p.user_id}_${p.week_start}`, p.paid);
  }

  const achievedByUserWeek = new Map<string, Set<string>>();
  for (const log of logs ?? []) {
    const weekStart = getWeekStartKey(new Date(`${log.log_date}T00:00:00`));
    const key = `${log.user_id}_${weekStart}`;
    const set = achievedByUserWeek.get(key) ?? new Set<string>();
    set.add(log.log_date);
    achievedByUserWeek.set(key, set);
  }

  const rows: SettlementRow[] = [];
  for (const g of (goals ?? []) as unknown as Array<{
    user_id: string;
    week_start: string;
    target_days: number;
    profile: Pick<Profile, "id" | "nickname" | "avatar_url">;
  }>) {
    const key = `${g.user_id}_${g.week_start}`;
    const achievedDays = achievedByUserWeek.get(key)?.size ?? 0;
    if (achievedDays >= g.target_days) continue; // 목표 달성한 주는 정산 대상 아님

    rows.push({
      weekStart: g.week_start,
      profile: g.profile,
      targetDays: g.target_days,
      achievedDays,
      amount: finePerDay,
      paid: paidMap.get(key) ?? false,
    });
  }

  rows.sort((a, b) => b.weekStart.localeCompare(a.weekStart));
  return rows;
}
