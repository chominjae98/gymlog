import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays, endOfWeek, startOfWeek } from "date-fns";
import type { Database } from "@/types/database";
import { formatMonthShort, toDateKey, WEEK_OPTS } from "@/lib/date";

type Client = SupabaseClient<Database>;

export type HeatmapCell = { key: string; date: Date; inRange: boolean; achieved: boolean };

/** 히트맵에 보여줄 기간(일). 22주 x 7일 ≈ 154일, 모바일 가로 스크롤에 적당한 폭. */
export const HEATMAP_DAYS = 154;

export async function getHeatmapLogDates(
  supabase: Client,
  userId: string,
  today: Date
): Promise<Set<string>> {
  const from = new Date(today);
  from.setDate(from.getDate() - (HEATMAP_DAYS - 1));

  const { data } = await supabase
    .from("workout_logs")
    .select("log_date")
    .eq("user_id", userId)
    .gte("log_date", toDateKey(from))
    .lte("log_date", toDateKey(today));

  return new Set((data ?? []).map((r) => r.log_date));
}

/** 오늘(포함)부터 거꾸로 세어 현재 몇 일 연속 인증 중인지 (오늘 아직 안 했으면 어제부터 셈). */
export function computeCurrentStreak(logDates: Set<string>, today: Date) {
  let streak = 0;
  const cursor = new Date(today);
  if (!logDates.has(toDateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (logDates.has(toDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/**
 * 히트맵 그리드 데이터를 만든다. 월요일 시작 주 단위로 묶어서 GitHub 잔디밭처럼
 * 열(주)×행(요일) 그리드로 그릴 수 있게 하고, 주가 바뀌는 지점마다 월 라벨을 붙인다.
 */
export function buildHeatmapWeeks(logDates: Set<string>, today: Date) {
  const rangeStart = new Date(today);
  rangeStart.setDate(rangeStart.getDate() - (HEATMAP_DAYS - 1));
  const gridStart = startOfWeek(rangeStart, WEEK_OPTS);
  const gridEnd = endOfWeek(today, WEEK_OPTS);

  const weeks: HeatmapCell[][] = [];
  let week: HeatmapCell[] = [];
  for (let cursor = gridStart; cursor <= gridEnd; cursor = addDays(cursor, 1)) {
    const key = toDateKey(cursor);
    week.push({
      key,
      date: new Date(cursor),
      inRange: cursor >= rangeStart && cursor <= today,
      achieved: logDates.has(key),
    });
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) weeks.push(week);

  const monthLabels: { weekIndex: number; label: string }[] = [];
  let lastMonth = -1;
  weeks.forEach((w, i) => {
    const firstDay = w[0].date;
    if (firstDay.getMonth() !== lastMonth) {
      lastMonth = firstDay.getMonth();
      monthLabels.push({ weekIndex: i, label: formatMonthShort(firstDay) });
    }
  });

  return { weeks, monthLabels };
}

/** 조회한 기간 안에서 가장 길었던 연속 인증 일수. */
export function computeLongestStreak(logDates: Set<string>, today: Date) {
  let longest = 0;
  let current = 0;
  for (let i = HEATMAP_DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (logDates.has(toDateKey(d))) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }
  return longest;
}
