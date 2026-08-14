"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Camera, Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toDateKey } from "@/lib/date";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import { useToast } from "@/components/ToastProvider";

type Props = {
  userId: string;
  onClose: () => void;
  onUploaded: () => void;
};

const MAX_PHOTOS = 5;

export function UploadSheet({ userId, onClose, onUploaded }: Props) {
  useLockBodyScroll();
  const showToast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [memo, setMemo] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length === 0) return;
    const room = MAX_PHOTOS - files.length;
    const accepted = picked.slice(0, room);
    setFiles((prev) => [...prev, ...accepted]);
    setPreviews((prev) => [...prev, ...accepted.map((f) => URL.createObjectURL(f))]);
    e.target.value = ""; // 같은 파일 다시 선택 가능하도록
  }

  function removePhoto(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (files.length === 0) {
      setError("사진을 먼저 선택해 주세요.");
      return;
    }
    setUploading(true);
    setError(null);

    const supabase = createClient();
    const todayKey = toDateKey(new Date());

    const photoUrls: string[] = [];
    for (const file of files) {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${userId}/${todayKey}-${Date.now()}-${photoUrls.length}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("workout-photos")
        .upload(path, file, { cacheControl: "3600", upsert: false });

      if (uploadError) {
        setUploading(false);
        setError("업로드에 실패했어요. 다시 시도해 주세요.");
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("workout-photos").getPublicUrl(path);
      photoUrls.push(publicUrl);
    }

    const { error: insertError } = await supabase.from("workout_logs").insert({
      user_id: userId,
      log_date: todayKey,
      photo_urls: photoUrls,
      memo: memo.trim() || null,
    });

    setUploading(false);
    if (insertError) {
      setError("기록 저장에 실패했어요. 다시 시도해 주세요.");
      return;
    }
    showToast("오늘 운동을 인증했어요! 🔥");
    onUploaded();
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
            <h3 className="text-[18px] font-bold text-foreground">오늘 운동 인증</h3>
            <p className="mt-0.5 text-[12px] text-muted">사진 최대 {MAX_PHOTOS}장까지 첨부할 수 있어요</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-muted text-muted hover:bg-border/60"
          >
            <X size={18} />
          </button>
        </div>

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
          placeholder="오늘 운동 한 줄 메모 (선택)"
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
