"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Target } from "lucide-react";
import { useCloseOnBackButton } from "@/lib/useCloseOnBackButton";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import type { WeeklyProgress } from "@/types/database";

const COMPACT_LIMIT = 3;
const DETAIL_LIMIT = 10;

function rankMostWorkouts(progress: WeeklyProgress[], limit: number) {
  return [...progress]
    .filter((p) => p.achievedDays > 0)
    .sort((a, b) => b.achievedDays - a.achievedDays)
    .slice(0, limit);
}

function rankGoalAchievers(progress: WeeklyProgress[], limit: number) {
  return progress
    .filter((p) => p.targetDays != null && p.targetDays > 0)
    .map((p) => ({ ...p, rate: p.achievedDays / p.targetDays! }))
    .sort((a, b) => b.rate - a.rate || b.achievedDays - a.achievedDays)
    .slice(0, limit);
}

/**
 * 홈 화면 전용 "주간 리포트". 홈은 전체 이용자가 함께 기록을 올리는 곳이므로,
 * 개인 통계 대신 "이번 주에 가장 많이 운동한 사람"과 "목표 달성률이 높은 사람"(예:
 * 주 4일 목표에 3일 가면 75%, 4일 다 채우면 100%, 5일이면 125% — 초과분도 그대로
 * 반영한다)을 전체 이용자 기준으로 보여준다. 카드를 누르면 상위 10명까지 보는
 * 상세 화면(WeeklyReportSheet)이 열린다.
 */
export function WeeklyReport({
  progress,
  currentUserId,
}: {
  progress: WeeklyProgress[];
  currentUserId: string;
}) {
  const [showDetail, setShowDetail] = useState(false);
  const mostWorkouts = rankMostWorkouts(progress, COMPACT_LIMIT);
  const goalAchievers = rankGoalAchievers(progress, COMPACT_LIMIT);
  const isEmpty = mostWorkouts.length === 0 && goalAchievers.length === 0;

  return (
    <>
      <button
        onClick={() => !isEmpty && setShowDetail(true)}
        disabled={isEmpty}
        className="surface-card px-4 py-3.5 text-left transition active:scale-[0.99] disabled:active:scale-100"
      >
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-semibold text-foreground">주간 리포트</p>
          {!isEmpty && <ChevronRight size={16} className="text-muted" />}
        </div>

        {isEmpty ? (
          <p className="mt-0.5 text-[12px] text-muted">
            아직 이번 주 기록이 없어요. 가장 먼저 운동을 인증해 보세요!
          </p>
        ) : (
          <div className="mt-3 flex flex-col gap-4">
            {mostWorkouts.length > 0 && (
              <div>
                <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-muted">
                  <span className="text-[13px] leading-none">🔥</span>
                  가장 많이 운동한 사람
                </div>
                <ul className="flex flex-col gap-2.5">
                  {mostWorkouts.map((p, i) => (
                    <ReportRow
                      key={p.profile.id}
                      rank={i + 1}
                      nickname={p.profile.nickname}
                      avatarUrl={p.profile.avatar_url}
                      isMe={p.profile.id === currentUserId}
                      stat={`${p.achievedDays}일`}
                    />
                  ))}
                </ul>
              </div>
            )}

            {goalAchievers.length > 0 && (
              <div>
                <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-muted">
                  <Target size={13} className="text-brand-strong" />
                  목표 달성률 TOP
                </div>
                <ul className="flex flex-col gap-2.5">
                  {goalAchievers.map((p, i) => (
                    <ReportRow
                      key={p.profile.id}
                      rank={i + 1}
                      nickname={p.profile.nickname}
                      avatarUrl={p.profile.avatar_url}
                      isMe={p.profile.id === currentUserId}
                      stat={`${Math.round(p.rate * 100)}%`}
                    />
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </button>

      {showDetail && (
        <WeeklyReportSheet
          progress={progress}
          currentUserId={currentUserId}
          onClose={() => setShowDetail(false)}
        />
      )}
    </>
  );
}

/**
 * 주간 리포트 카드를 눌렀을 때 보여주는 상세 화면 — 카테고리별 상위 10명까지 보여준다.
 * 다른 시트들(가운데 뜨는 카드형 다이얼로그)과 달리, 목록이 길어질 수 있어 화면
 * 전체를 채우는 "페이지"처럼 아래에서 올라와 전환되고, 뒤로가기 버튼으로 돌아간다.
 */
function WeeklyReportSheet({
  progress,
  currentUserId,
  onClose,
}: {
  progress: WeeklyProgress[];
  currentUserId: string;
  onClose: () => void;
}) {
  useLockBodyScroll();
  useCloseOnBackButton(onClose);
  const mostWorkouts = rankMostWorkouts(progress, DETAIL_LIMIT);
  const goalAchievers = rankGoalAchievers(progress, DETAIL_LIMIT);

  return (
    <div className="animate-sheet-up fixed inset-0 z-40 flex flex-col bg-background">
      <div className="safe-top shrink-0 border-b border-border px-2 pb-3 pt-3">
        <div className="flex items-center gap-1">
          <button
            onClick={onClose}
            aria-label="뒤로가기"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-foreground transition active:scale-90"
          >
            <ChevronLeft size={22} />
          </button>
          <h3 className="text-[17px] font-bold text-foreground">주간 리포트</h3>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-8 pt-4">
        <div className="mx-auto flex max-w-md flex-col gap-5">
          {mostWorkouts.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-[12.5px] font-semibold text-muted">
                <span className="text-[14px] leading-none">🔥</span>
                가장 많이 운동한 사람
              </div>
              <ul className="flex flex-col gap-3">
                {mostWorkouts.map((p, i) => (
                  <ReportRow
                    key={p.profile.id}
                    rank={i + 1}
                    nickname={p.profile.nickname}
                    avatarUrl={p.profile.avatar_url}
                    isMe={p.profile.id === currentUserId}
                    stat={`${p.achievedDays}일`}
                  />
                ))}
              </ul>
            </div>
          )}

          {goalAchievers.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-[12.5px] font-semibold text-muted">
                <Target size={14} className="text-brand-strong" />
                목표 달성률 TOP
              </div>
              <ul className="flex flex-col gap-3">
                {goalAchievers.map((p, i) => (
                  <ReportRow
                    key={p.profile.id}
                    rank={i + 1}
                    nickname={p.profile.nickname}
                    avatarUrl={p.profile.avatar_url}
                    isMe={p.profile.id === currentUserId}
                    stat={`${Math.round(p.rate * 100)}%`}
                  />
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReportRow({
  rank,
  nickname,
  avatarUrl,
  isMe,
  stat,
}: {
  rank: number;
  nickname: string;
  avatarUrl: string | null;
  isMe: boolean;
  stat: string;
}) {
  return (
    <li className="flex items-center gap-2.5">
      <span className="w-4 shrink-0 text-center text-[12px] font-bold text-muted">{rank}</span>
      <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full bg-surface-muted">
        {avatarUrl && <Image src={avatarUrl} alt="" fill sizes="28px" className="object-cover" />}
      </div>
      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
        {nickname}
        {isMe && <span className="ml-1.5 text-[11px] font-medium text-brand-strong">나</span>}
      </span>
      <span className="shrink-0 text-[12.5px] font-bold text-foreground">{stat}</span>
    </li>
  );
}
