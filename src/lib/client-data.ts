import { createClient } from "@/lib/supabase/client";
import { getMonthLogs } from "@/lib/dashboard-data";

/** 클라이언트(브라우저)에서 특정 달의 인증 기록을 다시 불러온다 (달력 이동 시 사용) */
export async function fetchMonthLogs(monthDate: Date) {
  const supabase = createClient();
  return getMonthLogs(supabase, monthDate);
}
