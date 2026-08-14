"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import { useToast } from "@/components/ToastProvider";
import type { WorkoutLogWithProfile } from "@/types/database";

type Props = {
  log: WorkoutLogWithProfile;
  onClose: () => void;
  onSaved: () => void;
};

const MAX_PHOTOS = 5;
const STORAGE_MARKER = "/workout-photos/";

function pathFromPublicUrl(url: string) {
  const idx = url.indexOf(STORAGE_MARKER);
  return idx === -1 ? null : url.slice(idx + STORAGE_MARKER.length);
}

/** 이미 올린 인증 게시물의 사진(여러 장)/메모를 통째로 수정하는 바텀시트. */
export function EditPostSheet({ log, onClose, onSaved }: Props) {
  useLockBodyScroll();
  const showToast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  // 기존에 올라가 있던 사진 (남겨둘 것만 유지)
  const [keptUrls, setKeptUrls] = useState<string[]>(log.photo_urls);
  // 이번에 새로 추가한 파일
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const [memo, setMemo] = useState(log.memo ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalCount = keptUrls.length + newFiles.length;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length === 0) return;
    const room = MAX_PHOTOS - totalCount;
    const accepted = picked.slice(0, room);
    setNewFiles((prev) => [...prev, ...accepted]);
    setNewPreviews((prev) => [...prev, ...accepted.map((f) => URL.createObjectURL(f))]);
    e.target.value = "";
  }

  function removeKept(url: string) {
    setKeptUrls((prev) => prev.filter((u) => u !== url));
  }

  function removeNew(index: number) {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
    setNewPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (totalCount === 0) {
      setError("사진이 최소 1장은 있어야 해요.");
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();

    const uploadedUrls: string[] = [];
    for (const file of newFiles) {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${log.user_id}/${log.log_date}-${Date.now()}-${uploadedUrls.length}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("workout-photos")
        .upload(path, file, { cacheControl: "3600", upsert: false });

      if (uploadError) {
        setSaving(false);
        setError("사진 업로드에 실패했어요. 다시 시도해 주세요.");
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("workout-photos").getPublicUrl(path);
      uploadedUrls.push(publicUrl);
    }

    const finalPhotoUrls = [...keptUrls, ...uploadedUrls];

    const { error: updateError } = await supabase
      .from("workout_logs")
      .update({ photo_urls: finalPhotoUrls, memo: memo.trim() || null })
      .eq("id", log.id);

    setSaving(false);
    if (updateError) {
      setError("저장에 실패했어요. 다시 시도해 주세요.");
      return;
    }

    // 화면에서 뺀(더 이상 안 쓰는) 기존 사진 파일 정리 (best-effort)
    const removedUrls = log.photo_urls.filter((u) => !keptUrls.includes(u));
    const removedPaths = removedUrls.map(pathFromPublicUrl).filter((p): p is string => !!p);
    if (removedPaths.length > 0) {
      await supabase.storage.from("workout-photos").remove(removedPaths);
    }

    showToast("게시물을 수정했어요");
    onSaved();
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

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-[18px] font-bold text-foreground">게시물 수정</h3>
            <p className="mt-0.5 text-[12px] text-muted">사진 최대 {MAX_PHOTOS}장까지 첨부할 수 있어요</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-muted text-muted hover:bg-border/60"
          >
            <X size={18} />
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="grid grid-cols-3 gap-2">
          {keptUrls.map((url) => (
            <div key={url} className="relative aspect-square overflow-hidden rounded-2xl bg-surface-muted">
              <Image src={url} alt="기존 사진" fill className="object-cover" />
              <button
                onClick={() => removeKept(url)}
                aria-label="사진 제거"
                className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm"
              >
                <X size={13} />
              </button>
            </div>
          ))}
          {newPreviews.map((src, i) => (
            <div key={src} className="relative aspect-square overflow-hidden rounded-2xl bg-surface-muted">
              <Image src={src} alt="새로 추가한 사진" fill className="object-cover" />
              <span className="absolute left-1.5 top-1.5 rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">
                NEW
              </span>
              <button
                onClick={() => removeNew(i)}
                aria-label="사진 제거"
                className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm"
              >
                <X size={13} />
              </button>
            </div>
          ))}
          {totalCount < MAX_PHOTOS && (
            <button
              onClick={() => inputRef.current?.click()}
              className="flex aspect-square items-center justify-center rounded-2xl border-2 border-dashed border-border bg-surface-muted text-muted"
            >
              <Plus size={22} />
            </button>
          )}
        </div>

        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="오늘 운동 한 줄 메모 (선택)"
          rows={2}
          maxLength={200}
          className="mt-5 w-full resize-none rounded-2xl bg-surface-muted px-4 py-3.5 text-[14px] text-foreground outline-none"
        />

        {error && (
          <p className="mt-3 text-center text-[12px] text-warn">{error}</p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-6 w-full rounded-2xl bg-brand py-3.5 text-[15px] font-semibold text-white active:scale-[0.98] disabled:opacity-60"
        >
          {saving ? "저장 중..." : "수정 완료"}
        </button>
      </div>
    </div>
  );
}
