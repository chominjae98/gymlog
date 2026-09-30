import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { countUniquePeople } from "@/lib/dashboard-data";
import { formatMonthTitle, getMonthGrid, isSameMonthGuard, nowInSeoul, WEEKDAY_LABELS } from "@/lib/date";
import type { WorkoutLogWithProfile } from "@/types/database";

type Props = {
  monthDate: Date;
  onMonthChange: (date: Date) => void;
  logsByDate: Map<string, WorkoutLogWithProfile[]>;
  selectedKey: string;
  onSelectDate: (key: string) => void;
};

export function CalendarGrid({ monthDate, onMonthChange, logsByDate, selectedKey, onSelectDate }: Props) {
  const grid = getMonthGrid(monthDate);
  const canGoNext = !isSameMonthGuard(monthDate, nowInSeoul());

  return (
    <View className="overflow-hidden rounded-[28px] bg-surface px-1 pb-3 shadow-sm">
      <View className="flex-row items-center justify-between px-3 pb-2 pt-4">
        <Pressable
          onPress={() => onMonthChange(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1))}
          className="h-8 w-8 items-center justify-center rounded-full active:bg-surface-muted"
        >
          <ChevronLeft size={18} color="#7a7d74" />
        </Pressable>
        <Text className="text-[16px] font-bold tracking-tight text-foreground">{formatMonthTitle(monthDate)}</Text>
        <Pressable
          disabled={!canGoNext}
          onPress={() => onMonthChange(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1))}
          className="h-8 w-8 items-center justify-center rounded-full active:bg-surface-muted disabled:opacity-30"
        >
          <ChevronRight size={18} color="#7a7d74" />
        </Pressable>
      </View>

      <View className="flex-row px-3">
        {WEEKDAY_LABELS.map((label) => (
          <View key={label} className="flex-1 pb-2">
            <Text className="text-center text-[11px] font-semibold text-muted">{label}</Text>
          </View>
        ))}
      </View>

      <View className="flex-row flex-wrap px-3 pt-1">
        {grid.map(({ date, key, inCurrentMonth, isToday, isFuture }) => {
          const dayLogs = logsByDate.get(key) ?? [];
          const isSelected = key === selectedKey;
          const people = countUniquePeople(dayLogs);

          return (
            <Pressable
              key={key}
              disabled={isFuture}
              onPress={() => onSelectDate(key)}
              style={{ width: `${100 / 7}%` }}
              className="items-center gap-1 py-0.5"
            >
              <View
                className={[
                  "h-9 w-9 items-center justify-center rounded-full",
                  isSelected ? "bg-foreground" : isToday ? "border-2 border-brand" : "",
                  isFuture ? "opacity-30" : "",
                ].join(" ")}
              >
                <Text
                  className={[
                    "text-[13px] font-semibold",
                    isSelected
                      ? "text-background"
                      : isToday
                        ? "text-brand-strong"
                        : inCurrentMonth
                          ? "text-foreground"
                          : "text-muted/35",
                  ].join(" ")}
                >
                  {date.getDate()}
                </Text>
              </View>
              <View className="h-3 flex-row items-center justify-center gap-0.5">
                {people > 0 &&
                  Array.from({ length: Math.min(people, 3) }).map((_, i) => (
                    <View key={i} className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-foreground" : "bg-brand"}`} />
                  ))}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
