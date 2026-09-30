import { useQuery } from "@tanstack/react-query";
import { forwardRef, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { EditPostSheet } from "@/components/EditPostSheet";
import { PostCard } from "@/components/PostCard";
import { CenteredModal, type CenteredModalHandle } from "@/components/ui/CenteredModal";
import { useDeleteWorkoutLog } from "@/hooks/useDeleteWorkoutLog";
import { countUniquePeople } from "@/lib/dashboard-data";
import { formatDayTitle, nowInSeoul, toDateKey } from "@/lib/date";
import { getCommentsForLogs, getReactionsForLogs } from "@/lib/social-data";
import { supabase } from "@/lib/supabase/client";
import type { WorkoutLogWithProfile } from "@/types/database";

type Props = {
  dateKey: string;
  logs: WorkoutLogWithProfile[];
  currentUserId: string;
  roomId: string;
  isToday: boolean;
  onUploadClick: () => void;
  onMutated: () => void;
};

export const DayDrawer = forwardRef<CenteredModalHandle, Props>(function DayDrawer(
  { dateKey, logs, currentUserId, roomId, isToday, onUploadClick, onMutated },
  ref
) {
  const date = new Date(`${dateKey}T00:00:00`);
  const isFuture = dateKey > toDateKey(nowInSeoul());

  const editSheetRef = useRef<CenteredModalHandle>(null);
  const [editingLog, setEditingLog] = useState<WorkoutLogWithProfile | null>(null);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const { deleteLog, busyId } = useDeleteWorkoutLog((log) => {
    setDeletedIds((prev) => new Set(prev).add(log.id));
    onMutated();
  });
  const visibleLogs = logs.filter((l) => !deletedIds.has(l.id));
  const peopleCount = countUniquePeople(visibleLogs);

  const realLogIds = visibleLogs.map((l) => l.id).filter((id) => !id.startsWith("optimistic-"));
  const realLogIdsKey = realLogIds.join(",");
  const { data: socialData } = useQuery({
    queryKey: ["socialData", realLogIdsKey, currentUserId],
    queryFn: async () => {
      if (realLogIds.length === 0) return { comments: new Map(), reactions: new Map() };
      const [comments, reactions] = await Promise.all([
        getCommentsForLogs(supabase, realLogIds),
        getReactionsForLogs(supabase, realLogIds, currentUserId),
      ]);
      return { comments, reactions };
    },
  });

  return (
    <>
      <CenteredModal ref={ref}>
        <View className="px-5 pb-3">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-[19px] font-bold tracking-tight text-foreground">{formatDayTitle(date)}</Text>
              {peopleCount > 0 && <Text className="mt-0.5 text-[13px] text-muted">{peopleCount}명이 운동을 인증했어요 🔥</Text>}
            </View>
          </View>
        </View>

        {visibleLogs.length === 0 ? (
          <View className="min-h-[400px] flex-1 items-center justify-center gap-4 px-8 pb-12">
            <Text className="text-[52px] leading-none">🏃</Text>
            <View className="items-center gap-2">
              <Text className="text-center text-[15px] font-semibold text-foreground">
                {isToday ? "오늘 첫 인증의 주인공이 되어보세요" : "이 날은 아무도 인증하지 않았어요"}
              </Text>
              {isFuture && <Text className="text-center text-[13px] text-muted">다른 날짜를 눌러 인증 기록을 확인해보세요</Text>}
            </View>
            {!isFuture && (
              <Pressable onPress={onUploadClick} className="mt-2 rounded-full bg-brand px-6 py-3 active:opacity-90">
                <Text className="text-[13px] font-semibold text-white">{isToday ? "운동 인증하기" : "이 날짜로 인증하기"}</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <ScrollView contentContainerClassName="gap-5 px-4 pb-8 pt-2">
            {visibleLogs.map((log) => (
              <PostCard
                key={log.id}
                log={log}
                currentUserId={currentUserId}
                reactionSummary={socialData?.reactions.get(log.id)}
                comments={socialData?.comments.get(log.id)}
                busy={busyId === log.id}
                onEdit={() => {
                  setEditingLog(log);
                  editSheetRef.current?.present();
                }}
                onDelete={() => deleteLog(log)}
              />
            ))}
          </ScrollView>
        )}
      </CenteredModal>

      {editingLog && (
        <EditPostSheet
          ref={editSheetRef}
          log={editingLog}
          roomId={roomId}
          onDismiss={() => setEditingLog(null)}
          onSaved={() => {
            editSheetRef.current?.dismiss();
            onMutated();
          }}
        />
      )}
    </>
  );
});
