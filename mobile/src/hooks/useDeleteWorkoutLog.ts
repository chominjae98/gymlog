import { useState } from "react";
import { Alert } from "react-native";
import { useToast } from "@/components/ToastProvider";
import { removeWorkoutPhotos } from "@/lib/storage-upload";
import { supabase } from "@/lib/supabase/client";
import type { WorkoutLogWithProfile } from "@/types/database";

/** DayDrawer/HomeFeed가 공유하는 게시물 삭제 확인+삭제 로직. */
export function useDeleteWorkoutLog(onDeleted: (log: WorkoutLogWithProfile) => void) {
  const showToast = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);

  function deleteLog(log: WorkoutLogWithProfile) {
    Alert.alert("게시물 삭제", "이 인증 기록을 삭제할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          setBusyId(log.id);
          const { error } = await supabase.from("workout_logs").delete().eq("id", log.id);
          if (error) {
            setBusyId(null);
            showToast("삭제에 실패했어요. 다시 시도해 주세요.", "error");
            return;
          }
          await removeWorkoutPhotos(supabase, log.photo_urls);
          setBusyId(null);
          showToast("게시물을 삭제했어요");
          onDeleted(log);
        },
      },
    ]);
  }

  return { deleteLog, busyId };
}
