import { Users } from "lucide-react-native";
import { Text, View } from "react-native";
import { DayDots } from "@/components/DayDots";
import { Avatar } from "@/components/ui/Avatar";
import { computeFineAmount, WEEKLY_STATUS_META } from "@/lib/dashboard-data";
import type { WeeklyProgress } from "@/types/database";

export function FineSection({ progress, weeklyFine }: { progress: WeeklyProgress[]; weeklyFine: number }) {
  const sorted = [...progress].sort((a, b) => {
    const order = { fined: 0, "at-risk": 1, safe: 2, "no-goal": 3 };
    return order[a.status] - order[b.status];
  });

  return (
    <View className="rounded-[28px] bg-surface p-5 shadow-sm">
      <View className="mb-3.5 flex-row items-center gap-1.5">
        <Users size={15} color="#7a7d74" />
        <Text className="text-[16px] font-bold text-foreground">이번 주 현황</Text>
      </View>

      {sorted.length === 0 ? (
        <View className="items-center gap-2 rounded-2xl bg-surface-muted py-8">
          <Text className="text-2xl">👀</Text>
          <Text className="text-center text-[13px] text-muted">아직 아무도 이번 주 목표를 정하지 않았어요</Text>
        </View>
      ) : (
        <View className="gap-2">
          {sorted.map((p) => {
            const meta = WEEKLY_STATUS_META[p.status];
            const fine = computeFineAmount(p.status, weeklyFine);
            return (
              <View key={p.profile.id} className="flex-row items-center gap-3 rounded-2xl px-1 py-3">
                <Avatar url={p.profile.avatar_url} size={36} />
                <View className="min-w-0 flex-1">
                  <Text className="text-[14px] font-semibold text-foreground" numberOfLines={1}>
                    {p.profile.nickname}
                  </Text>
                  {p.targetDays != null ? (
                    <View className="mt-1.5">
                      <DayDots target={p.targetDays} achieved={p.achievedDays} tone="brand" />
                    </View>
                  ) : (
                    <Text className="mt-0.5 text-[12px] text-muted">아직 목표를 정하지 않았어요</Text>
                  )}
                </View>
                <View className="shrink-0 items-end gap-1">
                  <View className={`rounded-full px-2 py-0.5 ${meta.badgeClass}`}>
                    <Text className={`text-[11px] font-semibold ${meta.badgeClass}`}>{meta.label}</Text>
                  </View>
                  {fine > 0 && <Text className="text-[11px] font-medium text-warn">예상 벌금 {fine.toLocaleString()}원</Text>}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
