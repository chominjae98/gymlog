import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react-native";
import { useRef } from "react";
import { Pressable, View } from "react-native";
import { NotificationSheet } from "@/components/NotificationSheet";
import type { CenteredModalHandle } from "@/components/ui/CenteredModal";
import { hasUnreadNotifications } from "@/lib/notifications-data";
import { supabase } from "@/lib/supabase/client";

/** 헤더의 종 아이콘. 안 읽은 알림이 있으면 빨간 점, 누르면 알림함(NotificationSheet)을 연다. */
export function NotificationBell({ userId }: { userId: string }) {
  const sheetRef = useRef<CenteredModalHandle>(null);
  const { data: hasUnread } = useQuery({
    queryKey: ["hasUnreadNotifications"],
    queryFn: () => hasUnreadNotifications(supabase),
    // 실시간 구독 대신 60초마다 가볍게 폴링한다 (웹 버전도 실시간 푸시는 없음 — Phase 5 참고).
    refetchInterval: 60_000,
  });

  return (
    <>
      <Pressable
        onPress={() => sheetRef.current?.present()}
        accessibilityLabel="알림"
        className="h-9 w-9 items-center justify-center rounded-full bg-surface-muted active:opacity-70"
      >
        <Bell size={16} color="#7a7d74" />
        {hasUnread && <View className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-warn" />}
      </Pressable>
      <NotificationSheet ref={sheetRef} userId={userId} />
    </>
  );
}
