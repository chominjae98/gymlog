import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { resolveCookieOptions } from "@/lib/supabase/cookie-options";
import type { Database } from "@/types/database";

/**
 * 카카오 로그인 후 Supabase 가 리다이렉트 시켜주는 콜백 엔드포인트.
 * 인가 코드를 세션으로 교환하고 홈으로 보낸다.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next");
  // 오픈 리다이렉트 방지: "/"로 시작하는 사이트 내부 상대 경로만 허용한다.
  // ("//evil.com"처럼 프로토콜 없이 시작해도 브라우저가 다른 호스트로 취급하는 경로는 제외)
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  if (code) {
    // 인가 코드 교환으로 만들어진 세션 쿠키는 이 리다이렉트 응답에 직접 넣어야 한다.
    // 쿠키 저장소에만 쓰고 새 NextResponse를 반환하면, 일부 런타임에서는 첫 홈 요청이
    // 쿠키를 받기 전에 처리되어 로그인 화면으로 돌아갈 수 있다.
    const response = NextResponse.redirect(`${origin}${next}`);
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, resolveCookieOptions(name, value, options))
            );
          },
        },
      }
    );
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return response;
    }
    console.error("카카오 로그인 콜백 처리 실패:", error);
  }

  return NextResponse.redirect(`${origin}/?auth_error=1`);
}
