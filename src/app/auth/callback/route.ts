import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * 카카오 로그인 후 Supabase 가 리다이렉트 시켜주는 콜백 엔드포인트.
 * 인가 코드를 세션으로 교환하고 홈으로 보낸다.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next");
  // 오픈 리다이렉트 방지: "/"로 시작하는 사이트 내부 상대 경로만 허용한다.
  // ("//evil.com"처럼 프로토콜 없이 시작해도 브라우저가 다른 호스트로 취급하는 경로는 제외)
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error("카카오 로그인 콜백 처리 실패:", error);
  }

  return NextResponse.redirect(`${origin}/?auth_error=1`);
}
