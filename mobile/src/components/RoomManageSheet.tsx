import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Landmark, LogOut, Share2, Users } from "lucide-react-native";
import { forwardRef, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useToast } from "@/components/ToastProvider";
import { Avatar } from "@/components/ui/Avatar";
import { CenteredModal, type CenteredModalHandle } from "@/components/ui/CenteredModal";
import { useLeaveRoom } from "@/hooks/useRooms";
import { getRoomMembers } from "@/lib/rooms-data";
import { getRoomAccentClasses } from "@/lib/room-colors";
import { shareRoomInvite } from "@/lib/share";
import { supabase } from "@/lib/supabase/client";
import type { Room } from "@/types/database";

type Props = { room: Room; userId: string; onLeft: () => void };

/** 방 하나를 관리하는 화면: 초대 코드 공유, 정산 계좌(방장만), 멤버 목록, 방 나가기. */
export const RoomManageSheet = forwardRef<CenteredModalHandle, Props>(function RoomManageSheet({ room, userId, onLeft }, ref) {
  const showToast = useToast();
  const queryClient = useQueryClient();
  const accent = getRoomAccentClasses(room.id);
  const isOwner = room.created_by === userId;
  const leaveRoom = useLeaveRoom();

  const { data: members, isLoading, isError } = useQuery({
    queryKey: ["roomMembers", room.id],
    queryFn: () => getRoomMembers(supabase, room.id),
  });

  const [editingAccount, setEditingAccount] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);
  const [settlementBank, setSettlementBank] = useState(room.settlement_bank ?? "");
  const [settlementAccountNo, setSettlementAccountNo] = useState(room.settlement_account_no ?? "");
  const [settlementAccountHolder, setSettlementAccountHolder] = useState(room.settlement_account_holder ?? "");
  const hasSettlementAccount = Boolean(settlementBank && settlementAccountNo);

  // 이 시트는 present()/dismiss()로 여닫힐 뿐 언마운트되지 않아서, room prop이
  // (다른 곳에서 저장 후 목록이 새로고침되는 등으로) 바뀌어도 위 useState 초기값은
  // 처음 마운트될 때 값 그대로 남는다 — 편집 중이 아닐 때만 최신 prop으로 동기화한다.
  useEffect(() => {
    if (editingAccount) return;
    setSettlementBank(room.settlement_bank ?? "");
    setSettlementAccountNo(room.settlement_account_no ?? "");
    setSettlementAccountHolder(room.settlement_account_holder ?? "");
  }, [room.settlement_bank, room.settlement_account_no, room.settlement_account_holder, editingAccount]);

  async function handleShare() {
    const result = await shareRoomInvite(room);
    showToast(result === "shared" ? "초대를 공유했어요" : "초대 문구를 클립보드에 복사했어요");
  }

  async function handleSaveSettlementAccount() {
    setSavingAccount(true);
    const { error } = await supabase
      .from("rooms")
      .update({
        settlement_bank: settlementBank.trim() || null,
        settlement_account_no: settlementAccountNo.trim() || null,
        settlement_account_holder: settlementAccountHolder.trim() || null,
      })
      .eq("id", room.id);
    setSavingAccount(false);
    if (error) {
      showToast("계좌 저장에 실패했어요. 다시 시도해 주세요.", "error");
      return;
    }
    setEditingAccount(false);
    queryClient.invalidateQueries({ queryKey: ["myRooms"] });
    showToast("정산 계좌를 저장했어요");
  }

  function handleLeave() {
    Alert.alert("방 나가기", `"${room.name}" 방에서 나갈까요?`, [
      { text: "취소", style: "cancel" },
      {
        text: "나가기",
        style: "destructive",
        onPress: async () => {
          try {
            await leaveRoom.mutateAsync(room.id);
            showToast(`"${room.name}" 방에서 나갔어요`);
            onLeft();
          } catch (error) {
            console.error("방 나가기 실패:", error);
            showToast("방 나가기에 실패했어요. 다시 시도해 주세요.", "error");
          }
        },
      },
    ]);
  }

  return (
    <CenteredModal ref={ref} keyboardHandling>
      <View className="px-5 pb-3">
        <View className="flex-row items-center gap-2.5">
          <View className={`h-9 w-9 items-center justify-center rounded-full ${accent.soft}`}>
            <Text className={`text-[14px] font-bold ${accent.strong}`}>{room.name.charAt(0)}</Text>
          </View>
          <Text className="shrink text-[17px] font-bold text-foreground" numberOfLines={1}>
            {room.name}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerClassName="px-5 pb-5">
        <Pressable onPress={handleShare} className="flex-row items-center justify-between rounded-[24px] bg-surface px-4 py-3.5 shadow-sm active:opacity-90">
          <View>
            <Text className="text-[13px] font-semibold text-foreground">초대 코드</Text>
            <Text className="mt-0.5 text-[15px] font-bold tracking-[3px] text-brand-strong">{room.invite_code}</Text>
          </View>
          <Share2 size={18} color="#17914f" />
        </Pressable>

        {isOwner && (
          <View className="mt-3 rounded-[24px] bg-surface px-4 py-3.5 shadow-sm">
            {editingAccount ? (
              <View className="gap-2">
                <View className="flex-row items-center gap-1.5">
                  <Landmark size={14} color="#7a7d74" />
                  <Text className="text-[13px] font-semibold text-foreground">정산 계좌</Text>
                </View>
                <TextInput
                  value={settlementBank}
                  onChangeText={setSettlementBank}
                  placeholder="은행명 (예: 카카오뱅크)"
                  style={{ borderRadius: 12, backgroundColor: "#f1f0ea", paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: "#1b1d1a" }}
                />
                <TextInput
                  value={settlementAccountNo}
                  onChangeText={setSettlementAccountNo}
                  placeholder="계좌번호"
                  keyboardType="number-pad"
                  style={{ borderRadius: 12, backgroundColor: "#f1f0ea", paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: "#1b1d1a" }}
                />
                <TextInput
                  value={settlementAccountHolder}
                  onChangeText={setSettlementAccountHolder}
                  placeholder="예금주명 (선택)"
                  style={{ borderRadius: 12, backgroundColor: "#f1f0ea", paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: "#1b1d1a" }}
                />
                <Text className="text-[11px] text-muted">등록한 계좌는 같은 방 멤버에게만 보이고, 정산 요약에서 본인 몫을 토스로 바로 송금할 때 쓰여요.</Text>
                <View className="flex-row gap-2">
                  <Pressable
                    onPress={() => {
                      setSettlementBank(room.settlement_bank ?? "");
                      setSettlementAccountNo(room.settlement_account_no ?? "");
                      setSettlementAccountHolder(room.settlement_account_holder ?? "");
                      setEditingAccount(false);
                    }}
                    className="flex-1 items-center rounded-xl py-2 active:opacity-70"
                  >
                    <Text className="text-[12.5px] font-semibold text-muted">취소</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleSaveSettlementAccount}
                    disabled={savingAccount || !settlementBank.trim() || !settlementAccountNo.trim()}
                    className="flex-1 items-center rounded-xl bg-brand py-2 active:opacity-90 disabled:opacity-50"
                  >
                    <Text className="text-[12.5px] font-semibold text-white">{savingAccount ? "저장 중..." : "저장"}</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View className="flex-row items-center justify-between gap-3">
                <View className="min-w-0 flex-1">
                  <View className="flex-row items-center gap-1.5">
                    <Landmark size={14} color="#7a7d74" />
                    <Text className="text-[13px] font-semibold text-foreground">정산 계좌</Text>
                  </View>
                  <Text className="mt-1 text-[13px] text-muted">
                    {hasSettlementAccount
                      ? `${settlementBank} ${settlementAccountNo}${settlementAccountHolder ? ` (${settlementAccountHolder})` : ""}`
                      : "등록하면 정산 요약에서 원클릭 송금 버튼이 생겨요"}
                  </Text>
                </View>
                <Pressable onPress={() => setEditingAccount(true)}>
                  <Text className="text-[12px] font-semibold text-brand-strong">{hasSettlementAccount ? "수정" : "등록하기"}</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        <View className="mt-5 flex-row items-center gap-1.5 px-1">
          <Users size={14} color="#7a7d74" />
          <Text className="text-[12.5px] font-semibold text-muted">멤버 {members ? members.length : ""}</Text>
        </View>

        {isError ? (
          <Text className="mt-2 rounded-2xl px-4 py-6 text-center text-[13px] text-muted">멤버 목록을 불러오지 못했어요.</Text>
        ) : isLoading ? (
          <View className="mt-2 py-6">
            <ActivityIndicator />
          </View>
        ) : (
          <View className="mt-2 divide-y divide-border rounded-[24px] bg-surface px-3.5 shadow-sm">
            {members?.map((m) => (
              <View key={m.id} className="flex-row items-center gap-2.5 py-2.5">
                <Avatar url={m.avatar_url} size={32} />
                <Text className="text-[13.5px] font-semibold text-foreground">{m.nickname}</Text>
              </View>
            ))}
          </View>
        )}

        <Pressable
          onPress={handleLeave}
          disabled={leaveRoom.isPending}
          className="mt-5 flex-row items-center justify-center gap-1.5 rounded-2xl py-3 active:opacity-70 disabled:opacity-60"
        >
          <LogOut size={15} color="#ff6a4d" />
          <Text className="text-[13px] font-semibold text-warn">{leaveRoom.isPending ? "나가는 중..." : "방 나가기"}</Text>
        </Pressable>
      </ScrollView>
    </CenteredModal>
  );
});
