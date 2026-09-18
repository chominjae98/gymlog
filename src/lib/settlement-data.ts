import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, MonthlySettlement } from "@/types/database";
import { computeFineAmount, computeWeeklyStatus } from "@/lib/dashboard-data";
import {
  getMonthRangeKeys,
  getWeekRangeFromStart,
  getWeekStartsInMonth,
  remainingDaysInWeekIncludingToday,
  toDateKey,
} from "@/lib/date";

type Client = SupabaseClient<Database>;

/**
 * 특정 달(月)의 사람별 벌금 정산 요약을 계산한다.
 * 이번 주(아직 진행 중인 주)는 "지금까지 기준"으로 계산하고(막판 스퍼트 여지를 남김),
 * 이미 끝난 주는 남은 요일이 0이므로 목표를 못 채웠으면 그대로 확정(fined)된다.
 */
export async function getMonthlySettlement(
  supabase: Client,
  monthDate: Date,
  today: Date,
  weeklyFine: number,
  roomId: string
): Promise<MonthlySettlement[]> {
  const weekStarts = getWeekStartsInMonth(monthDate);
  const { start: monthStart, end: monthEnd } = getMonthRangeKeys(monthDate);
  const todayKey = toDateKey(today);
  const currentWeekStart = weekStarts.find((ws) => {
    const { start, end } = getWeekRangeFromStart(ws);
    return todayKey >= start && todayKey <= end;
  });

  const [{ data: members }, { data: goals }, { data: logs }, { data: exceptions }] =
    await Promise.all([
      supabase
        .from("room_members")
        .select("profile:profiles(id, nickname, avatar_url)")
        .eq("room_id", roomId),
      supabase
        .from("weekly_goals")
        .select("user_id, week_start, target_days")
        .eq("room_id", roomId)
        .in("week_start", weekStarts),
      supabase
        .from("workout_logs")
        .select("user_id, log_date")
        .eq("room_id", roomId)
        .gte("log_date", monthStart)
        .lte("log_date", monthEnd),
      supabase
        .from("fine_exceptions")
        .select("user_id, week_start")
        .eq("room_id", roomId)
        .in("week_start", weekStarts)
        .eq("status", "approved"),
    ]);

  const profiles = (
    (members ?? []) as unknown as { profile: { id: string; nickname: string; avatar_url: string | null } }[]
  ).map((m) => m.profile);

  const goalByUserWeek = new Map<string, number>();
  for (const g of goals ?? []) {
    goalByUserWeek.set(`${g.user_id}__${g.week_start}`, g.target_days);
  }

  // 다수결로 가결된 벌금 예외 사유서는 실제 인증 없이도 그 주 달성일수에 +1로 카운트된다.
  const exceptionCreditByUserWeek = new Map<string, number>();
  for (const ex of exceptions ?? []) {
    const key = `${ex.user_id}__${ex.week_start}`;
    exceptionCreditByUserWeek.set(key, (exceptionCreditByUserWeek.get(key) ?? 0) + 1);
  }

  return (profiles ?? []).map((profile) => {
    const weeks = weekStarts.map((weekStart) => {
      const { start, end } = getWeekRangeFromStart(weekStart);
      const targetDays = goalByUserWeek.get(`${profile.id}__${weekStart}`) ?? null;
      const achievedDays =
        new Set(
          (logs ?? [])
            .filter((l) => l.user_id === profile.id && l.log_date >= start && l.log_date <= end)
            .map((l) => l.log_date)
        ).size + (exceptionCreditByUserWeek.get(`${profile.id}__${weekStart}`) ?? 0);

      const isCurrentWeek = weekStart === currentWeekStart;
      const isFutureWeek = weekStart > todayKey;
      // 이미 끝난 과거 주는 남은 요일이 0이라 목표 미달 시 그대로 확정(fined)되지만,
      // 아직 시작하지 않은 미래 주(현재 UI에서는 생성되지 않으나 방어적으로 처리)는
      // 시작 전이므로 fined로 확정하지 않는다.
      const remaining = isCurrentWeek
        ? remainingDaysInWeekIncludingToday(today)
        : isFutureWeek
          ? 7
          : 0;
      const status = computeWeeklyStatus(achievedDays, targetDays, remaining);

      return {
        weekStart,
        targetDays,
        achievedDays,
        status,
        fine: computeFineAmount(status, weeklyFine),
      };
    });

    const totalFine = weeks.reduce((sum, w) => sum + w.fine, 0);

    return { profile, totalFine, weeks };
  });
}
