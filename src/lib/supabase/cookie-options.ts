/**
 * 로그아웃을 누르기 전까지 세션이 풀리지 않도록 쿠키 만료 기간을 넉넉하게(1년) 고정한다.
 * (Supabase는 refresh token으로 access token을 계속 갱신하므로, 이 쿠키만 살아있으면
 *  브라우저를 껐다 켜거나 며칠 뒤에 다시 접속해도 로그인 상태가 유지된다.)
 */
export const AUTH_COOKIE_OPTIONS = {
  maxAge: 60 * 60 * 24 * 365,
} as const;
