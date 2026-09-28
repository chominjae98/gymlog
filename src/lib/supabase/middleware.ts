import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { resolveCookieOptions } from "@/lib/supabase/cookie-options";

/**
 * 모든 요청마다 Supabase 세션(쿠키)을 갱신한다.
 * 만료된 access token 을 refresh token 으로 자동 재발급해 로그인 유지.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, resolveCookieOptions(name, value, options))
          );
        },
      },
    }
  );

  // 세션 refresh 트리거 (반드시 호출해야 함)
  const { error } = await supabase.auth.getUser();
  // "AuthSessionMissingError"는 쿠키가 아예 없는(=로그인 전) 정상적인 상태이므로 로그를
  // 남기지 않는다. 쿠키는 있었는데 검증/갱신 자체가 실패한 경우만 추적한다.
  if (error && error.name !== "AuthSessionMissingError") {
    console.error(
      "proxy: 세션 refresh 실패:",
      request.nextUrl.pathname,
      error.name,
      error.message,
      error.status
    );
  }

  return supabaseResponse;
}
