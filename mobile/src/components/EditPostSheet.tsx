import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { Plus, X } from "lucide-react-native";
import { forwardRef, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useToast } from "@/components/ToastProvider";
import { CenteredModal, type CenteredModalHandle } from "@/components/ui/CenteredModal";
import { getExistingPhotoHashes } from "@/lib/duplicate-check";
import type { ResizedPhoto } from "@/lib/image-resize";
import { pickPhotos, processPickedAssets } from "@/lib/photo-picker";
import { removeWorkoutPhotos, uploadWorkoutPhotos } from "@/lib/storage-upload";
import { supabase } from "@/lib/supabase/client";
import type { WorkoutLogWithProfile } from "@/types/database";

type Props = {
  log: WorkoutLogWithProfile;
  roomId: string;
  onDismiss: () => void;
  onSaved: () => void;
};

const MAX_PHOTOS = 5;

/** 이미 올린 인증 게시물의 사진(여러 장)/메모를 통째로 수정하는 모달. */
export const EditPostSheet = forwardRef<CenteredModalHandle, Props>(function EditPostSheet(
  { log, roomId, onDismiss, onSaved },
  ref
) {
  const showToast = useToast();
  const [keptPhotos, setKeptPhotos] = useState(log.photo_urls.map((url, i) => ({ url, hash: log.photo_hashes?.[i] ?? "" })));
  const [newPhotos, setNewPhotos] = useState<{ photo: ResizedPhoto; hash: string }[]>([]);
  const [memo, setMemo] = useState(log.memo ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalCount = keptPhotos.length + newPhotos.length;

  const { data: existingHashes } = useQuery({
    queryKey: ["existingPhotoHashes", log.user_id, roomId, log.id],
    queryFn: () => getExistingPhotoHashes(supabase, log.user_id, roomId, log.id),
  });

  async function handlePickPhotos() {
    const remaining = MAX_PHOTOS - totalCount;
    if (remaining <= 0) return;
    const assets = await pickPhotos(remaining);
    if (assets.length === 0) return;

    const seen = new Set([...(existingHashes ?? []), ...keptPhotos.map((p) => p.hash), ...newPhotos.map((p) => p.hash)]);
    const { accepted, duplicateCount } = await processPickedAssets(assets.slice(0, remaining), seen);

    setNewPhotos((prev) => [...prev, ...accepted]);
    setError(duplicateCount > 0 ? `이미 올렸던 사진과 같은 사진 ${duplicateCount}장은 제외했어요.` : null);
  }

  function removeKept(url: string) {
    setKeptPhotos((prev) => prev.filter((p) => p.url !== url));
  }

  function removeNew(index: number) {
    setNewPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (totalCount === 0) {
      setError("사진이 최소 1장은 있어야 해요.");
      return;
    }
    setSaving(true);
    setError(null);

    let uploadedUrls: string[];
    try {
      uploadedUrls = await uploadWorkoutPhotos(supabase, log.user_id, log.log_date, newPhotos.map((p) => p.photo));
    } catch {
      setSaving(false);
      setError("사진 업로드에 실패했어요. 다시 시도해 주세요.");
      return;
    }

    const finalPhotoUrls = [...keptPhotos.map((p) => p.url), ...uploadedUrls];
    const finalPhotoHashes = [...keptPhotos.map((p) => p.hash), ...newPhotos.map((p) => p.hash)];

    const { error: updateError } = await supabase
      .from("workout_logs")
      .update({ photo_urls: finalPhotoUrls, photo_hashes: finalPhotoHashes, memo: memo.trim() || null })
      .eq("id", log.id);

    setSaving(false);
    if (updateError) {
      console.error("workout_logs update 실패, 새로 올린 사진 정리 시도:", updateError);
      await removeWorkoutPhotos(supabase, uploadedUrls);
      setError("저장에 실패했어요. 다시 시도해 주세요.");
      return;
    }

    const keptUrls = keptPhotos.map((p) => p.url);
    const removedUrls = log.photo_urls.filter((u) => !keptUrls.includes(u));
    await removeWorkoutPhotos(supabase, removedUrls);

    showToast("게시물을 수정했어요");
    onSaved();
  }

  return (
    <CenteredModal ref={ref} keyboardHandling onDismiss={onDismiss}>
      <ScrollView contentContainerClassName="px-6 pb-8 pt-2" keyboardShouldPersistTaps="handled">
        <View className="mb-6">
          <Text className="text-[18px] font-bold text-foreground">게시물 수정</Text>
          <Text className="mt-0.5 text-[12px] text-muted">사진 최대 {MAX_PHOTOS}장까지 첨부할 수 있어요</Text>
        </View>

        <View className="flex-row flex-wrap gap-2">
          {keptPhotos.map(({ url }) => (
            <View key={url} className="relative aspect-square w-[31%] overflow-hidden rounded-2xl bg-surface-muted">
              <Image source={{ uri: url }} style={{ width: "100%", height: "100%" }} contentFit="cover" alt="기존 사진" />
              <Pressable
                onPress={() => removeKept(url)}
                accessibilityLabel="사진 제거"
                className="absolute right-1.5 top-1.5 h-6 w-6 items-center justify-center rounded-full bg-black/55"
              >
                <X size={13} color="#fff" />
              </Pressable>
            </View>
          ))}
          {newPhotos.map(({ photo }, i) => (
            <View key={photo.uri} className="relative aspect-square w-[31%] overflow-hidden rounded-2xl bg-surface-muted">
              <Image source={{ uri: photo.uri }} style={{ width: "100%", height: "100%" }} contentFit="cover" alt="새로 추가한 사진" />
              <View className="absolute left-1.5 top-1.5 rounded-full bg-brand px-1.5 py-0.5">
                <Text className="text-[10px] font-bold text-white">NEW</Text>
              </View>
              <Pressable
                onPress={() => removeNew(i)}
                accessibilityLabel="사진 제거"
                className="absolute right-1.5 top-1.5 h-6 w-6 items-center justify-center rounded-full bg-black/55"
              >
                <X size={13} color="#fff" />
              </Pressable>
            </View>
          ))}
          {totalCount < MAX_PHOTOS && (
            <Pressable
              onPress={handlePickPhotos}
              className="aspect-square w-[31%] items-center justify-center rounded-2xl border-2 border-dashed border-border bg-surface-muted"
            >
              <Plus size={22} color="#7a7d74" />
            </Pressable>
          )}
        </View>

        <TextInput
          value={memo}
          onChangeText={setMemo}
          placeholder="오늘 운동 한 줄 메모 (선택)"
          multiline
          maxLength={200}
          style={{
            marginTop: 20,
            borderRadius: 16,
            backgroundColor: "#f1f0ea",
            paddingHorizontal: 16,
            paddingVertical: 14,
            fontSize: 14,
            color: "#1b1d1a",
            minHeight: 56,
          }}
        />

        {error && <Text className="mt-3 text-center text-[12px] text-warn">{error}</Text>}

        <Pressable
          onPress={handleSave}
          disabled={saving}
          className="mt-6 items-center rounded-2xl bg-brand py-3.5 active:opacity-90 disabled:opacity-60"
        >
          <Text className="text-[15px] font-semibold text-white">{saving ? "저장 중..." : "수정 완료"}</Text>
        </Pressable>
      </ScrollView>
    </CenteredModal>
  );
});
