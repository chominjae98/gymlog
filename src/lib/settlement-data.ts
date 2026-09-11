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
  weeklyFine: number
): Promise<MonthlySettlement[]> {
  const weekStarts = getWeekStartsInMonth(monthDate);
  const { start: monthStart, end: monthEnd } = getMonthRangeKeys(monthDate);
  const todayKey = toDateKey(today);
  const currentWeekStart = weekStarts.find((ws) => {
    const { start, end } = getWeekRangeFromStart(ws);
    return todayKey >= start && todayKey <= end;
  });

  const [{ data: profiles }, { data: goals }, { data: logs }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, nickname, avatar_url")
      .order("created_at", { ascending: true }),
    supabase
      .from("weekly_goals")
      .select("user_id, week_start, target_days")
      .in("week_start", weekStarts),
    supabase
      .from("workout_logs")
      .select("user_id, log_date")
      .gte("log_date", monthStart)
      .lte("log_date", monthEnd),
  ]);

  const goalByUserWeek = new Map<string, number>();
  for (const g of goals ?? []) {
    goalByUserWeek.set(`${g.user_id}__${g.week_start}`, g.target_days);
  }

  return (profiles ?? []).map((profile) => {
    const weeks = weekStarts.map((weekStart) => {
      const { start, end } = getWeekRangeFromStart(weekStart);
      const targetDays = goalByUserWeek.get(`${profile.id}__${weekStart}`) ?? null;
      const achievedDays = new Set(
        (logs ?? [])
          .filter((l) => l.user_id === profile.id && l.log_date >= start && l.log_date <= end)
          .map((l) => l.log_date)
      ).size;

      const isCurrentWeek = weekStart === currentWeekStart;
      const remaining = isCurrentWeek ? remainingDaysInWeekIncludingToday(today) : 0;
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
