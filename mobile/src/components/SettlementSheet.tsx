import { useQuery } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import { Receipt, Send, Share2 } from "lucide-react-native";
import { forwardRef } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useToast } from "@/components/ToastProvider";
import { Avatar } from "@/components/ui/Avatar";
import { CenteredModal, type CenteredModalHandle } from "@/components/ui/CenteredModal";
import { formatMonthTitle, nowInSeoul } from "@/lib/date";
import { getMonthlySettlement } from "@/lib/settlement-data";
import { shareSettlementRequest } from "@/lib/share";
import { supabase } from "@/lib/supabase/client";
import { buildTossTransferLink } from "@/lib/toss-transfer";
import type { Room } from "@/types/database";

type Props = { monthDate: Date; weeklyFine: number; room: Room; userId: string };

export const SettlementSheet = forwardRef<CenteredModalHandle, Props>(function SettlementSheet(
  { monthDate, weeklyFine, room, userId },
  ref
) {
  const showToast = useToast();
  const { data: settlement, isLoading, isError } = useQuery({
    queryKey: ["settlement", room.id, monthDate.getFullYear(), monthDate.getMonth(), weeklyFine],
    queryFn: () => getMonthlySettlement(supabase, monthDate, nowInSeoul(), weeklyFine, room.id),
  });

  const hasSettlementAccount = Boolean(room.settlement_bank && room.settlement_account_no);

  function handlePay(amount: number) {
    const link = room.settlement_bank && room.settlement_account_no
      ? buildTossTransferLink(room.settlement_bank, room.settlement_account_no, amount)
      : null;
    if (!link) return;
    Linking.openURL(link).catch(() => {
      showToast("토스 앱이 설치되어 있지 않은 것 같아요.", "error");
    });
  }

  async function handleShareRequest(nickname: string, amount: number) {
    const result = await shareSettlementRequest(nickname, amount, formatMonthTitle(monthDate), room.name);
    showToast(result === "shared" ? "정산 요청을 공유했어요" : "정산 요청 문구를 복사했어요");
  }

  const sorted = settlement ? [...settlement].sort((a, b) => b.totalFine - a.totalFine) : [];
  const totalPot = sorted.reduce((sum, s) => sum + s.totalFine, 0);

  return (
    <CenteredModal ref={ref}>
      <View className="px-5 pb-3">
        <View className="flex-row items-center gap-1.5">
          <Receipt size={17} color="#17914f" />
          <Text className="text-[17px] font-bold text-foreground">{formatMonthTitle(monthDate)} 정산 요약</Text>
        </View>
      </View>

      <ScrollView contentContainerClassName="px-5 pb-4">
        {isError ? (
          <View className="h-40 items-center justify-center">
            <Text className="text-center text-[13px] text-muted">정산 정보를 불러오지 못했어요.{"\n"}잠시 후 다시 열어봐 주세요.</Text>
          </View>
        ) : isLoading ? (
          <View className="h-40 items-center justify-center">
            <ActivityIndicator />
          </View>
        ) : sorted.length === 0 ? (
          <View className="items-center gap-2 rounded-2xl bg-surface-muted py-10">
            <Text className="text-2xl">🧾</Text>
            <Text className="text-[13px] text-muted">이 달에는 정산할 내역이 없어요</Text>
          </View>
        ) : (
          <View className="divide-y divide-border">
            {sorted.map((s) => {
              const isMe = s.profile.id === userId;
              return (
                <View key={s.profile.id} className="gap-2 py-3">
                  <View className="flex-row items-center gap-3">
                    <Avatar url={s.profile.avatar_url} size={36} className="bg-surface-muted" />
                    <Text className="min-w-0 flex-1 text-[14px] font-semibold text-foreground" numberOfLines={1}>
                      {s.profile.nickname}
                    </Text>
                    <Text className={`shrink-0 text-[14px] font-bold ${s.totalFine > 0 ? "text-warn" : "text-muted"}`}>
                      {s.totalFine.toLocaleString()}원
                    </Text>
                  </View>

                  {s.totalFine > 0 && (
                    <View className="flex-row items-center gap-1.5 pl-12">
                      {isMe && hasSettlementAccount && (
                        <Pressable
                          onPress={() => handlePay(s.totalFine)}
                          className="flex-row items-center gap-1 rounded-full bg-[#0064FF] px-3 py-1.5 active:opacity-90"
                        >
                          <Send size={11} color="#fff" />
                          <Text className="text-[11.5px] font-semibold text-white">토스로 송금하기</Text>
                        </Pressable>
                      )}
                      {!isMe && (
                        <Pressable
                          onPress={() => handleShareRequest(s.profile.nickname, s.totalFine)}
                          className="flex-row items-center gap-1 rounded-full bg-surface-muted px-3 py-1.5 active:opacity-70"
                        >
                          <Share2 size={11} color="#1b1d1a" />
                          <Text className="text-[11.5px] font-semibold text-foreground">정산 요청 보내기</Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {sorted.length > 0 && (
        <View className="border-t border-border px-5 py-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-[13px] font-medium text-muted">이 달 총액</Text>
            <Text className="text-[13px] font-bold text-foreground">{totalPot.toLocaleString()}원</Text>
          </View>
        </View>
      )}
    </CenteredModal>
  );
});
