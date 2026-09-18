import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TossLoginMeResponse } from "@/lib/toss/client";

/**
 * userKey로 결정되는 고정 이메일. auth.users 를 이 이메일로 조회/생성하므로
 * 같은 토스 사용자는 항상 같은 auth.users row 로 매핑된다(실제로 발송되지 않음).
 */
function syntheticEmailFor(userKey: number) {
  return `toss-${userKey}@toss.oowanwan.local`;
}

/**
 * 토스에서 검증된 사용자를 실제 Supabase 세션으로 바꾼다.
 *
 * admin.generateLink({ type: "magiclink" })는 해당 이메일의 유저가 없으면 새로
 * 만들면서 options.data 를 user_metadata 로 저장하고(schema.sql의 handle_new_user
 * 트리거가 이를 읽어 profiles row를 만든다), 있으면 그대로 링크만 발급한다 —
 * 그래서 별도로 "이미 있는 유저인지" 조회할 필요가 없다.
 * 그 뒤 verifyOtp로 발급된 token_hash를 바로 교환해 실제 세션을 얻는다
 * (이메일을 실제로 보내지 않고, 서버 안에서 발급→교환을 한 번에 끝낸다).
 */
export async function mintSupabaseSessionForTossUser(
  tossUser: Pick<TossLoginMeResponse, "userKey" | "name">
) {
  const supabase = createAdminClient();
  const email = syntheticEmailFor(tossUser.userKey);

  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: {
      data: {
        toss_user_key: String(tossUser.userKey),
        full_name: tossUser.name ?? undefined,
      },
    },
  });
  if (linkError || !linkData.properties) {
    throw linkError ?? new Error("토스 로그인 세션 링크 발급에 실패했어요.");
  }

  const { data: sessionData, error: verifyError } = await supabase.auth.verifyOtp({
    type: "email",
    token_hash: linkData.properties.hashed_token,
  });
  if (verifyError || !sessionData.session) {
    throw verifyError ?? new Error("토스 로그인 세션 교환에 실패했어요.");
  }

  return sessionData.session;
}
