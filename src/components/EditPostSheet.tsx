"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Camera, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import { useToast } from "@/components/ToastProvider";
import type { WorkoutLogWithProfile } from "@/types/database";

type Props = {
  log: WorkoutLogWithProfile;
  onClose: () => void;
  onSaved: () => void;
};

/** 이미 올린 인증 게시물의 사진/메모를 통째로 수정하는 바텀시트. */
export function EditPostSheet({ log, onClose, onSaved }: Props) {
  useLockBodyScroll();
  const showToast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>(log.photo_url);
  const [memo, setMemo] = useState(log.memo ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (!picked) return;
    setFile(picked);
    setPreview(URL.createObjectURL(picked));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const supabase = createClient();

    let photoUrl = log.photo_url;

    if (file) {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${log.user_id}/${log.log_date}-${Date.now()}.${ext}`;
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
      photoUrl = publicUrl;
    }

    const { error: updateError } = await supabase
      .from("workout_logs")
      .update({ photo_url: photoUrl, memo: memo.trim() || null })
      .eq("id", log.id);

    setSaving(false);
    if (updateError) {
      setError("저장에 실패했어요. 다시 시도해 주세요.");
      return;
    }

    // 사진을 새로 바꿨다면 예전 사진 파일은 정리 (best-effort)
    if (file && photoUrl !== log.photo_url) {
      const marker = "/workout-photos/";
      const idx = log.photo_url.indexOf(marker);
      if (idx !== -1) {
        const oldPath = log.photo_url.slice(idx + marker.length);
        await supabase.storage.from("workout-photos").remove([oldPath]);
      }
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
      <div className="animate-sheet-up safe-bottom relative z-10 max-h-[88dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-[32px] bg-background px-5 pt-4 pb-8 shadow-[var(--shadow-pop)]">
        <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-border" />

        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[17px] font-bold text-foreground">게시물 수정</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface-muted"
          >
            <X size={18} />
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        <button
          onClick={() => inputRef.current?.click()}
          className="relative flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-2xl bg-surface-muted"
        >
          <Image src={preview} alt="현재 사진" fill className="object-cover" />
          <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-black/45 py-2.5 text-[12.5px] font-semibold text-white backdrop-blur-sm">
            <Camera size={14} />
            사진 바꾸기
          </span>
        </button>

        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="오늘 운동 한 줄 메모 (선택)"
          rows={2}
          maxLength={200}
          className="mt-4 w-full resize-none rounded-2xl bg-surface-muted px-4 py-3 text-[14px] text-foreground outline-none"
        />

        {error && (
          <p className="mt-3 text-center text-[12px] text-warn">{error}</p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-5 w-full rounded-2xl bg-brand py-3.5 text-[15px] font-semibold text-white active:scale-[0.98] disabled:opacity-60"
        >
          {saving ? "저장 중..." : "수정 완료"}
        </button>
      </div>
    </div>
  );
}
