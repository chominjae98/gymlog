import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { Calendar, Camera, Plus, X } from "lucide-react-native";
import { forwardRef, useEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { CalendarGrid } from "@/components/CalendarGrid";
import { useToast } from "@/components/ToastProvider";
import { CenteredModal, type CenteredModalHandle } from "@/components/ui/CenteredModal";
import { usePhotoSourcePicker } from "@/components/ui/PhotoSourceSheet";
import { groupLogsByDate } from "@/lib/dashboard-data";
import { formatDayTitle, nowInSeoul, toDateKey } from "@/lib/date";
import { getExistingPhotoHashes } from "@/lib/duplicate-check";
import type { ResizedPhoto } from "@/lib/image-resize";
import { fetchMonthLogs } from "@/lib/client-data";
import { processPickedAssets } from "@/lib/photo-picker";
import { supabase } from "@/lib/supabase/client";
import { removeWorkoutPhotos, uploadWorkoutPhotos } from "@/lib/storage-upload";

type Props = {
  userId: string;
  roomId: string;
  initialDateKey: string;
  onUploaded: (dateKey: string, photoUrls: string[], memo: string | null) => void;
};

const MAX_PHOTOS = 5;

export const UploadSheet = forwardRef<CenteredModalHandle, Props>(function UploadSheet(
  { userId, roomId, initialDateKey, onUploaded },
  ref
) {
  const showToast = useToast();
  const [photos, setPhotos] = useState<{ photo: ResizedPhoto; hash: string }[]>([]);
  const [memo, setMemo] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date(`${initialDateKey}T00:00:00`));
  const [calendarMonth, setCalendarMonth] = useState(selectedDate);
  const [showCalendar, setShowCalendar] = useState(false);
  const photoPicker = usePhotoSourcePicker();

  // 시트가 새 날짜로 다시 열릴 때마다 폼을 초기화한다.
  useEffect(() => {
    const d = new Date(`${initialDateKey}T00:00:00`);
    setSelectedDate(d);
    setCalendarMonth(d);
    setPhotos([]);
    setMemo("");
    setError(null);
    setShowCalendar(false);
  }, [initialDateKey]);

  const today = nowInSeoul();
  const selectedDateKey = toDateKey(selectedDate);
  const isSelectedToday = selectedDateKey === toDateKey(today);

  const { data: existingHashes } = useQuery({
    queryKey: ["existingPhotoHashes", userId, roomId],
    queryFn: () => getExistingPhotoHashes(supabase, userId, roomId),
  });

  const { data: calendarMonthLogs } = useQuery({
    queryKey: ["monthLogsForCalendar", roomId, calendarMonth.getFullYear(), calendarMonth.getMonth()],
    queryFn: () => fetchMonthLogs(calendarMonth, roomId),
  });
  const calendarLogsByDate = groupLogsByDate(calendarMonthLogs ?? []);

  async function handlePickPhotos() {
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) return;
    const assets = await photoPicker.pick(remaining);
    if (assets.length === 0) return;

    const seen = new Set([...(existingHashes ?? []), ...photos.map((p) => p.hash)]);
    const { accepted, duplicateCount } = await processPickedAssets(assets.slice(0, remaining), seen);

    setPhotos((prev) => [...prev, ...accepted]);
    if (duplicateCount > 0) {
      setError(`이미 올렸던 사진과 같은 사진 ${duplicateCount}장은 제외했어요.`);
    } else {
      setError(null);
    }
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (photos.length === 0) {
      setError("사진을 먼저 선택해 주세요.");
      return;
    }
    if (selectedDateKey > toDateKey(nowInSeoul())) {
      setError("미래 날짜에는 기록을 올릴 수 없어요.");
      return;
    }

    setUploading(true);
    setError(null);

    let photoUrls: string[];
    try {
      photoUrls = await uploadWorkoutPhotos(supabase, userId, selectedDateKey, photos.map((p) => p.photo));
    } catch {
      setUploading(false);
      setError("업로드에 실패했어요. 다시 시도해 주세요.");
      return;
    }

    const { error: insertError } = await supabase.from("workout_logs").insert({
      user_id: userId,
      room_id: roomId,
      log_date: selectedDateKey,
      photo_urls: photoUrls,
      photo_hashes: photos.map((p) => p.hash),
      memo: memo.trim() || null,
    });

    setUploading(false);
    if (insertError) {
      console.error("workout_logs insert 실패, 방금 올린 사진 정리 시도:", insertError);
      await removeWorkoutPhotos(supabase, photoUrls);
      setError("기록 저장에 실패했어요. 다시 시도해 주세요.");
      return;
    }
    showToast(isSelectedToday ? "오늘 운동을 인증했어요! 🔥" : `${formatDayTitle(selectedDate)} 운동을 기록했어요! 🔥`);
    onUploaded(selectedDateKey, photoUrls, memo.trim() || null);
  }

  return (
    <>
    <CenteredModal ref={ref} keyboardHandling>
      <ScrollView contentContainerClassName="px-6 pb-8 pt-2" keyboardShouldPersistTaps="handled">
        <View className="mb-4 flex-row items-center justify-between">
          <View>
            <Text className="text-[18px] font-bold text-foreground">
              {isSelectedToday ? "오늘 운동 인증" : `${formatDayTitle(selectedDate)} 운동 인증`}
            </Text>
            <Text className="mt-0.5 text-[12px] text-muted">사진 최대 {MAX_PHOTOS}장까지 첨부할 수 있어요</Text>
          </View>
        </View>

        <Pressable
          onPress={() => setShowCalendar((v) => !v)}
          className="mb-4 flex-row items-center gap-2 rounded-2xl bg-surface-muted px-4 py-3 active:opacity-80"
        >
          <Calendar size={16} color="#1fb872" />
          <Text className="text-[13px] font-semibold text-foreground">{isSelectedToday ? "오늘" : formatDayTitle(selectedDate)}</Text>
          <Text className="ml-auto text-[12px] font-medium text-muted">{showCalendar ? "달력 닫기" : "날짜 변경"}</Text>
        </Pressable>

        {showCalendar && (
          <View className="mb-4">
            <CalendarGrid
              monthDate={calendarMonth}
              onMonthChange={setCalendarMonth}
              logsByDate={calendarLogsByDate}
              selectedKey={selectedDateKey}
              onSelectDate={(key) => {
                setSelectedDate(new Date(`${key}T00:00:00`));
                setShowCalendar(false);
              }}
            />
          </View>
        )}

        {photos.length === 0 ? (
          <Pressable
            onPress={handlePickPhotos}
            className="aspect-[4/3] w-full items-center justify-center rounded-2xl border-2 border-dashed border-border bg-surface-muted"
          >
            <View className="items-center gap-2">
              <Camera size={28} color="#7a7d74" />
              <Text className="text-[13px] font-medium text-muted">사진 선택하기</Text>
            </View>
          </Pressable>
        ) : (
          <View className="flex-row flex-wrap gap-2">
            {photos.map(({ photo }, i) => (
              <View key={photo.uri} className="relative aspect-square w-[31%] overflow-hidden rounded-2xl bg-surface-muted">
                <Image source={{ uri: photo.uri }} style={{ width: "100%", height: "100%" }} contentFit="cover" alt={`선택한 사진 ${i + 1}`} />
                <Pressable
                  onPress={() => removePhoto(i)}
                  accessibilityLabel="사진 제거"
                  className="absolute right-1.5 top-1.5 h-6 w-6 items-center justify-center rounded-full bg-black/55"
                >
                  <X size={13} color="#fff" />
                </Pressable>
              </View>
            ))}
            {photos.length < MAX_PHOTOS && (
              <Pressable
                onPress={handlePickPhotos}
                className="aspect-square w-[31%] items-center justify-center rounded-2xl border-2 border-dashed border-border bg-surface-muted"
              >
                <Plus size={22} color="#7a7d74" />
              </Pressable>
            )}
          </View>
        )}

        <TextInput
          value={memo}
          onChangeText={setMemo}
          placeholder="운동 한 줄 메모 (선택)"
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
          onPress={handleSubmit}
          disabled={uploading}
          className="mt-6 items-center rounded-2xl bg-brand py-3.5 active:opacity-90 disabled:opacity-60"
        >
          <Text className="text-[15px] font-semibold text-white">{uploading ? "업로드 중..." : "인증 완료"}</Text>
        </Pressable>
      </ScrollView>
    </CenteredModal>
    {photoPicker.element}
    </>
  );
});
