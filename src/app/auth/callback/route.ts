import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * 카카오 로그인 후 Supabase 가 리다이렉트 시켜주는 콜백 엔드포인트.
 * 인가 코드를 세션으로 교환하고 홈으로 보낸다.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/?auth_error=1`);
}
