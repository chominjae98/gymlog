import { Stack, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { Dashboard } from "@/components/Dashboard";
import { useAuth } from "@/lib/auth-context";
import { useMyRooms, useProfile } from "@/hooks/useRooms";

// 이 화면만 (탭 목록엔 없는) 뒤로가기 수단이 필요해 네이티브 헤더를 켠다 — 화면
// 자체 Header 컴포넌트(닉네임/알림 행)엔 뒤로가기 버튼이 없어서 iOS에선 이거 없이
// 되돌아갈 방법이 없다. 다만 기본 스타일(흰 배경, 굵은 검정 타이틀, 진한 구분선)을
// 그대로 두면 화면 자체 Header와 이질적으로 겹쳐 보이므로, 앱 배경/글자색에 맞추고
// 그림자를 지워 두 헤더가 한 덩어리로 보이게 한다.
const ROOM_HEADER_STYLE = {
  headerShown: true as const,
  headerStyle: { backgroundColor: "#faf9f5" },
  headerTintColor: "#1b1d1a",
  headerTitleStyle: { color: "#1b1d1a", fontSize: 15, fontWeight: "700" as const },
  headerShadowVisible: false,
};

/** 친구들끼리 따로 만든 방 하나의 전용 대시보드. "내 방" 탭에서 방을 고르면 이 화면으로 이동한다. */
export default function RoomDetailScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const { session } = useAuth();
  const userId = session!.user.id;
  const { data: profile, isLoading: profileLoading } = useProfile(userId);
  const { rooms, defaultRoom, isLoading: roomsLoading } = useMyRooms(userId);
  const room = rooms.find((r) => r.id === roomId);

  if (profileLoading || roomsLoading || !profile || !room) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Stack.Screen options={{ ...ROOM_HEADER_STYLE, title: "" }} />
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ ...ROOM_HEADER_STYLE, title: room.name }} />
      <Dashboard userId={userId} profile={profile} room={room} goalRoomId={defaultRoom?.id ?? null} />
    </>
  );
}
