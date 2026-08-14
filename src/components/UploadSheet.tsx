"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Camera, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toDateKey } from "@/lib/date";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import { useToast } from "@/components/ToastProvider";

type Props = {
  userId: string;
  onClose: () => void;
  onUploaded: () => void;
};

export function UploadSheet({ userId, onClose, onUploaded }: Props) {
  useLockBodyScroll();
  const showToast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [memo, setMemo] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (!picked) return;
    setFile(picked);
    setPreview(URL.createObjectURL(picked));
  }

  async function handleSubmit() {
    if (!file) {
      setError("사진을 먼저 선택해 주세요.");
      return;
    }
    setUploading(true);
    setError(null);

    const supabase = createClient();
    const todayKey = toDateKey(new Date());
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/${todayKey}-${Date.now()}.${ext}`;

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

    const { error: insertError } = await supabase.from("workout_logs").insert({
      user_id: userId,
      log_date: todayKey,
      photo_url: publicUrl,
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
      <div className="animate-sheet-up safe-bottom relative z-10 max-h-[88dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-[32px] bg-background px-5 pt-4 pb-8 shadow-[var(--shadow-pop)]">
        <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-border" />

        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[17px] font-bold text-foreground">오늘 운동 인증</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface-muted"
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
          onChange={handleFileChange}
          className="hidden"
        />

        <button
          onClick={() => inputRef.current?.click()}
          className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-border bg-surface-muted"
        >
          {preview ? (
            <Image src={preview} alt="선택한 사진 미리보기" fill className="object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted">
              <Camera size={28} />
              <span className="text-[13px] font-medium">사진 선택하기</span>
            </div>
          )}
        </button>

        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="오늘 운동 한 줄 메모 (선택)"
          rows={2}
          maxLength={200}
          className="mt-4 w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-[14px] text-foreground outline-none focus:border-brand"
        />

        {error && (
          <p className="mt-3 text-center text-[12px] text-warn">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={uploading}
          className="mt-5 w-full rounded-2xl bg-brand py-3.5 text-[15px] font-semibold text-white active:scale-[0.98] disabled:opacity-60"
        >
          {uploading ? "업로드 중..." : "인증 완료"}
        </button>
      </div>
    </div>
  );
}
