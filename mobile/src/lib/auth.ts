import * as QueryParams from "expo-auth-session/build/QueryParams";
import { makeRedirectUri } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "@/lib/supabase/client";

WebBrowser.maybeCompleteAuthSession();

const redirectTo = makeRedirectUri({ path: "auth/callback" });

/** 카카오 로그인 콜백 URL(토큰이 담긴 딥링크)을 세션으로 교환한다. */
export async function createSessionFromUrl(url: string) {
  const { params, errorCode } = QueryParams.getQueryParams(url);
  if (errorCode) throw new Error(errorCode);

  const { access_token, refresh_token } = params;
  if (!access_token || !refresh_token) return null;

  const { data, error } = await supabase.auth.setSession({
    access_token,
    refresh_token,
  });
  if (error) throw error;
  return data.session;
}

/** 카카오로 로그인 시작. 인앱 브라우저를 열어 OAuth를 진행하고, 앱 딥링크로 돌아오면 세션을 발급한다. */
export async function signInWithKakao() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "kakao",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      // 카카오 앱에서 "필수 동의"로 켜둔 항목만 요청 (이메일은 요청하지 않음)
      scopes: "profile_nickname profile_image",
    },
  });
  if (error || !data?.url) {
    console.error("카카오 로그인 시작 실패:", error);
    throw error ?? new Error("카카오 로그인 URL을 받지 못했어요.");
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== "success") {
    // 사용자가 취소한 경우(type: "cancel"/"dismiss")는 에러 취급하지 않는다.
    return null;
  }
  return createSessionFromUrl(result.url);
}

/** 로그아웃 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) console.error("로그아웃 실패:", error);
}
