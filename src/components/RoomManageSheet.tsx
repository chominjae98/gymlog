"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Landmark, LogOut, Share2, Users, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getRoomMembers, leaveRoom, type RoomMemberProfile } from "@/lib/rooms-data";
import { getRoomAccentClasses } from "@/lib/room-colors";
import { shareRoomInvite } from "@/lib/share";
import { useCloseOnBackButton } from "@/lib/useCloseOnBackButton";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import { useToast } from "@/components/ToastProvider";
import type { Room } from "@/types/database";

type Props = {
  room: Room;
  userId: string;
  onClose: () => void;
  onLeft: () => void;
};

/** 방 하나를 관리하는 화면: 초대 코드 공유, 정산 계좌(방장만), 멤버 목록, 방 나가기. */
export function RoomManageSheet({ room, userId, onClose, onLeft }: Props) {
  useLockBodyScroll();
  useCloseOnBackButton(onClose);
  const showToast = useToast();
  const accent = getRoomAccentClasses(room.id);
  const isOwner = room.created_by === userId;

  const [members, setMembers] = useState<RoomMemberProfile[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const [editingAccount, setEditingAccount] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);
  const [settlementBank, setSettlementBank] = useState(room.settlement_bank ?? "");
  const [settlementAccountNo, setSettlementAccountNo] = useState(room.settlement_account_no ?? "");
  const [settlementAccountHolder, setSettlementAccountHolder] = useState(
    room.settlement_account_holder ?? ""
  );
  const hasSettlementAccount = Boolean(settlementBank && settlementAccountNo);

  useEffect(() => {
    let cancelled = false;
    getRoomMembers(createClient(), room.id)
      .then((data) => {
        if (!cancelled) setMembers(data);
      })
      .catch((error) => {
        console.error("방 멤버 목록 조회 실패:", room.id, error);
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [room.id]);

  async function handleShare() {
    const result = await shareRoomInvite(room);
    showToast(result === "shared" ? "초대를 공유했어요" : "초대 문구를 클립보드에 복사했어요");
  }

  async function handleSaveSettlementAccount() {
    setSavingAccount(true);
    const { error } = await createClient()
      .from("rooms")
      .update({
        settlement_bank: settlementBank.trim() || null,
        settlement_account_no: settlementAccountNo.trim() || null,
        settlement_account_holder: settlementAccountHolder.trim() || null,
      })
      .eq("id", room.id);
    setSavingAccount(false);
    if (error) {
      showToast("계좌 저장에 실패했어요. 다시 시도해 주세요.", "error");
      return;
    }
    setEditingAccount(false);
    showToast("정산 계좌를 저장했어요");
  }

  async function handleLeave() {
    if (!window.confirm(`"${room.name}" 방에서 나갈까요?`)) return;
    setLeaving(true);
    try {
      await leaveRoom(createClient(), room.id);
      showToast(`"${room.name}" 방에서 나갔어요`);
      onLeft();
    } catch (error) {
      console.error("방 나가기 실패:", error);
      setLeaving(false);
      showToast("방 나가기에 실패했어요. 다시 시도해 주세요.", "error");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 bg-black/35 backdrop-blur-[1px]"
      />
      <div className="animate-modal-pop relative z-10 flex max-h-[85dvh] w-full max-w-md flex-col overflow-hidden rounded-[28px] bg-background shadow-[var(--shadow-pop)]">
        <div className="shrink-0 px-5 pb-3 pt-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${accent.soft}`}
              >
                <span className={`text-[14px] font-bold ${accent.strong}`}>
                  {room.name.charAt(0)}
                </span>
              </span>
              <h3 className="truncate text-[17px] font-bold text-foreground">{room.name}</h3>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-muted"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-5">
          <button
            onClick={handleShare}
            className="surface-card flex w-full items-center justify-between px-4 py-3.5 text-left transition active:scale-[0.99]"
          >
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-foreground">초대 코드</p>
              <p className="mt-0.5 text-[15px] font-bold tracking-[0.15em] text-brand-strong">
                {room.invite_code}
              </p>
            </div>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center text-brand-strong">
              <Share2 size={18} />
            </span>
          </button>

          {isOwner && (
            <div className="surface-card mt-3 px-4 py-3.5">
              {editingAccount ? (
                <div className="flex flex-col gap-2">
                  <p className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
                    <Landmark size={14} className="text-muted" />
                    정산 계좌
                  </p>
                  <input
                    value={settlementBank}
                    onChange={(e) => setSettlementBank(e.target.value)}
                    placeholder="은행명 (예: 카카오뱅크)"
                    className="rounded-xl bg-surface-muted px-3 py-2 text-[13px] text-foreground outline-none"
                  />
                  <input
                    value={settlementAccountNo}
                    onChange={(e) => setSettlementAccountNo(e.target.value)}
                    placeholder="계좌번호"
                    inputMode="numeric"
                    className="rounded-xl bg-surface-muted px-3 py-2 text-[13px] text-foreground outline-none"
                  />
                  <input
                    value={settlementAccountHolder}
                    onChange={(e) => setSettlementAccountHolder(e.target.value)}
                    placeholder="예금주명 (선택)"
                    className="rounded-xl bg-surface-muted px-3 py-2 text-[13px] text-foreground outline-none"
                  />
                  <p className="text-[11px] text-muted">
                    등록한 계좌는 같은 방 멤버에게만 보이고, 정산 요약에서 본인 몫을 토스로 바로
                    송금할 때 쓰여요.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSettlementBank(room.settlement_bank ?? "");
                        setSettlementAccountNo(room.settlement_account_no ?? "");
                        setSettlementAccountHolder(room.settlement_account_holder ?? "");
                        setEditingAccount(false);
                      }}
                      className="flex-1 rounded-xl py-2 text-[12.5px] font-semibold text-muted transition active:scale-[0.98]"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleSaveSettlementAccount}
                      disabled={savingAccount || !settlementBank.trim() || !settlementAccountNo.trim()}
                      className="flex-1 rounded-xl bg-brand py-2 text-[12.5px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
                    >
                      {savingAccount ? "저장 중..." : "저장"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
                      <Landmark size={14} className="text-muted" />
                      정산 계좌
                    </p>
                    <p className="mt-1 text-[13px] text-muted">
                      {hasSettlementAccount
                        ? `${settlementBank} ${settlementAccountNo}${
                            settlementAccountHolder ? ` (${settlementAccountHolder})` : ""
                          }`
                        : "등록하면 정산 요약에서 원클릭 송금 버튼이 생겨요"}
                    </p>
                  </div>
                  <button
                    onClick={() => setEditingAccount(true)}
                    className="shrink-0 text-[12px] font-semibold text-brand-strong"
                  >
                    {hasSettlementAccount ? "수정" : "등록하기"}
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="mt-5 flex items-center gap-1.5 px-1">
            <Users size={14} className="text-muted" />
            <p className="text-[12.5px] font-semibold text-muted">
              멤버 {members ? members.length : ""}
            </p>
          </div>

          {loadError ? (
            <p className="mt-2 rounded-2xl px-4 py-6 text-center text-[13px] text-muted">
              멤버 목록을 불러오지 못했어요.
            </p>
          ) : members === null ? (
            <p className="mt-2 rounded-2xl px-4 py-6 text-center text-[13px] text-muted">
              불러오는 중...
            </p>
          ) : (
            <ul className="surface-card mt-2 flex flex-col divide-y divide-border px-3.5">
              {members.map((m) => (
                <li key={m.id} className="flex items-center gap-2.5 py-2.5">
                  <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-brand-soft">
                    {m.avatar_url && (
                      <Image src={m.avatar_url} alt="" fill sizes="32px" className="object-cover" />
                    )}
                  </div>
                  <span className="truncate text-[13.5px] font-semibold text-foreground">
                    {m.nickname}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <button
            onClick={handleLeave}
            disabled={leaving}
            className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-2xl py-3 text-[13px] font-semibold text-warn transition active:scale-[0.98] disabled:opacity-60"
          >
            <LogOut size={15} />
            {leaving ? "나가는 중..." : "방 나가기"}
          </button>
        </div>
      </div>
    </div>
  );
}
