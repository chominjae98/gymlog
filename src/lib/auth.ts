"use client";

import { createClient } from "@/lib/supabase/client";

/**
 * 토스 로그인 시작. appLogin()은 실제 토스 앱(웹뷰)/샌드박스 안에서만 동작하고,
 * 일반 브라우저에서 열면 항상 실패한다 — 콘솔 등록 전까지는 이 실패가 정상이다.
 */
export async function signInWithToss() {
  try {
    const { appLogin } = await import("@apps-in-toss/web-framework");
    const { authorizationCode, referrer } = await appLogin();

    const response = await fetch("/api/auth/toss", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authorizationCode, referrer }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.message ?? "로그인에 실패했어요.");
    }

    const { access_token, refresh_token } = await response.json();
    const supabase = createClient();
    await supabase.auth.setSession({ access_token, refresh_token });
    // 로그인 직후 서버 컴포넌트가 새 세션 쿠키를 확실히 반영하도록 풀 리로드한다.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/";
  } catch (error) {
    console.error("토스 로그인 실패:", error);
    window.alert("토스 앱에서 다시 시도해 주세요.");
  }
}

/** 로그아웃 (모든 클라이언트 상태를 확실히 지우기 위해 풀 리로드) */
export async function signOut() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("로그아웃 실패:", error);
  }
  // 서버 세션 무효화가 실패했더라도, 클라이언트에 저장된 세션은 이미 정리되었으므로
  // 홈으로 이동시켜 화면 상태를 리셋한다.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.href = "/";
}
