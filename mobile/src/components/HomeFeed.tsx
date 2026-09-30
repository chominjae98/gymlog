import type { CenteredModalHandle } from "@/components/ui/CenteredModal";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react-native";
import { useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { EditPostSheet } from "@/components/EditPostSheet";
import { Header } from "@/components/Header";
import { HeatmapSheet } from "@/components/HeatmapSheet";
import { PostCard } from "@/components/PostCard";
import { UploadSheet } from "@/components/UploadSheet";
import { WeeklyGoalSheet } from "@/components/WeeklyGoalSheet";
import { useDeleteWorkoutLog } from "@/hooks/useDeleteWorkoutLog";
import { useHomeFeed } from "@/hooks/useHomeFeed";
import { useMyWeeklyGoal } from "@/hooks/useRoomDashboard";
import { todayKey } from "@/lib/dashboard-data";
import { nowInSeoul } from "@/lib/date";
import type { Profile, Room, WorkoutLogWithProfile } from "@/types/database";

type Props = { userId: string; profile: Profile; room: Room };

/**
 * "홈" 탭 — 공용 방의 인증 기록을 인스타그램 피드처럼 최신순으로 보여준다.
 * 달력/이번 주 현황/주간 리포트는 여기서 뺐다(내 방 대시보드로 이동) — 여긴 피드만.
 */
export function HomeFeed({ userId, profile, room }: Props) {
  const queryClient = useQueryClient();
  const today = nowInSeoul();
  const feed = useHomeFeed(room.id, userId);
  const myGoal = useMyWeeklyGoal(userId, room.id);
  const [refreshing, setRefreshing] = useState(false);

  const uploadSheetRef = useRef<CenteredModalHandle>(null);
  const goalSheetRef = useRef<CenteredModalHandle>(null);
  const heatmapSheetRef = useRef<CenteredModalHandle>(null);
  const editSheetRef = useRef<CenteredModalHandle>(null);
  const [editingLog, setEditingLog] = useState<WorkoutLogWithProfile | null>(null);

  const { deleteLog, busyId } = useDeleteWorkoutLog((log) => {
    queryClient.setQueryData(["feed", room.id], (old: { pages: WorkoutLogWithProfile[][]; pageParams: unknown[] } | undefined) =>
      old
        ? { ...old, pages: old.pages.map((page) => page.filter((l) => l.id !== log.id)) }
        : old
    );
  });

  async function handleRefresh() {
    setRefreshing(true);
    await feed.refetch();
    setRefreshing(false);
  }

  return (
    <View className="flex-1 bg-background">
      <Header
        profile={profile}
        userId={userId}
        myGoal={myGoal.data}
        onGoalClick={() => goalSheetRef.current?.present()}
        onHeatmapClick={() => heatmapSheetRef.current?.present()}
      />

      <FlatList
        data={feed.logs}
        keyExtractor={(log) => log.id}
        contentContainerClassName="gap-5 px-4 pb-32 pt-2"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (feed.hasNextPage && !feed.isFetchingNextPage) feed.fetchNextPage();
        }}
        renderItem={({ item: log }) => (
          <PostCard
            log={log}
            currentUserId={userId}
            reactionSummary={feed.socialData?.reactions.get(log.id)}
            comments={feed.socialData?.comments.get(log.id)}
            busy={busyId === log.id}
            onEdit={() => {
              setEditingLog(log);
              editSheetRef.current?.present();
            }}
            onDelete={() => deleteLog(log)}
          />
        )}
        ListEmptyComponent={
          feed.isLoading ? (
            <View className="items-center py-16">
              <ActivityIndicator />
            </View>
          ) : (
            <View className="items-center gap-2 py-20">
              <Text className="text-[40px]">🏃</Text>
              <Text className="text-[14px] font-semibold text-foreground">아직 인증한 기록이 없어요</Text>
              <Text className="text-[12px] text-muted">가장 먼저 운동을 인증해 보세요!</Text>
            </View>
          )
        }
        ListFooterComponent={
          feed.isFetchingNextPage ? (
            <View className="py-4">
              <ActivityIndicator />
            </View>
          ) : null
        }
      />

      <Pressable
        onPress={() => uploadSheetRef.current?.present()}
        accessibilityLabel="운동 인증하기"
        className="absolute bottom-24 right-5 h-16 w-16 items-center justify-center rounded-full bg-brand shadow-lg active:opacity-90"
      >
        <Plus size={28} color="#fff" />
      </Pressable>

      <UploadSheet
        ref={uploadSheetRef}
        userId={userId}
        roomId={room.id}
        initialDateKey={todayKey(today)}
        onUploaded={() => {
          uploadSheetRef.current?.dismiss();
          feed.refetch();
        }}
      />

      <WeeklyGoalSheet
        ref={goalSheetRef}
        userId={userId}
        goalRoomId={room.id}
        currentGoal={myGoal.data ?? null}
        onSaved={() => {
          goalSheetRef.current?.dismiss();
          queryClient.invalidateQueries({ queryKey: ["myWeeklyGoal", userId, room.id] });
        }}
      />

      <HeatmapSheet ref={heatmapSheetRef} userId={userId} />

      {editingLog && (
        <EditPostSheet
          ref={editSheetRef}
          log={editingLog}
          roomId={room.id}
          onDismiss={() => setEditingLog(null)}
          onSaved={() => {
            editSheetRef.current?.dismiss();
            feed.refetch();
          }}
        />
      )}
    </View>
  );
}
