import { useURL } from "expo-linking";
import { router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { createSessionFromUrl } from "@/lib/auth";

/**
 * WebBrowser.openAuthSessionAsync가 이미 콜백 URL을 직접 받아 처리하지만(signInWithKakao),
 * 안드로이드 등에서 브라우저가 먼저 닫히고 앱이 딥링크로 재실행되는 경로로 돌아오는
 * 경우를 대비한 안전망. 이미 세션이 있으면 아무 것도 하지 않는다.
 */
export default function AuthCallbackScreen() {
  const url = useURL();

  useEffect(() => {
    if (!url) return;
    createSessionFromUrl(url)
      .catch((error) => console.error("로그인 콜백 처리 실패:", error))
      .finally(() => router.replace("/"));
  }, [url]);

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <ActivityIndicator />
    </View>
  );
}
