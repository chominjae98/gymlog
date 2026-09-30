import type { CenteredModalHandle } from "@/components/ui/CenteredModal";
import * as Linking from "expo-linking";
import { Plus, Receipt, Send } from "lucide-react-native";
import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { CalendarGrid } from "@/components/CalendarGrid";
import { DayDrawer } from "@/components/DayDrawer";
import { ExceptionRequestSheet } from "@/components/ExceptionRequestSheet";
import { FineExceptionPanel } from "@/components/FineExceptionPanel";
import { FineSection } from "@/components/FineSection";
import { FineWatchlist } from "@/components/FineWatchlist";
import { Header } from "@/components/Header";
import { HeatmapSheet } from "@/components/HeatmapSheet";
import { SettlementSheet } from "@/components/SettlementSheet";
import { UploadSheet } from "@/components/UploadSheet";
import { WeeklyGoalSheet } from "@/components/WeeklyGoalSheet";
import { WeeklyReport } from "@/components/WeeklyReport";
import { useToast } from "@/components/ToastProvider";
import { countUniquePeople, groupLogsByDate, todayKey } from "@/lib/dashboard-data";
import { formatMonthTitle, nowInSeoul } from "@/lib/date";
import { buildTossTransferLink } from "@/lib/toss-transfer";
import { useInvalidateRoomDashboard, useMonthLogs, useRoomDashboard } from "@/hooks/useRoomDashboard";
import type { Profile, Room } from "@/types/database";

type Props = {
  userId: string;
  profile: Profile;
  room: Room;
  /** 주간 목표를 저장/조회할 방(=홈). null이면 목표 설정 UI 자체를 숨긴다. */
  goalRoomId: string | null;
};

