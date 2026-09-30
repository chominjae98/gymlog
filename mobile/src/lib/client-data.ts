import { supabase } from "@/lib/supabase/client";
import { getMonthLogs } from "@/lib/dashboard-data";

/** 달력에서 다른 달로 이동했을 때 그 달의 인증 기록을 다시 불러온다. */
export async function fetchMonthLogs(monthDate: Date, roomId: string) {
  return getMonthLogs(supabase, monthDate, roomId);
}
