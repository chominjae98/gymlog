"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, KeyRound, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createRoom, joinRoomByCode } from "@/lib/rooms-data";
import { useToast } from "@/components/ToastProvider";

type Props = {
  initialCode?: string;
};

/**
 * 사용자가 속한 방이 하나도 없을 때 보여주는 온보딩 화면.
 * 새 방을 만들거나(누구나 방장이 될 수 있음), 초대 코드로 기존 방에 들어갈 수 있다.
 * ?join=코드 로 들어오면(초대 딥링크) 참가 코드 입력칸을 미리 채워둔다.
 */
export function RoomOnboarding({ initialCode }: Props) {
  const router = useRouter();
  const showToast = useToast();

  const [roomName, setRoomName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [code, setCode] = useState(initialCode?.toUpperCase() ?? "");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  async function handleCreate() {
    const trimmed = roomName.trim();
    if (trimmed.length === 0) {
      setCreateError("방 이름을 입력해 주세요.");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const room = await createRoom(createClient(), trimmed);
      showToast(`"${room.name}" 방을 만들었어요`);
      router.push(`/?room=${room.id}`);
      router.refresh();
    } catch {
      setCreating(false);
      setCreateError("방 생성에 실패했어요. 다시 시도해 주세요.");
    }
  }

  async function handleJoin() {
    const trimmed = code.trim();
    if (trimmed.length === 0) {
      setJoinError("초대 코드를 입력해 주세요.");
      return;
    }
    setJoining(true);
    setJoinError(null);
    try {
      const room = await joinRoomByCode(createClient(), trimmed);
      showToast(`"${room.name}" 방에 참가했어요`);
      router.push(`/?room=${room.id}`);
      router.refresh();
    } catch {
      setJoining(false);
      setJoinError("코드를 찾을 수 없어요. 다시 확인해 주세요.");
    }
  }

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-background">
      <div className="pointer-events-none absolute left-1/2 top-[10%] h-56 w-[85%] -translate-x-1/2 rounded-full bg-brand-soft/70 blur-[64px]" />

      <div className="safe-top relative flex flex-1 flex-col justify-center px-6 py-10">
        <div className="animate-fade-up mx-auto w-full max-w-sm text-center">
          <h1 className="text-[26px] font-bold leading-[1.3] tracking-tight text-foreground">
            같이 인증할 친구들과
            <br />
            <span className="text-brand-strong">방</span>을 만들어보세요
          </h1>
          <p className="mt-3 text-[13px] text-muted">
            방 안에서만 사진·벌금·투표가 공유돼요. 다른 방과는 완전히 분리됩니다.
          </p>
        </div>

        <div className="animate-fade-up mx-auto mt-10 w-full max-w-sm" style={{ animationDelay: "0.08s" }}>
          <div className="surface-card p-5">
            <div className="mb-3 flex items-center gap-1.5">
              <Plus size={15} className="text-brand-strong" />
              <h2 className="text-[14px] font-bold text-foreground">새 방 만들기</h2>
            </div>
            <input
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="예) 우리 헬스 모임"
              maxLength={30}
              className="w-full rounded-xl bg-surface-muted px-4 py-3 text-[14px] text-foreground outline-none"
            />
            {createError && <p className="mt-2 text-[12px] text-warn">{createError}</p>}
            <button
              onClick={handleCreate}
              disabled={creating}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand py-3 text-[14px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-60"
            >
              {creating ? "만드는 중..." : "방 만들기"}
              {!creating && <ArrowRight size={15} />}
            </button>
          </div>

          <div className="mt-4 flex items-center gap-3 px-1 text-[11px] text-muted">
            <span className="h-px flex-1 bg-border" />
            또는
            <span className="h-px flex-1 bg-border" />
          </div>

          <div className="surface-card mt-4 p-5">
            <div className="mb-3 flex items-center gap-1.5">
              <KeyRound size={15} className="text-brand-strong" />
              <h2 className="text-[14px] font-bold text-foreground">초대 코드로 참가하기</h2>
            </div>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="8자리 코드 입력"
              maxLength={8}
              className="w-full rounded-xl bg-surface-muted px-4 py-3 text-center text-[16px] font-bold tracking-[0.2em] text-foreground outline-none"
            />
            {joinError && <p className="mt-2 text-[12px] text-warn">{joinError}</p>}
            <button
              onClick={handleJoin}
              disabled={joining}
              className="mt-3 w-full rounded-xl bg-surface-muted py-3 text-[14px] font-semibold text-foreground transition active:scale-[0.98] disabled:opacity-60"
            >
              {joining ? "참가하는 중..." : "참가하기"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
