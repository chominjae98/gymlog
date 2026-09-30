import { useQuery } from "@tanstack/react-query";
import { Trophy } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Avatar } from "@/components/ui/Avatar";
import { getLeaderboard, type LeaderboardPeriod } from "@/lib/rooms-data";
import { supabase } from "@/lib/supabase/client";

const PODIUM_RANK_STYLE = [
  { ring: "border-[#e0b23c]", badge: "bg-[#e0b23c]", size: 72 },
  { ring: "border-[#adb2bd]", badge: "bg-[#adb2bd]", size: 56 },
  { ring: "border-[#c98a56]", badge: "bg-[#c98a56]", size: 56 },
] as const;
const PODIUM_ORDER = [1, 0, 2]; // 2등-1등-3등 순으로 배치

const PERIOD_TABS: { key: LeaderboardPeriod; label: string }[] = [
  { key: "week", label: "주간" },
  { key: "month", label: "월간" },
  { key: "all", label: "전체" },
];

/** 전체 이용자 랭킹. "홈"에서의 누적 인증 일수 기준으로 전체 이용자 중 내 순위를 보여준다. */
export function LeaderboardView({ currentUserId }: { currentUserId: string }) {
  const [period, setPeriod] = useState<LeaderboardPeriod>("week");
  const { data: entries, isLoading, isError } = useQuery({
    queryKey: ["leaderboard", period],
    queryFn: () => getLeaderboard(supabase, period),
  });

  const top3 = entries?.slice(0, 3) ?? [];
  const rest = entries?.slice(3) ?? [];
  const myRank = entries ? entries.findIndex((e) => e.user_id === currentUserId) + 1 : 0;

  return (
    <View className="flex-1 bg-background">
      <View className="px-4 pb-3 pt-14">
        <Text className="text-[19px] font-bold text-foreground">전체 랭킹</Text>
      </View>

      <ScrollView contentContainerClassName="px-4 pt-3 pb-28">
        <View className="mb-4 flex-row gap-1 rounded-full bg-surface-muted p-1">
          {PERIOD_TABS.map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => setPeriod(tab.key)}
              className={`flex-1 items-center rounded-full py-2 ${period === tab.key ? "bg-surface" : ""}`}
            >
              <Text className={`text-[12.5px] font-semibold ${period === tab.key ? "text-foreground" : "text-muted"}`}>{tab.label}</Text>
            </Pressable>
          ))}
        </View>

        {isError ? (
          <View className="h-40 items-center justify-center gap-1">
            <Text className="text-center text-[13px] text-muted">랭킹을 불러오지 못했어요.{"\n"}잠시 후 다시 시도해 주세요.</Text>
          </View>
        ) : isLoading ? (
          <View className="gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <View key={i} className="h-14 rounded-2xl bg-surface-muted" />
            ))}
          </View>
        ) : entries && entries.length === 0 ? (
          <View className="h-40 items-center justify-center gap-1.5">
            <Text className="text-[28px]">🏆</Text>
            <Text className="text-[13px] text-muted">
              {period === "week" ? "아직 이번 주 랭킹에 오른 사람이 없어요" : period === "month" ? "아직 이번 달 랭킹에 오른 사람이 없어요" : "아직 랭킹에 오른 사람이 없어요"}
            </Text>
          </View>
        ) : (
          <>
            {top3.length > 0 && (
              <View className="mb-6 flex-row items-end justify-center gap-3 pt-2">
                {PODIUM_ORDER.filter((i) => i < top3.length).map((i) => {
                  const entry = top3[i];
                  const style = PODIUM_RANK_STYLE[i];
                  const isMe = entry.user_id === currentUserId;
                  return (
                    <View key={entry.user_id} className="items-center gap-1.5">
                      <View className="relative">
                        <Avatar url={entry.avatar_url} size={style.size} className={`bg-surface-muted border-[3px] ${style.ring}`} />
                        <View className={`absolute -bottom-1 left-1/2 h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full border-2 border-surface ${style.badge}`}>
                          <Trophy size={12} color="#fff" fill="#fff" />
                        </View>
                      </View>
                      <Text className="mt-1 max-w-[72px] text-center text-[12.5px] font-semibold text-foreground" numberOfLines={1}>
                        {entry.nickname}
                        {isMe && <Text className="text-brand-strong"> · 나</Text>}
                      </Text>
                      <Text className="text-[11px] font-bold text-muted">{entry.total_days}일</Text>
                    </View>
                  );
                })}
              </View>
            )}

            {rest.length > 0 && (
              <View className="divide-y divide-border rounded-[24px] bg-surface px-4 shadow-sm">
                {rest.map((entry, index) => {
                  const rank = index + 4;
                  const isMe = entry.user_id === currentUserId;
                  return (
                    <View key={entry.user_id} className="flex-row items-center gap-3 py-3">
                      <Text className="w-5 text-center text-[13px] font-bold text-muted">{rank}</Text>
                      <Avatar url={entry.avatar_url} size={36} className="bg-surface-muted" />
                      <Text className="min-w-0 flex-1 text-[14px] font-semibold text-foreground" numberOfLines={1}>
                        {entry.nickname}
                        {isMe && <Text className="ml-1.5 text-[11px] font-medium text-brand-strong"> 나</Text>}
                      </Text>
                      <Text className="shrink-0 text-[13px] font-bold text-foreground">{entry.total_days}일</Text>
                    </View>
                  );
                })}
              </View>
            )}

            {myRank > 3 && (
              <View className="mt-4 items-center">
                <View className="rounded-full bg-foreground px-4 py-2.5">
                  <Text className="text-[12.5px] font-semibold text-background">내 순위 {myRank}위</Text>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
