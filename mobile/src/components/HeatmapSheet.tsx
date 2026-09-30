import { useQuery } from "@tanstack/react-query";
import { Flame, X } from "lucide-react-native";
import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { HeatmapView } from "@/components/HeatmapView";
import { CenteredModal, type CenteredModalHandle } from "@/components/ui/CenteredModal";
import { formatDayTitle, nowInSeoul } from "@/lib/date";
import {
  buildHeatmapWeeks,
  computeCurrentStreak,
  computeLongestStreak,
  getHeatmapLogDates,
  getTotalLogDays,
  type HeatmapCell,
} from "@/lib/heatmap-data";
import { supabase } from "@/lib/supabase/client";

export const HeatmapSheet = forwardRef<CenteredModalHandle, { userId: string }>(function HeatmapSheet(
  { userId },
  ref
) {
  const modalRef = useRef<CenteredModalHandle>(null);
  useImperativeHandle(ref, () => modalRef.current!);

  const today = nowInSeoul();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["heatmap", userId],
    queryFn: async () => {
      const [logDates, totalDays] = await Promise.all([
        getHeatmapLogDates(supabase, userId, today),
        getTotalLogDays(supabase, userId),
      ]);
      return { logDates, totalDays };
    },
  });

  const logDates = data?.logDates ?? null;
  const { weeks, monthLabels } = logDates ? buildHeatmapWeeks(logDates, today) : { weeks: [], monthLabels: [] };
  const todayTs = new Date(today).setHours(0, 0, 0, 0);
  const [selectedCell, setSelectedCell] = useState<HeatmapCell | null>(null);
  const effectiveSelected = selectedCell ?? weeks.flat().find((cell) => cell.date.getTime() === todayTs) ?? null;

  const currentStreak = logDates ? computeCurrentStreak(logDates, today) : 0;
  const longestStreak = logDates ? computeLongestStreak(logDates, today) : 0;

  return (
    <CenteredModal ref={modalRef}>
      <ScrollView contentContainerClassName="px-5 pb-8 pt-5">
        <View className="mb-1 flex-row items-center justify-between">
          <View className="flex-row items-center gap-1.5">
            <Flame size={17} color="#17914f" />
            <Text className="text-[17px] font-bold text-foreground">내 활동 히트맵</Text>
          </View>
          <Pressable onPress={() => modalRef.current?.dismiss()} className="h-8 w-8 items-center justify-center rounded-full active:bg-surface-muted">
            <X size={18} color="#7a7d74" />
          </Pressable>
        </View>

        {isError ? (
          <View className="h-40 items-center justify-center gap-1">
            <Text className="text-center text-[13px] text-muted">히트맵을 불러오지 못했어요.{"\n"}잠시 후 다시 열어봐 주세요.</Text>
          </View>
        ) : isLoading ? (
          <View className="h-40 items-center justify-center">
            <ActivityIndicator />
          </View>
        ) : (
          <>
            <View className="mt-4 flex-row gap-2">
              <StatCard label="연속 인증" value={`${currentStreak}일`} emphasize />
              <StatCard label="최장 기록" value={`${longestStreak}일`} />
              <StatCard label="누적 인증" value={`${data?.totalDays ?? 0}일`} />
            </View>

            <View className="mt-5 rounded-[24px] bg-surface p-4 shadow-sm">
              <HeatmapView weeks={weeks} monthLabels={monthLabels} selectedKey={effectiveSelected?.key} onSelectCell={setSelectedCell} />

              <View className="mt-3 gap-1.5">
                <Text className="text-[12.5px] font-medium text-foreground">
                  {effectiveSelected
                    ? `${formatDayTitle(effectiveSelected.date)} · ${effectiveSelected.achieved ? "인증했어요 🔥" : "인증 안 함"}`
                    : "칸을 눌러 날짜를 확인해보세요"}
                </Text>
                <View className="flex-row items-center justify-end gap-3">
                  <View className="flex-row items-center gap-1">
                    <View className="h-[11px] w-[11px] rounded-[3px] bg-surface-muted" />
                    <Text className="text-[10px] text-muted">인증 안 함</Text>
                  </View>
                  <View className="flex-row items-center gap-1">
                    <View className="h-[11px] w-[11px] rounded-[3px] bg-brand" />
                    <Text className="text-[10px] text-muted">인증함</Text>
                  </View>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </CenteredModal>
  );
});

function StatCard({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <View className={`flex-1 items-center gap-0.5 rounded-2xl py-3.5 ${emphasize ? "bg-brand-soft" : "bg-surface-muted"}`}>
      <Text className={`text-[18px] font-bold ${emphasize ? "text-brand-strong" : "text-foreground"}`}>{value}</Text>
      <Text className="text-[11px] text-muted">{label}</Text>
    </View>
  );
}
