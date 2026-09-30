import { ActivityIndicator, View } from "react-native";
import { RoomsTab } from "@/components/RoomsTab";
import { useAuth } from "@/lib/auth-context";
import { useProfile } from "@/hooks/useRooms";

export default function RoomsScreen() {
  const { session } = useAuth();
  const userId = session!.user.id;
  const { data: profile, isLoading } = useProfile(userId);

  if (isLoading || !profile) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </View>
    );
  }

  return <RoomsTab userId={userId} profile={profile} />;
}
