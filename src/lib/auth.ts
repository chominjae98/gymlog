"use client";

import { createClient } from "@/lib/supabase/client";

/** 카카오로 로그인 시작 */
export async function signInWithKakao() {
  const supabase = createClient();
  const redirectTo = `${window.location.origin}/auth/callback`;

  await supabase.auth.signInWithOAuth({
    provider: "kakao",
    options: {
      redirectTo,
      // 카카오 앱에서 "필수 동의"로 켜둔 항목만 요청 (이메일은 요청하지 않음)
      scopes: "profile_nickname profile_image",
    },
  });
}

/** 로그아웃 (모든 클라이언트 상태를 확실히 지우기 위해 풀 리로드) */
export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.href = "/";
}
