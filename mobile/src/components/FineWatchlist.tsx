import { AlertTriangle } from "lucide-react-native";
import { Text, View } from "react-native";
import { DayDots } from "@/components/DayDots";
import { Avatar } from "@/components/ui/Avatar";
import { computeFineAmount, WEEKLY_STATUS_META } from "@/lib/dashboard-data";
import type { WeeklyProgress } from "@/types/database";

/**
 * 홈 화면 상단에 노출되는 "이번 주 벌금 위기" 리스트.
 * 위기인 사람이 아무도 없을 때는 카드 자체를 표시하지 않는다.
 */
export function FineWatchlist({ progress, weeklyFine }: { progress: WeeklyProgress[]; weeklyFine: number }) {
  const atRisk = progress.filter((p) => p.status === "fined" || p.status === "at-risk");
  if (atRisk.length === 0) return null;

  return (
    <View className="overflow-hidden rounded-[28px] bg-surface shadow-sm">
      <View className="flex-row items-center gap-1.5 px-4 py-2.5">
        <AlertTriangle size={14} color="#ff6a4d" />
        <Text className="text-[13px] font-bold text-warn">이번 주 벌금 위기 {atRisk.length}명</Text>
      </View>

      <View className="px-3 pb-1">
        {atRisk.map((p) => {
          const isFined = p.status === "fined";
          const fineAmount = computeFineAmount(p.status, weeklyFine);
          return (
            <View key={p.profile.id} className="flex-row items-center gap-2.5 py-2">
              <Avatar url={p.profile.avatar_url} size={32} />
              <View className="min-w-0 flex-1">
                <View className="flex-row items-center justify-between gap-2">
                  <Text className="shrink text-[13px] font-semibold text-foreground" numberOfLines={1}>
                    {p.profile.nickname}
                  </Text>
                  <View className={`shrink-0 rounded-full px-2 py-0.5 ${isFined ? "bg-warn-soft" : "bg-amber-100"}`}>
                    <Text className={`text-[10.5px] font-bold ${isFined ? "text-warn" : "text-amber-700"}`}>
                      {isFined ? `${fineAmount.toLocaleString()}원` : WEEKLY_STATUS_META["at-risk"].label}
                    </Text>
                  </View>
                </View>
                {p.targetDays != null && (
                  <View className="mt-1.5">
                    <DayDots target={p.targetDays} achieved={p.achievedDays} tone="brand" />
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
