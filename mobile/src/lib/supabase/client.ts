import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";
import type { Database } from "@/types/database";

// AsyncStorage의 웹 구현은 window.localStorage를 직접 건드리는데, Expo Router의
// 정적 웹 출력은 Node(SSR) 환경에서 이 모듈을 먼저 평가한다 — window가 없는 그
// 시점에 접근하면 개발 서버 프로세스 자체가 죽는다. 실제 타깃(iOS/Android)에는
// SSR이 없어 원래 문제되지 않지만, 이 샌드박스에서 웹 프리뷰로 스모크 테스트를
// 하려면 서버사이드에서는 그냥 빈 값을 돌려주는 안전한 어댑터가 필요하다.
const isServer = typeof window === "undefined" && Platform.OS === "web";
const storage = isServer
  ? {
      getItem: async () => null,
      setItem: async () => {},
      removeItem: async () => {},
    }
  : AsyncStorage;

/**
 * RN에는 서버 컴포넌트/쿠키 개념이 없으므로 웹앱의 client/server/middleware
 * 3분할 구조 대신 세션을 AsyncStorage에 영속시키는 클라이언트 하나만 둔다.
 */
export const supabase = createClient<Database>(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

// 앱이 백그라운드로 가면 자동 토큰 갱신 타이머를 멈추고, 포그라운드로 돌아오면
// 다시 돌린다 (Supabase RN 가이드 권장 패턴) — 안 하면 백그라운드에서도 계속
// 갱신을 시도하다 배터리를 소모하거나, 오래 백그라운드에 있다가 돌아왔을 때
// 세션이 갱신 타이밍을 놓쳐 만료된 채로 남는 경우가 생긴다.
if (!isServer) {
  AppState.addEventListener("change", (state) => {
    if (state === "active") {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
