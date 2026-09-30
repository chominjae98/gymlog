import { Flame, Target } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HeaderMenu } from "@/components/HeaderMenu";
import { NotificationBell } from "@/components/NotificationBell";
import { Avatar } from "@/components/ui/Avatar";
import type { Profile } from "@/types/database";

export function Header({
  profile,
  userId,
  myGoal,
  onGoalClick,
  onHeatmapClick,
}: {
  profile: Profile;
  userId: string;
  myGoal?: number | null;
  onGoalClick?: () => void;
  onHeatmapClick: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View className="bg-background/80 px-4 pb-3" style={{ paddingTop: insets.top + 12 }}>
      <View className="flex-row items-center justify-between gap-2">
        <Pressable
          onPress={onHeatmapClick}
          accessibilityLabel="내 활동 히트맵 보기"
          className="min-w-0 flex-1 flex-row items-center gap-2.5 py-1 pr-2 active:opacity-70"
        >
          <Avatar url={profile.avatar_url} size={40} className="bg-brand-soft border border-border" />
          <Text className="shrink text-[15px] font-bold text-foreground" numberOfLines={1}>
            {profile.nickname}님
          </Text>
        </Pressable>

        <View className="shrink-0 flex-row items-center gap-1">
          <NotificationBell userId={userId} />
          <Pressable
            onPress={onHeatmapClick}
            accessibilityLabel="내 활동 히트맵"
            className="h-9 w-9 items-center justify-center rounded-full bg-surface-muted active:opacity-70"
          >
            <Flame size={16} color="#17914f" />
          </Pressable>
          {onGoalClick && (
            <Pressable
              onPress={onGoalClick}
              className="flex-row items-center gap-1 rounded-full bg-surface-muted px-3 py-2 active:opacity-70"
            >
              <Target size={13} color="#17914f" />
              <Text className="text-[12px] font-semibold text-foreground">{myGoal ? `주 ${myGoal}일` : "목표 설정"}</Text>
            </Pressable>
          )}
          <HeaderMenu />
        </View>
      </View>
    </View>
  );
}
