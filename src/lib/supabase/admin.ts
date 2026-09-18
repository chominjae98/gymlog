import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * service role 키로 만드는 서버 전용 Supabase 클라이언트.
 * RLS를 우회하므로 절대 클라이언트 번들에 들어가면 안 된다 ("server-only" import로 강제).
 * 토스 로그인 세션 발급(admin.generateLink)에만 사용한다.
 */
export function createAdminClient(): SupabaseClient<Database> {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
