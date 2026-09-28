"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Receipt, Send, Share2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatMonthTitle, nowInSeoul } from "@/lib/date";
import { getMonthlySettlement } from "@/lib/settlement-data";
import { shareSettlementRequest } from "@/lib/share";
import { buildTossTransferLink } from "@/lib/toss-transfer";
import { useCloseOnBackButton } from "@/lib/useCloseOnBackButton";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import { useToast } from "@/components/ToastProvider";
import type { MonthlySettlement, Room } from "@/types/database";

type Props = {
  monthDate: Date;
  weeklyFine: number;
  room: Room;
  userId: string;
  onClose: () => void;
};

export function SettlementSheet({ monthDate, weeklyFine, room, userId, onClose }: Props) {
  useLockBodyScroll();
  useCloseOnBackButton(onClose);
  const showToast = useToast();
  const [settlement, setSettlement] = useState<MonthlySettlement[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    getMonthlySettlement(supabase, monthDate, nowInSeoul(), weeklyFine, room.id)
      .then((data) => {
        if (!cancelled) setSettlement(data);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [monthDate, weeklyFine, room.id]);

  const hasSettlementAccount = Boolean(room.settlement_bank && room.settlement_account_no);

  function handlePay(amount: number) {
    const link =
      room.settlement_bank && room.settlement_account_no
        ? buildTossTransferLink(room.settlement_bank, room.settlement_account_no, amount)
        : null;
    if (!link) return;
    // 토스 앱이 설치돼 있으면 계좌·금액이 채워진 송금 화면으로 바로 이동한다.
    // 설치돼 있지 않으면(커스텀 스킴을 처리할 앱이 없으면) 브라우저가 조용히 무시한다.
    window.location.assign(link);
  }

  async function handleShareRequest(nickname: string, amount: number) {
    const result = await shareSettlementRequest(nickname, amount, formatMonthTitle(monthDate), room.name);
    showToast(result === "shared" ? "정산 요청을 공유했어요" : "정산 요청 문구를 복사했어요");
  }

  const sorted = settlement
    ? [...settlement].sort((a, b) => b.totalFine - a.totalFine)
    : [];
  const totalPot = sorted.reduce((sum, s) => sum + s.totalFine, 0);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <button
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 bg-black/35 backdrop-blur-[1px]"
      />
      <div className="animate-modal-pop relative z-10 flex max-h-[85dvh] w-full max-w-md flex-col overflow-hidden rounded-[28px] bg-background shadow-[var(--shadow-pop)]">
        <div className="shrink-0 px-5 pb-3 pt-5">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-[17px] font-bold text-foreground">
              <Receipt size={17} className="text-brand-strong" />
              {formatMonthTitle(monthDate)} 정산 요약
            </h3>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface-muted"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-4">
          {loadError ? (
            <div className="flex h-40 flex-col items-center justify-center gap-1 text-center text-[13px] text-muted">
              <p>정산 정보를 불러오지 못했어요.</p>
              <p>잠시 후 다시 열어봐 주세요.</p>
            </div>
          ) : settlement === null ? (
            <div className="flex h-40 items-center justify-center text-[13px] text-muted">
              불러오는 중...
            </div>
          ) : sorted.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl bg-surface-muted py-10 text-center">
              <span className="text-2xl">🧾</span>
              <p className="text-[13px] text-muted">이 달에는 정산할 내역이 없어요</p>
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {sorted.map((s) => {
                const isMe = s.profile.id === userId;
                return (
                  <li key={s.profile.id} className="flex flex-col gap-2 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-surface-muted">
                        {s.profile.avatar_url && (
                          <Image
                            src={s.profile.avatar_url}
                            alt=""
                            fill
                            sizes="36px"
                            className="object-cover"
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-semibold text-foreground">
                          {s.profile.nickname}
                        </p>
                      </div>
                      <span
                        className={[
                          "shrink-0 text-[14px] font-bold",
                          s.totalFine > 0 ? "text-warn" : "text-muted",
                        ].join(" ")}
                      >
                        {s.totalFine.toLocaleString()}원
                      </span>
                    </div>

                    {s.totalFine > 0 && (
                      <div className="flex items-center gap-1.5 pl-12">
                        {isMe && hasSettlementAccount && (
                          <button
                            onClick={() => handlePay(s.totalFine)}
                            className="flex items-center gap-1 rounded-full bg-[#0064FF] px-3 py-1.5 text-[11.5px] font-semibold text-white transition active:scale-95"
                          >
                            <Send size={11} />
                            토스로 송금하기
                          </button>
                        )}
                        {!isMe && (
                          <button
                            onClick={() => handleShareRequest(s.profile.nickname, s.totalFine)}
                            className="flex items-center gap-1 rounded-full bg-surface-muted px-3 py-1.5 text-[11.5px] font-semibold text-foreground transition active:scale-95"
                          >
                            <Share2 size={11} />
                            정산 요청 보내기
                          </button>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {sorted.length > 0 && (
          <div className="shrink-0 border-t border-border px-5 py-4">
            <div className="flex items-center justify-between text-[13px]">
              <span className="font-medium text-muted">이 달 총액</span>
              <span className="font-bold text-foreground">{totalPot.toLocaleString()}원</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
