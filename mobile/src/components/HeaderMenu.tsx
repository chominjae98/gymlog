import { EllipsisVertical, LogOut } from "lucide-react-native";
import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { signOut } from "@/lib/auth";

/** 헤더 오른쪽 끝의 "···" 메뉴. 지금은 로그아웃만 담는다(다크모드 토글은 이번 포팅 범위 밖). */
export function HeaderMenu() {
  const [open, setOpen] = useState(false);

  return (
    <View>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityLabel="메뉴 열기"
        className="h-9 w-9 items-center justify-center rounded-full active:bg-surface-muted"
      >
        <EllipsisVertical size={18} color="#7a7d74" />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1" onPress={() => setOpen(false)}>
          <View className="absolute right-4 top-16 w-44 overflow-hidden rounded-2xl bg-surface py-1 shadow-lg">
            <Pressable
              onPress={() => {
                setOpen(false);
                signOut();
              }}
              className="flex-row items-center gap-2 px-4 py-3 active:bg-surface-muted"
            >
              <LogOut size={15} color="#ff6a4d" />
              <Text className="text-[13px] font-medium text-warn">로그아웃</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
