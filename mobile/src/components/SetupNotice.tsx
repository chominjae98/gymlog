import { Text, View } from "react-native";

export function SetupNotice() {
  return (
    <View className="flex-1 items-center justify-center gap-3 bg-background px-8">
      <Text className="text-3xl">🛠️</Text>
      <Text className="text-center text-[18px] font-bold text-foreground">Supabase 연결이 필요해요</Text>
      <Text className="max-w-xs text-center text-[13px] leading-relaxed text-muted">
        .env.local 에 EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY 값을 채워 넣고 앱을 다시 시작해 주세요.
      </Text>
    </View>
  );
}
