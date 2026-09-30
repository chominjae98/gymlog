import { router, useLocalSearchParams, type Href } from "expo-router";
import { Plus, Settings } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { CreateRoomSheet } from "@/components/CreateRoomSheet";
import { HeaderMenu } from "@/components/HeaderMenu";
import { JoinRoomSheet } from "@/components/JoinRoomSheet";
import { RoomManageSheet } from "@/components/RoomManageSheet";
import { Avatar } from "@/components/ui/Avatar";
import type { CenteredModalHandle } from "@/components/ui/CenteredModal";
import { useMyRooms } from "@/hooks/useRooms";
import { getRoomAccentClasses } from "@/lib/room-colors";
import type { Profile } from "@/types/database";

type Props = { userId: string; profile: Profile };

/**
 * "내 방" 탭 — 친구들끼리 따로 만든 방(모두가 함께 쓰는 "홈"과는 별개)을 목록으로
 * 보여주고, 하나를 고르면 그 방 전용 대시보드(app/room/[roomId])로 이동한다.
 */
export function RoomsTab({ userId, profile }: Props) {
  const { otherRooms, isLoading } = useMyRooms(userId);
  const params = useLocalSearchParams<{ join?: string }>();
  const createSheetRef = useRef<CenteredModalHandle>(null);
  const joinSheetRef = useRef<CenteredModalHandle>(null);
  const manageSheetRef = useRef<CenteredModalHandle>(null);
  // 방 객체를 통째로 저장해두면 목록이 새로고침돼도(정산 계좌 저장 등) 이 스냅샷은
  // 안 바뀐다 — id만 들고 있다가 매번 최신 otherRooms에서 다시 찾아써서 항상 최신값을 본다.
  const [manageRoomId, setManageRoomId] = useState<string | null>(null);
  const manageRoom = otherRooms.find((r) => r.id === manageRoomId) ?? null;

  useEffect(() => {
    if (params.join) joinSheetRef.current?.present();
  }, [params.join]);

  // 동적 세그먼트(room/[roomId])는 typedRoutes 캐시가 새로고침되기 전까지 타입 유니온에
  // 안 잡힐 수 있어(실기기 빌드에서는 문제 없음) 이 한 곳에서만 캐스팅한다.
  function goToRoom(roomId: string) {
    router.push(`/room/${roomId}` as Href);
  }

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center justify-between px-4 pb-3 pt-14">
        <View className="min-w-0 flex-1 flex-row items-center gap-2.5">
          <Avatar url={profile.avatar_url} size={40} className="bg-brand-soft border border-border" />
          <Text className="shrink text-[15px] font-bold text-foreground" numberOfLines={1}>
            {profile.nickname}님
          </Text>
        </View>
        <HeaderMenu />
      </View>

      <ScrollView contentContainerClassName="gap-5 px-4 pt-3 pb-32">
        {isLoading ? null : otherRooms.length === 0 ? (
          <View className="items-center gap-2 rounded-[24px] bg-surface px-6 py-10 shadow-sm">
            <Text className="text-[28px]">🤝</Text>
            <Text className="text-[13px] font-semibold text-foreground">아직 만든 방이 없어요</Text>
            <Text className="text-center text-[12px] text-muted">친구들과 방을 만들거나, 초대 코드로 참가해 보세요</Text>
          </View>
        ) : (
          <View className="gap-1.5">
            {otherRooms.map((room) => {
              const accent = getRoomAccentClasses(room.id);
              return (
                <View key={room.id} className="flex-row items-center gap-2.5 rounded-[24px] bg-surface p-2.5 shadow-sm">
                  <Pressable
                    onPress={() => goToRoom(room.id)}
                    className="flex-1 flex-row items-center gap-3 rounded-2xl px-1.5 py-1.5 active:opacity-80"
                  >
                    <View className={`h-11 w-11 items-center justify-center rounded-full ${accent.soft}`}>
                      <Text className={`text-[16px] font-bold ${accent.strong}`}>{room.name.charAt(0)}</Text>
                    </View>
                    <Text className="min-w-0 text-[14px] font-semibold text-foreground" numberOfLines={1}>
                      {room.name}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setManageRoomId(room.id);
                      manageSheetRef.current?.present();
                    }}
                    accessibilityLabel={`${room.name} 방 관리`}
                    className="h-9 w-9 items-center justify-center rounded-full active:opacity-60"
                  >
                    <Settings size={16} color="#7a7d74" />
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}

        <View className="flex-row gap-2">
          <Pressable
            onPress={() => createSheetRef.current?.present()}
            className="flex-1 flex-row items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border py-3 active:opacity-70"
          >
            <Plus size={15} color="#7a7d74" />
            <Text className="text-[13px] font-semibold text-muted">새 방 만들기</Text>
          </Pressable>
          <Pressable
            onPress={() => joinSheetRef.current?.present()}
            className="flex-1 items-center justify-center rounded-2xl border border-dashed border-border py-3 active:opacity-70"
          >
            <Text className="text-[13px] font-semibold text-muted">참가하기</Text>
          </Pressable>
        </View>
      </ScrollView>

      <CreateRoomSheet
        ref={createSheetRef}
        onCreated={(roomId) => {
          createSheetRef.current?.dismiss();
          goToRoom(roomId);
        }}
      />
      <JoinRoomSheet
        ref={joinSheetRef}
        initialCode={params.join}
        onJoined={(roomId) => {
          joinSheetRef.current?.dismiss();
          goToRoom(roomId);
        }}
      />
      {manageRoom && <RoomManageSheet ref={manageSheetRef} room={manageRoom} userId={userId} onLeft={() => manageSheetRef.current?.dismiss()} />}
    </View>
  );
}
