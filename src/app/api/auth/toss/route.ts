import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { resolveCookieOptions } from "@/lib/supabase/cookie-options";
import { buildCorsHeaders } from "@/lib/cors";
import { TOSS_LOGIN_CONFIGURED } from "@/lib/toss/config";
import { generateTossToken, getTossLoginMe, TossApiError } from "@/lib/toss/client";
import { mintSupabaseSessionForTossUser } from "@/lib/toss/session";
import type { Database } from "@/types/database";

// mTLS 클라이언트 인증서를 쓰려면 Node.js 런타임이 필요하다 (Edge 런타임 불가).
export const runtime = "nodejs";

/**
 * 클라이언트가 appLogin()으로 받은 authorizationCode를 넘기면,
 * 토스 서버와 mTLS로 통신해 사용자를 식별하고 Supabase 세션을 발급한다.
 * 세션은 (a) 현재 Next.js UI가 계속 쓸 수 있도록 쿠키에도 심고,
 * (b) 쿠키를 못 쓰는(서드파티 쿠키 차단) 미래의 미니앱 SPA를 위해 JSON으로도 반환한다.
 */
export async function POST(request: NextRequest) {
  const corsHeaders = buildCorsHeaders(request.headers.get("origin"));

  if (!TOSS_LOGIN_CONFIGURED) {
    return NextResponse.json(
      { error: "toss_login_not_configured", message: "토스 로그인 mTLS 인증서가 아직 설정되지 않았어요." },
      { status: 503, headers: corsHeaders }
    );
  }

  let body: { authorizationCode?: string; referrer?: "DEFAULT" | "SANDBOX" };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_request", message: "요청 본문을 읽을 수 없어요." },
      { status: 400, headers: corsHeaders }
    );
  }
  if (!body.authorizationCode || !body.referrer) {
    return NextResponse.json(
      { error: "invalid_request", message: "authorizationCode와 referrer가 필요해요." },
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    const { accessToken } = await generateTossToken({
      authorizationCode: body.authorizationCode,
      referrer: body.referrer,
    });
    const tossUser = await getTossLoginMe(accessToken);
    const session = await mintSupabaseSessionForTossUser(tossUser);

    const response = NextResponse.json(
      {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_in: session.expires_in,
        token_type: session.token_type,
        user: session.user,
      },
      { headers: corsHeaders }
    );

    // 기존 Next.js UI(쿠키 기반)도 이번 로그인으로 바로 갱신되도록 세션 쿠키를 함께 심는다.
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (cookiesToSet) =>
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, resolveCookieOptions(name, value, options))
            ),
        },
      }
    );
    await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });

    return response;
  } catch (error) {
    if (error instanceof TossApiError) {
      console.error("토스 로그인 실패:", error.message, error.errorCode);
      return NextResponse.json(
        { error: "toss_auth_failed", message: error.message },
        { status: 400, headers: corsHeaders }
      );
    }
    console.error("토스 로그인 처리 중 오류:", error);
    return NextResponse.json(
      { error: "internal_error", message: "로그인 처리 중 문제가 발생했어요." },
      { status: 500, headers: corsHeaders }
    );
  }
}

export function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: buildCorsHeaders(request.headers.get("origin")) });
}
