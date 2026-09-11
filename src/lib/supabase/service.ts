import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * 크론(서버 전용) 라우트에서만 쓰는 service role 클라이언트. RLS를 우회해서
 * 모든 사용자의 구독 정보/기록을 읽어야 알림을 발송할 수 있기 때문이다.
 * 절대 클라이언트 컴포넌트나 브라우저로 값을 내려보내면 안 된다.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
