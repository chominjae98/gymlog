import { Minus, Plus } from "lucide-react-native";
import { forwardRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { CenteredModal, type CenteredModalHandle } from "@/components/ui/CenteredModal";
import { useToast } from "@/components/ToastProvider";
import { getWeekStartKey, nowInSeoul } from "@/lib/date";
import { supabase } from "@/lib/supabase/client";

type Props = {
  userId: string;
  /** 주간 목표를 저장할 방. 방마다 따로가 아니라 사람마다 하나(홈 기준)로 통일돼 있다. */
  goalRoomId: string;
  currentGoal: number | null;
  onSaved: (targetDays: number) => void;
};

const MIN_DAYS = 1;
const MAX_DAYS = 7;

export const WeeklyGoalSheet = forwardRef<CenteredModalHandle, Props>(function WeeklyGoalSheet(
  { userId, goalRoomId, currentGoal, onSaved },
  ref
) {
  const showToast = useToast();
  const [selected, setSelected] = useState(currentGoal ?? 4);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const weekStart = getWeekStartKey(nowInSeoul());

    const { error: upsertError } = await supabase
      .from("weekly_goals")
      .upsert(
        { user_id: userId, room_id: goalRoomId, week_start: weekStart, target_days: selected },
        { onConflict: "user_id,week_start,room_id" }
      );

    setSaving(false);
    if (upsertError) {
      setError("저장에 실패했어요. 다시 시도해 주세요.");
      return;
    }
    showToast(`이번 주 목표를 주 ${selected}일로 설정했어요`);
    onSaved(selected);
  }

  return (
    <CenteredModal ref={ref}>
      <View className="px-5 pb-6 pt-2">
        <Text className="text-[17px] font-bold text-foreground">이번 주 목표</Text>
        <Text className="mt-4 text-center text-[13px] text-muted">일주일에 며칠 운동할지 정해주세요</Text>

        <View className="mt-5 flex-row items-center justify-center gap-8">
          <Pressable
            onPress={() => setSelected((v) => Math.max(MIN_DAYS, v - 1))}
            disabled={selected <= MIN_DAYS}
            accessibilityLabel="하루 줄이기"
            className="h-12 w-12 items-center justify-center rounded-full active:opacity-60 disabled:opacity-30"
          >
            <Minus size={22} color="#1b1d1a" />
          </Pressable>

          <View className="w-20 flex-row items-baseline justify-center gap-1">
            <Text className="text-[44px] font-bold leading-none text-foreground">{selected}</Text>
            <Text className="text-[44px] font-bold leading-none text-foreground">일</Text>
          </View>

          <Pressable
            onPress={() => setSelected((v) => Math.min(MAX_DAYS, v + 1))}
            disabled={selected >= MAX_DAYS}
            accessibilityLabel="하루 늘리기"
            className="h-12 w-12 items-center justify-center rounded-full active:opacity-60 disabled:opacity-30"
          >
            <Plus size={22} color="#1b1d1a" />
          </Pressable>
        </View>

        {error && <Text className="mt-3 text-center text-[12px] text-warn">{error}</Text>}

        <Pressable
          onPress={handleSave}
          disabled={saving}
          className="mt-6 items-center rounded-2xl bg-brand py-3.5 active:opacity-90 disabled:opacity-60"
        >
          <Text className="text-[15px] font-semibold text-white">{saving ? "저장 중..." : `주 ${selected}일로 목표 설정`}</Text>
        </Pressable>
      </View>
    </CenteredModal>
  );
});
