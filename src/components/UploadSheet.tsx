"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Calendar, Camera, Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDayTitle, nowInSeoul, toDateKey } from "@/lib/date";
import { groupLogsByDate } from "@/lib/dashboard-data";
import { fetchMonthLogs } from "@/lib/client-data";
import { uploadWorkoutPhotos } from "@/lib/storage-upload";
import { resizeImagesForUpload } from "@/lib/image-resize";
import { hashFiles } from "@/lib/photo-hash";
import { getExistingPhotoHashes } from "@/lib/duplicate-check";
import { useCloseOnBackButton } from "@/lib/useCloseOnBackButton";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import { useToast } from "@/components/ToastProvider";
import { CalendarGrid } from "@/components/CalendarGrid";
import type { WorkoutLogWithProfile } from "@/types/database";

type Props = {
  userId: string;
  initialDateKey: string;
  onClose: () => void;
  onUploaded: (dateKey: string, photoUrls: string[], memo: string | null) => void;
};

const MAX_PHOTOS = 5;
const EMPTY_LOGS_BY_DATE = new Map<string, WorkoutLogWithProfile[]>();

export function UploadSheet({ userId, initialDateKey, onClose, onUploaded }: Props) {
  useLockBodyScroll();
  useCloseOnBackButton(onClose);
  const showToast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [fileHashes, setFileHashes] = useState<string[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [memo, setMemo] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 이 사람이 과거에 이미 올린 사진과 내용이 같은 사진(재사용)을 막기 위해,
  // 시트가 열리자마자 그 사람의 기존 사진 해시 목록을 미리 받아둔다.
  const [existingHashes, setExistingHashes] = useState<Set<string>>(new Set());
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    getExistingPhotoHashes(supabase, userId).then((hashes) => {
      if (!cancelled) setExistingHashes(hashes);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const today = nowInSeoul();
  const initialDate = new Date(`${initialDateKey}T00:00:00`);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [calendarMonth, setCalendarMonth] = useState(initialDate);
  const [showCalendar, setShowCalendar] = useState(false);
  const selectedDateKey = toDateKey(selectedDate);
  const isSelectedToday = selectedDateKey === toDateKey(today);

  // 달력에도 (대시보드처럼) 누가 인증했는지 점으로 보여주기 위해, 달력에 표시 중인
  // 달의 기록을 따로 불러온다.
  const [calendarLogsByDate, setCalendarLogsByDate] =
    useState<Map<string, WorkoutLogWithProfile[]>>(EMPTY_LOGS_BY_DATE);
  useEffect(() => {
    let cancelled = false;
    fetchMonthLogs(calendarMonth).then((logs) => {
      if (!cancelled) setCalendarLogsByDate(groupLogsByDate(logs));
    });
    return () => {
      cancelled = true;
    };
  }, [calendarMonth]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length === 0) return;
    const room = MAX_PHOTOS - files.length;
    const accepted = picked.slice(0, room);
    e.target.value = ""; // 같은 파일 다시 선택 가능하도록

    // 원본 그대로 미리보기/업로드하면 카메라 원본(수천 px, 수 MB)을 여러 장 한 번에
    // 디코딩하게 되어 화면이 잠깐 검게 깨지는 현상이 있었다. 화면에 보일 크기로 먼저 줄인다.
    const resized = await resizeImagesForUpload(accepted);
    const hashes = await hashFiles(resized);

    // 이미 올린 적 있는 사진(과거 기록 또는 이번에 이미 고른 사진)과 내용이 같으면
    // 조용히 걸러내고, 몇 장을 걸렀는지만 알려준다.
    const seen = new Set([...existingHashes, ...fileHashes]);
    const uniqueFiles: File[] = [];
    const uniqueHashes: string[] = [];
    let duplicateCount = 0;
    resized.forEach((file, i) => {
      const hash = hashes[i];
      if (seen.has(hash)) {
        duplicateCount += 1;
        return;
      }
      seen.add(hash);
      uniqueFiles.push(file);
      uniqueHashes.push(hash);
    });

    setFiles((prev) => [...prev, ...uniqueFiles]);
    setFileHashes((prev) => [...prev, ...uniqueHashes]);
    setPreviews((prev) => [...prev, ...uniqueFiles.map((f) => URL.createObjectURL(f))]);
    // "사진을 먼저 선택해 주세요" 등 이전 에러가 사진을 고른 뒤에도 남아있지 않도록,
    // 단 이번에 방 부족/중복으로 일부가 걸러졌다면 그 사실을 대신 알려준다.
    if (duplicateCount > 0) {
      setError(`이미 올렸던 사진과 같은 사진 ${duplicateCount}장은 제외했어요.`);
    } else {
      setError(picked.length > room ? `사진은 최대 ${MAX_PHOTOS}장까지만 첨부할 수 있어요.` : null);
    }
  }

  function removePhoto(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setFileHashes((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  }

  // 시트를 닫거나 업로드가 끝나 언마운트될 때, 아직 해제하지 않은 미리보기 blob URL을 정리한다.
  // (매 렌더 후 최신 목록을 ref에 반영해두고, 언마운트 시 그 시점의 최신 목록을 해제한다)
  const previewsRef = useRef(previews);
  useEffect(() => {
    previewsRef.current = previews;
  }, [previews]);
  useEffect(() => {
    return () => {
      previewsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  async function handleSubmit() {
    if (files.length === 0) {
      setError("사진을 먼저 선택해 주세요.");
      return;
    }
    // 화면(달력)에서 미래 날짜는 애초에 선택할 수 없지만, 혹시 모를 상황을 대비해 한 번 더 막는다.
    if (selectedDateKey > toDateKey(nowInSeoul())) {
      setError("미래 날짜에는 기록을 올릴 수 없어요.");
      return;
    }

    setUploading(true);
    setError(null);

    const supabase = createClient();

    let photoUrls: string[];
    try {
      photoUrls = await uploadWorkoutPhotos(supabase, userId, selectedDateKey, files);
    } catch {
      setUploading(false);
      setError("업로드에 실패했어요. 다시 시도해 주세요.");
      return;
    }

    const { error: insertError } = await supabase.from("workout_logs").insert({
      user_id: userId,
      log_date: selectedDateKey,
      photo_urls: photoUrls,
      photo_hashes: fileHashes,
      memo: memo.trim() || null,
    });

    setUploading(false);
    if (insertError) {
      setError("기록 저장에 실패했어요. 다시 시도해 주세요.");
      return;
    }
    showToast(
      isSelectedToday
        ? "오늘 운동을 인증했어요! 🔥"
        : `${formatDayTitle(selectedDate)} 운동을 기록했어요! 🔥`
    );
    onUploaded(selectedDateKey, photoUrls, memo.trim() || null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
      />
      <div className="animate-sheet-up safe-bottom relative z-10 max-h-[88dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-[32px] bg-background px-6 pt-5 pb-10 shadow-[var(--shadow-pop)]">
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-border" />

        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-[18px] font-bold text-foreground">
              {isSelectedToday ? "오늘 운동 인증" : `${formatDayTitle(selectedDate)} 운동 인증`}
            </h3>
            <p className="mt-0.5 text-[12px] text-muted">사진 최대 {MAX_PHOTOS}장까지 첨부할 수 있어요</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-muted text-muted hover:bg-border/60"
          >
            <X size={18} />
          </button>
        </div>

        <button
          onClick={() => setShowCalendar((v) => !v)}
          className="mb-4 flex w-full items-center gap-2 rounded-2xl bg-surface-muted px-4 py-3 text-left text-[13px] font-semibold text-foreground transition active:scale-[0.99]"
        >
          <Calendar size={16} className="shrink-0 text-brand" />
          {isSelectedToday ? "오늘" : formatDayTitle(selectedDate)}
          <span className="ml-auto text-[12px] font-medium text-muted">
            {showCalendar ? "달력 닫기" : "날짜 변경"}
          </span>
        </button>

        {showCalendar && (
          <div className="mb-4">
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
          </div>
        )}

        {/* capture 속성을 넣지 않아야 iOS/Android 둘 다 "카메라로 촬영" / "사진첩에서 선택"을
            고를 수 있는 기본 액션시트가 뜬다. (capture="environment"를 넣으면 iOS Safari에서는
            카메라가 강제로 바로 열려서 사진첩을 선택할 수 없게 되는 문제가 있었음) */}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />

        {previews.length === 0 ? (
          <button
            onClick={() => inputRef.current?.click()}
            className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-border bg-surface-muted"
          >
            <div className="flex flex-col items-center gap-2 text-muted">
              <Camera size={28} />
              <span className="text-[13px] font-medium">사진 선택하기</span>
            </div>
          </button>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {previews.map((src, i) => (
              <div key={src} className="relative aspect-square overflow-hidden rounded-2xl bg-surface-muted">
                <Image src={src} alt={`선택한 사진 ${i + 1}`} fill className="object-cover" />
                <button
                  onClick={() => removePhoto(i)}
                  aria-label="사진 제거"
                  className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
            {previews.length < MAX_PHOTOS && (
              <button
                onClick={() => inputRef.current?.click()}
                className="flex aspect-square items-center justify-center rounded-2xl border-2 border-dashed border-border bg-surface-muted text-muted"
              >
                <Plus size={22} />
              </button>
            )}
          </div>
        )}

        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="운동 한 줄 메모 (선택)"
          rows={2}
          maxLength={200}
          className="mt-5 w-full resize-none rounded-2xl bg-surface-muted px-4 py-3.5 text-[14px] text-foreground outline-none"
        />

        {error && (
          <p className="mt-3 text-center text-[12px] text-warn">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={uploading}
          className="mt-6 w-full rounded-2xl bg-brand py-3.5 text-[15px] font-semibold text-white active:scale-[0.98] disabled:opacity-60"
        >
          {uploading ? "업로드 중..." : "인증 완료"}
        </button>
      </div>
    </div>
  );
}