/** "내 방" 대시보드 — 친구들끼리 따로 만든 방 하나의 오늘 현황/주간 리포트/벌금/달력. */
export function Dashboard({ userId, profile, room, goalRoomId }: Props) {
  const roomId = room.id;
  const showToast = useToast();
  const today = nowInSeoul();
  const tKey = todayKey(today);
  const weeklyFine = room.fine_per_day;
  const effectiveGoalRoomId = goalRoomId ?? roomId;

  const [monthDate, setMonthDate] = useState(today);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [uploadDateKey, setUploadDateKey] = useState(tKey);

  const dashboard = useRoomDashboard(userId, roomId, effectiveGoalRoomId, monthDate, true);
  // 달력에서 다른 달을 보고 있어도 "오늘 인증 현황" 카드는 항상 오늘 기준으로 정확해야 한다.
  const todayLogsQuery = useMonthLogs(roomId, today);
  const invalidate = useInvalidateRoomDashboard();

  const drawerRef = useRef<CenteredModalHandle>(null);
  const goalSheetRef = useRef<CenteredModalHandle>(null);
  const uploadSheetRef = useRef<CenteredModalHandle>(null);
  const heatmapSheetRef = useRef<CenteredModalHandle>(null);
  const settlementSheetRef = useRef<CenteredModalHandle>(null);
  const exceptionSheetRef = useRef<CenteredModalHandle>(null);

  function handleMutated() {
    invalidate(roomId);
  }

  function handleGoPayFine() {
    if (!room.settlement_bank || !room.settlement_account_no) return;
    const link = buildTossTransferLink(room.settlement_bank, room.settlement_account_no, weeklyFine);
    if (!link) return;
    Linking.openURL(link).catch(() => showToast("토스 앱이 설치되어 있지 않은 것 같아요.", "error"));
  }

  async function handleRefresh() {
    setRefreshing(true);
    invalidate(roomId);
    setTimeout(() => setRefreshing(false), 600);
  }

  const monthLogsByDate = groupLogsByDate(dashboard.monthLogs);
  const todayLogsByDate = groupLogsByDate(todayLogsQuery.data ?? []);
  const todayLogs = todayLogsByDate.get(tKey) ?? [];
  const todayLogsCount = countUniquePeople(todayLogs);

  const drawerLogs = selectedKey ? monthLogsByDate.get(selectedKey) ?? todayLogsByDate.get(selectedKey) ?? [] : [];
  const myStatus = dashboard.weeklyProgress.find((p) => p.profile.id === userId)?.status;

  function openUpload(dateKey: string) {
    setUploadDateKey(dateKey);
    uploadSheetRef.current?.present();
  }

  function openDay(key: string) {
    setSelectedKey(key);
    drawerRef.current?.present();
  }

  if (dashboard.isError) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-background px-6">
        <Text className="text-center text-[13px] text-muted">정보를 불러오지 못했어요.</Text>
        <Pressable onPress={handleMutated} className="rounded-full bg-surface-muted px-4 py-2 active:opacity-70">
          <Text className="text-[12px] font-bold text-foreground">다시 시도</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <Header
        profile={profile}
        userId={userId}
        myGoal={goalRoomId ? dashboard.myGoal : undefined}
        onGoalClick={goalRoomId ? () => goalSheetRef.current?.present() : undefined}
        onHeatmapClick={() => heatmapSheetRef.current?.present()}
        underNativeHeader
      />

      <ScrollView
        contentContainerClassName="gap-5 px-4 pb-32 pt-2"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {dashboard.isLoading ? (
          <View className="items-center py-16">
            <ActivityIndicator />
          </View>
        ) : (
          <>
            <Pressable
              onPress={() => settlementSheetRef.current?.present()}
              className="flex-row items-center justify-between rounded-[28px] bg-surface px-4 py-3.5 shadow-sm active:opacity-90"
            >
              <View className="flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-warn-soft">
                  <Receipt size={18} color="#ff6a4d" />
                </View>
                <View>
                  <Text className="text-[13px] font-semibold text-foreground">{formatMonthTitle(monthDate)} 정산 요약</Text>
                  <Text className="mt-0.5 text-[12px] text-muted">벌금 얼마 모였는지 한눈에 보기</Text>
                </View>
              </View>
              <View className="shrink-0 rounded-full bg-surface-muted px-3 py-1.5">
                <Text className="text-[12px] font-bold text-foreground">보기</Text>
              </View>
            </Pressable>

            {room.settlement_bank && room.settlement_account_no && weeklyFine > 0 && (
              <Pressable
                onPress={handleGoPayFine}
                className="flex-row items-center justify-center gap-1.5 rounded-2xl bg-[#0064FF] py-3.5 active:opacity-90"
              >
                <Send size={15} color="#fff" />
                <Text className="text-[14px] font-semibold text-white">벌금 내러가기</Text>
              </Pressable>
            )}

            <Pressable
              onPress={() => openDay(tKey)}
              className="flex-row items-center justify-between gap-3 rounded-[28px] bg-surface px-4 py-3.5 shadow-sm active:opacity-90"
            >
              <View className="min-w-0 flex-1">
                <Text className="text-[13px] font-semibold text-foreground">오늘 인증 현황</Text>
                <Text className="mt-0.5 text-[12px] text-muted">
                  {todayLogsCount > 0 ? `${todayLogsCount}명이 오늘 운동을 인증했어요` : "아직 오늘 인증한 사람이 없어요"}
                </Text>
              </View>
              <View className="shrink-0 rounded-full bg-brand-soft px-3 py-1.5">
                <Text className="text-[12px] font-bold text-brand-strong">보기</Text>
              </View>
            </Pressable>

            <WeeklyReport progress={dashboard.weeklyProgress} currentUserId={userId} />

            <FineWatchlist progress={dashboard.weeklyProgress} weeklyFine={weeklyFine} />
            <FineExceptionPanel
              exceptions={dashboard.exceptions}
              currentUserId={userId}
              totalMembers={dashboard.roomMemberCount}
              myStatus={myStatus}
              onRequestClick={() => exceptionSheetRef.current?.present()}
              onMutated={handleMutated}
            />

            <CalendarGrid
              monthDate={monthDate}
              onMonthChange={setMonthDate}
              logsByDate={monthLogsByDate}
              selectedKey={selectedKey ?? ""}
              onSelectDate={openDay}
            />

            <FineSection progress={dashboard.weeklyProgress} weeklyFine={weeklyFine} />
          </>
        )}
      </ScrollView>

      <Pressable
        onPress={() => openUpload(tKey)}
        accessibilityLabel="운동 인증하기"
        className="absolute bottom-24 right-5 h-16 w-16 items-center justify-center rounded-full bg-brand shadow-lg active:opacity-90"
      >
        <Plus size={28} color="#fff" />
      </Pressable>

      <DayDrawer
        ref={drawerRef}
        dateKey={selectedKey ?? tKey}
        logs={drawerLogs}
        currentUserId={userId}
        roomId={roomId}
        isToday={(selectedKey ?? tKey) === tKey}
        onUploadClick={() => openUpload(selectedKey ?? tKey)}
        onMutated={handleMutated}
      />

      <UploadSheet
        ref={uploadSheetRef}
        userId={userId}
        roomId={roomId}
        initialDateKey={uploadDateKey}
        onUploaded={() => {
          uploadSheetRef.current?.dismiss();
          handleMutated();
        }}
      />

      {goalRoomId && (
        <WeeklyGoalSheet
          ref={goalSheetRef}
          userId={userId}
          goalRoomId={goalRoomId}
          currentGoal={dashboard.myGoal}
          onSaved={() => {
            goalSheetRef.current?.dismiss();
            invalidate(effectiveGoalRoomId);
          }}
        />
      )}

      <ExceptionRequestSheet
        ref={exceptionSheetRef}
        userId={userId}
        weekStart={dashboard.weekStart}
        roomId={roomId}
        onSubmitted={() => {
          exceptionSheetRef.current?.dismiss();
          handleMutated();
        }}
      />

      <HeatmapSheet ref={heatmapSheetRef} userId={userId} />
      <SettlementSheet ref={settlementSheetRef} monthDate={monthDate} weeklyFine={weeklyFine} room={room} userId={userId} />
    </View>
  );
}
