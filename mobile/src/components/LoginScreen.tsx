import { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { signInWithKakao } from "@/lib/auth";

export function LoginScreen() {
  const [loading, setLoading] = useState(false);

  async function handleKakaoLogin() {
    setLoading(true);
    try {
      await signInWithKakao();
    } catch (error) {
      console.error("카카오 로그인 실패:", error);
      Alert.alert("로그인 실패", "잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 justify-center px-6">
        <Text className="text-center text-[28px] font-bold leading-9 text-neutral-900">
          오늘 운동,{"\n"}
          <Text className="text-blue-600">친구들이랑 같이</Text> 인증해요
        </Text>

        <Pressable
          onPress={handleKakaoLogin}
          disabled={loading}
          className="mt-14 items-center rounded-2xl bg-[#FEE500] py-4 active:opacity-80 disabled:opacity-60"
        >
          <Text className="text-[15px] font-semibold text-[#1B1D1A]">
            {loading ? "이동 중..." : "카카오로 3초 만에 시작하기"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
