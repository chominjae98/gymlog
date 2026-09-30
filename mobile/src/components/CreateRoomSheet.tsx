import { forwardRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useToast } from "@/components/ToastProvider";
import { CenteredModal, type CenteredModalHandle } from "@/components/ui/CenteredModal";
import { useCreateRoom } from "@/hooks/useRooms";

type Props = { onCreated: (roomId: string) => void };

/** 이미 방이 있는 사용자가 "새 방 만들기"를 눌렀을 때 뜨는 모달. */
export const CreateRoomSheet = forwardRef<CenteredModalHandle, Props>(function CreateRoomSheet({ onCreated }, ref) {
  const showToast = useToast();
  const createRoom = useCreateRoom();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (createRoom.isPending) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setError("방 이름을 입력해 주세요.");
      return;
    }
    setError(null);
    try {
      const room = await createRoom.mutateAsync(trimmed);
      showToast(`"${room.name}" 방을 만들었어요`);
      setName("");
      onCreated(room.id);
    } catch (err) {
      console.error("방 생성 실패:", err);
      setError("방 생성에 실패했어요. 다시 시도해 주세요.");
    }
  }

  return (
    <CenteredModal ref={ref} keyboardHandling>
      <View className="px-5 pb-6 pt-2">
        <Text className="text-[17px] font-bold text-foreground">새 방 만들기</Text>

        <View className="mt-4 rounded-[24px] bg-surface p-5 shadow-sm">
          <TextInput
            value={name}
            onChangeText={setName}
            onSubmitEditing={handleCreate}
            placeholder="예) 우리 헬스 모임"
            maxLength={30}
            autoFocus
            style={{ borderRadius: 12, backgroundColor: "#f1f0ea", paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: "#1b1d1a" }}
          />
          {error && <Text className="mt-2 text-[12px] text-warn">{error}</Text>}
          <Pressable
            onPress={handleCreate}
            disabled={createRoom.isPending}
            className="mt-3 items-center rounded-xl bg-brand py-3 active:opacity-90 disabled:opacity-60"
          >
            <Text className="text-[14px] font-semibold text-white">{createRoom.isPending ? "만드는 중..." : "방 만들기"}</Text>
          </Pressable>
        </View>
      </View>
    </CenteredModal>
  );
});
