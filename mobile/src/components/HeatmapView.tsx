import { useEffect, useRef } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { WEEKDAY_LABELS } from "@/lib/date";
import type { HeatmapCell } from "@/lib/heatmap-data";

/**
 * GitHub 잔디밭 스타일로 최근 활동을 보여주는 히트맵.
 * 칸을 탭하면 그 날짜와 인증 여부를 부모(HeatmapSheet)가 캡션으로 보여줄 수 있도록
 * onSelectCell을 지원한다.
 */
export function HeatmapView({
  weeks,
  monthLabels,
  selectedKey,
  onSelectCell,
}: {
  weeks: HeatmapCell[][];
  monthLabels: { weekIndex: number; label: string }[];
  selectedKey?: string | null;
  onSelectCell?: (cell: HeatmapCell) => void;
}) {
  const labelByWeekIndex = new Map(monthLabels.map((m) => [m.weekIndex, m.label]));
  const scrollRef = useRef<ScrollView>(null);

  // 열자마자 최신(오늘 쪽, 오른쪽)이 보이도록 스크롤을 끝까지 이동해둔다.
  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: false });
  }, [weeks]);

  return (
    <ScrollView ref={scrollRef} horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-[4px] px-2 pb-1">
      <View className="gap-[4px] pr-1.5 pt-[22px]">
        {WEEKDAY_LABELS.map((label, i) => (
          <View key={label} className="h-4 w-6 justify-center">
            <Text className="text-[10px] font-medium text-muted">{i % 2 === 0 ? label : ""}</Text>
          </View>
        ))}
      </View>

      {weeks.map((week, i) => {
        const label = labelByWeekIndex.get(i);
        return (
          <View key={week[0]?.key ?? i} className="gap-[4px]">
            <Text className={`h-[18px] text-[11px] font-bold leading-[18px] ${label ? "text-foreground" : ""}`}>{label ?? ""}</Text>
            {week.map((cell) => {
              const isSelected = selectedKey === cell.key;
              return (
                <Pressable
                  key={cell.key}
                  disabled={!cell.inRange}
                  onPress={() => onSelectCell?.(cell)}
                  accessibilityLabel={cell.key}
                  className={[
                    "h-4 w-4 rounded-[4px]",
                    !cell.inRange ? "bg-transparent" : cell.achieved ? "bg-brand" : "bg-surface-muted",
                    isSelected ? "border-2 border-foreground" : "",
                  ].join(" ")}
                />
              );
            })}
          </View>
        );
      })}
    </ScrollView>
  );
}
