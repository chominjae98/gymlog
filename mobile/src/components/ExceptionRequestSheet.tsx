import { forwardRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useToast } from "@/components/ToastProvider";
import { CenteredModal, type CenteredModalHandle } from "@/components/ui/CenteredModal";
import { submitFineException } from "@/lib/fine-exceptions";
import { supabase } from "@/lib/supabase/client";

const MAX_LENGTH = 500;

type Props = {
  userId: string;
  weekStart: string;
  roomId: string;
  onSubmitted: () => void;
};

/** "이번 주 벌금 위기" 상태인 사람이 피치 못할 사정을 적어 제출하는 사유서 모달. */
export const ExceptionRequestSheet = forwardRef<CenteredModalHandle, Props>(function ExceptionRequestSheet(
  { userId, weekStart, roomId, onSubmitted },
  ref
) {
  const showToast = useToast();
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (submitting) return;
    const trimmed = reason.trim();
    if (trimmed.length === 0) {
      setError("사정을 적어 주세요.");
      return;
    }
    setSubmitting(true);
    setError(null);

    const { error: insertError } = await submitFineException(supabase, userId, weekStart, trimmed, roomId);

    setSubmitting(false);
    if (insertError) {
      setError(
        insertError.code === "23505" ? "이번 주에는 이미 제출한 사유서가 있어요." : "제출에 실패했어요. 다시 시도해 주세요."
      );
      return;
    }
    setReason("");
    showToast("사유서를 제출했어요. 친구들의 투표를 기다려 주세요.");
    onSubmitted();
  }

  return (
    <CenteredModal ref={ref} keyboardHandling>
      <View className="px-6 pb-6 pt-2">
        <Text className="text-[18px] font-bold text-foreground">사유서 제출</Text>
        <Text className="mt-0.5 text-[12px] text-muted">친구들이 투표로 인정해주면 벌금에서 빠져요</Text>

        <TextInput
          value={reason}
          onChangeText={setReason}
          placeholder="예) 이번 주 출장이 있어서 헬스장을 못 갔습니다"
          multiline
          maxLength={MAX_LENGTH}
          style={{
            marginTop: 16,
            minHeight: 100,
            borderRadius: 16,
            backgroundColor: "#f1f0ea",
            paddingHorizontal: 16,
            paddingVertical: 14,
            fontSize: 14,
            color: "#1b1d1a",
            textAlignVertical: "top",
          }}
        />
        <Text className="mt-1.5 text-right text-[11px] text-muted">
          {reason.length}/{MAX_LENGTH}
        </Text>

        {error && <Text className="mt-1 text-center text-[12px] text-warn">{error}</Text>}

        <Pressable
          onPress={handleSubmit}
          disabled={submitting}
          className="mt-4 items-center rounded-2xl bg-brand py-3.5 active:opacity-90 disabled:opacity-60"
        >
          <Text className="text-[15px] font-semibold text-white">{submitting ? "제출 중..." : "제출하기"}</Text>
        </Pressable>
      </View>
    </CenteredModal>
  );
});
