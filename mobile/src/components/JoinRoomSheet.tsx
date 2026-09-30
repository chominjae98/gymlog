import { forwardRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useToast } from "@/components/ToastProvider";
import { CenteredModal, type CenteredModalHandle } from "@/components/ui/CenteredModal";
import { useJoinRoom } from "@/hooks/useRooms";

type Props = { onJoined: (roomId: string) => void; initialCode?: string };

/** 초대 코드로 기존 방에 참가하는 모달. */
export const JoinRoomSheet = forwardRef<CenteredModalHandle, Props>(function JoinRoomSheet({ onJoined, initialCode }, ref) {
  const showToast = useToast();
  const joinRoom = useJoinRoom();
  const [code, setCode] = useState(initialCode?.toUpperCase() ?? "");
  const [error, setError] = useState<string | null>(null);

  async function handleJoin() {
    if (joinRoom.isPending) return;
    const trimmed = code.trim();
    if (!trimmed) {
      setError("초대 코드를 입력해 주세요.");
      return;
    }
    setError(null);
    try {
      const room = await joinRoom.mutateAsync(trimmed);
      showToast(`"${room.name}" 방에 참가했어요`);
      setCode("");
      onJoined(room.id);
    } catch (err) {
      console.error("방 참가 실패:", err);
      setError("초대 코드를 찾을 수 없어요. 다시 확인해 주세요.");
    }
  }

  return (
    <CenteredModal ref={ref} keyboardHandling>
      <View className="px-5 pb-6 pt-2">
        <Text className="text-[17px] font-bold text-foreground">초대 코드로 참가하기</Text>

        <View className="mt-4 rounded-[24px] bg-surface p-5 shadow-sm">
          <TextInput
            value={code}
            onChangeText={(v) => setCode(v.toUpperCase())}
            onSubmitEditing={handleJoin}
            placeholder="8자리 코드 입력"
            maxLength={8}
            autoFocus
            autoCapitalize="characters"
            style={{
              borderRadius: 12,
              backgroundColor: "#f1f0ea",
              paddingHorizontal: 16,
              paddingVertical: 12,
              fontSize: 16,
              fontWeight: "bold",
              letterSpacing: 3,
              textAlign: "center",
              color: "#1b1d1a",
            }}
          />
          {error && <Text className="mt-2 text-center text-[12px] text-warn">{error}</Text>}
          <Pressable
            onPress={handleJoin}
            disabled={joinRoom.isPending}
            className="mt-3 items-center rounded-xl bg-brand py-3 active:opacity-90 disabled:opacity-60"
          >
            <Text className="text-[14px] font-semibold text-white">{joinRoom.isPending ? "참가하는 중..." : "참가하기"}</Text>
          </Pressable>
        </View>
      </View>
    </CenteredModal>
  );
});
