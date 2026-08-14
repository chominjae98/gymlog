import { createClient } from "@/lib/supabase/client";
import { getMonthRangeKeys } from "@/lib/date";
import type { WorkoutLogWithProfile } from "@/types/database";

/** 클라이언트(브라우저)에서 특정 달의 인증 기록을 다시 불러온다 (달력 이동 시 사용) */
export async function fetchMonthLogs(monthDate: Date) {
  const supabase = createClient();
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
