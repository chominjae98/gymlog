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

  // getWeeklyProgress와 동일한 이유로, 네 쿼리 중 하나라도 실패하면 실제 정산액과
  // 다른 금액(대개 로그가 누락되어 더 많이 벌금이 잡히는 방향)이 조용히 표시될 수 있어
  // 절대 빈 배열로 넘기지 않고 예외를 던진다.
  const firstError = membersError ?? goalsError ?? logsError ?? exceptionsError;
  if (firstError) {
    console.error("getMonthlySettlement 조회 실패:", roomId, {
      membersError,
      goalsError,
      logsError,
      exceptionsError,
    });
    throw firstError;
  }

  const profiles = (
    (members ?? []) as unknown as { profile: { id: string; nickname: string; avatar_url: string | null } }[]
  ).map((m) => m.profile);

  const goalByUserWeek = new Map<string, number>();
  for (const g of goals ?? []) {
    goalByUserWeek.set(`${g.user_id}__${g.week_start}`, g.target_days);
  }

  // 다수결로 가결된 벌금 예외 사유서는 실제 인증 없이도 그 주 달성일수에 +1로 카운트된다.
  // 사람당 그 주에 가결될 수 있는 사유서는 최대 1건(DB 부분 유니크 인덱스로 강제됨)이므로,
  // 여기서도 +1을 넘지 않도록 캡을 둔다(getWeeklyProgress와 동일한 방어 로직).
  const exceptionCreditByUserWeek = new Set<string>();
  for (const ex of exceptions ?? []) {
    exceptionCreditByUserWeek.add(`${ex.user_id}__${ex.week_start}`);
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
        ).size + (exceptionCreditByUserWeek.has(`${profile.id}__${weekStart}`) ? 1 : 0);

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
