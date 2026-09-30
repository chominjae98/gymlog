import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, X } from "lucide-react-native";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { Avatar } from "@/components/ui/Avatar";
import { CenteredModal, type CenteredModalHandle } from "@/components/ui/CenteredModal";
import { formatTime } from "@/lib/date";
import { getMyNotifications, markAllNotificationsRead } from "@/lib/notifications-data";
import { supabase } from "@/lib/supabase/client";
import type { NotificationWithActor } from "@/types/database";

export const NotificationSheet = forwardRef<CenteredModalHandle, { userId: string }>(function NotificationSheet(
  { userId },
  ref
) {
  const queryClient = useQueryClient();
  const modalRef = useRef<CenteredModalHandle>(null);
  useImperativeHandle(ref, () => modalRef.current!);

  const { data: notifications, isLoading, isError } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => getMyNotifications(supabase),
  });

  useEffect(() => {
    if (!notifications) return;
    markAllNotificationsRead(supabase, userId).then(() => {
      queryClient.invalidateQueries({ queryKey: ["hasUnreadNotifications"] });
    });
    // notifications가 새로 도착한 시점(=모달을 연 시점)에만 1회 읽음 처리한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications]);

  return (
    <CenteredModal ref={modalRef}>
      <View className="flex-row items-center justify-between px-5 pb-3 pt-5">
        <View className="flex-row items-center gap-1.5">
          <Bell size={17} color="#17914f" />
          <Text className="text-[17px] font-bold text-foreground">알림</Text>
        </View>
        <Pressable onPress={() => modalRef.current?.dismiss()} className="h-8 w-8 items-center justify-center rounded-full active:bg-surface-muted">
          <X size={18} color="#7a7d74" />
        </Pressable>
      </View>

      {isError ? (
        <View className="h-32 items-center justify-center px-5">
          <Text className="text-center text-[13px] text-muted">알림을 불러오지 못했어요.{"\n"}잠시 후 다시 열어봐 주세요.</Text>
        </View>
      ) : isLoading ? (
        <View className="h-32 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : notifications && notifications.length === 0 ? (
        <View className="h-32 items-center justify-center gap-1.5">
          <Text className="text-[24px]">🔔</Text>
          <Text className="text-[13px] text-muted">아직 알림이 없어요</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(n) => n.id}
          contentContainerClassName="px-5 pb-5"
          ItemSeparatorComponent={() => <View className="h-px bg-border" />}
          renderItem={({ item: n }: { item: NotificationWithActor }) => (
            <View className="flex-row items-start gap-2.5 py-3">
              <Avatar url={n.actor.avatar_url} size={32} />
              <View className="min-w-0 flex-1">
                <Text className="text-[13px] leading-relaxed text-foreground">
                  <Text className="font-semibold">{n.actor.nickname}</Text>
                  {n.type === "reaction" ? (
                    <Text>님이 회원님 게시물에 공감했어요{n.reaction && ` ${n.reaction.emoji}`}</Text>
                  ) : (
                    <Text>
                      님이 댓글을 남겼어요
                      {n.comment && <Text className="text-muted">{`: "${n.comment.body}"`}</Text>}
                    </Text>
                  )}
                </Text>
                <Text className="mt-0.5 text-[11px] text-muted">{formatTime(n.created_at)}</Text>
              </View>
            </View>
          )}
        />
      )}
    </CenteredModal>
  );
});
