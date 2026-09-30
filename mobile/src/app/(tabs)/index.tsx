import { ActivityIndicator, View } from "react-native";
import { HomeFeed } from "@/components/HomeFeed";
import { useAuth } from "@/lib/auth-context";
import { useMyRooms, useProfile } from "@/hooks/useRooms";

/** "홈" 탭 — 로그인한 모두가 함께 쓰는 공용 방(is_default)의 인증 피드. */
export default function HomeScreen() {
  const { session } = useAuth();
  const userId = session!.user.id;
  const { data: profile, isLoading: profileLoading } = useProfile(userId);
  const { defaultRoom, isLoading: roomsLoading } = useMyRooms(userId);

  if (profileLoading || roomsLoading || !profile || !defaultRoom) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </View>
    );
  }

  return <HomeFeed userId={userId} profile={profile} room={defaultRoom} />;
}
