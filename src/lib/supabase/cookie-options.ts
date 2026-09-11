import type { CookieOptions } from "@supabase/ssr";

/**
 * 로그아웃을 누르기 전까지 세션이 풀리지 않도록, "세션을 유지하는" 쿠키의 만료 기간만
 * 넉넉하게(1년) 고정한다.
 * (Supabase는 refresh token으로 access token을 계속 갱신하므로, 이 쿠키만 살아있으면
 *  브라우저를 껐다 켜거나 며칠 뒤에 다시 접속해도 로그인 상태가 유지된다.)
 */
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** 로그인 흐름 중에만 잠깐 쓰이는 PKCE 코드 검증기류 쿠키 (오래 남아있으면 안 되는 1회성 값). */
function isTransientAuthCookie(name: string) {
  return name.includes("-code-verifier");
}

/**
 * @supabase/ssr가 넘겨주는 쿠키 옵션에 세션 유지용 만료 기간을 적용할지 계산한다.
 *
 * - 라이브러리가 쿠키를 지우려는 경우(빈 값 또는 maxAge<=0)에는 절대 건드리지 않는다.
 *   여기서 maxAge를 1년으로 덮어쓰면 "쿠키 삭제" 요청이 "1년짜리 빈 쿠키로 갱신"이
 *   되어버려 로그아웃해도 쿠키가 브라우저에 남는다.
 * - PKCE code-verifier처럼 로그인 흐름 중에만 쓰는 1회성 쿠키도 그대로 둔다.
 * - 그 외(세션을 구성하는 쿠키)에는 만료 기간을 1년으로 고정한다.
 */
export function resolveCookieOptions(
  name: string,
  value: string,
  options: CookieOptions | undefined
): CookieOptions {
  const isRemoval = !value || (options?.maxAge != null && options.maxAge <= 0);
  if (isRemoval || isTransientAuthCookie(name)) {
    return options ?? {};
  }
  return { ...options, maxAge: AUTH_COOKIE_MAX_AGE };
}
