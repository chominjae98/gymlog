"use client";

import { useEffect } from "react";

/**
 * 서버 컴포넌트(page.tsx)에서 데이터 조회가 실패해 예외가 던져졌을 때 뜨는 화면.
 *
 * getWeeklyProgress/getMonthlySettlement처럼 벌금·정산 금액에 직결되는 조회는 실패를
 * 빈 배열로 조용히 감추지 않고 예외를 던지도록 되어 있다(dashboard-data.ts,
 * settlement-data.ts 참고) — "조회 실패"를 "벌금 0원"처럼 잘못된 값으로 보여주는 대신,
 * 이 화면으로 명확히 알리고 재시도할 수 있게 한다.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("페이지 렌더링 중 오류:", error);
  }, [error]);

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-background px-6">
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-warn-soft/40 blur-[64px]" />

      <div className="relative flex flex-col items-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-surface-muted text-[30px] shadow-[var(--shadow-soft)]">
          😵
        </div>
        <div>
          <p className="text-[18px] font-bold tracking-tight text-foreground">
            문제가 생겼어요
          </p>
          <p className="mt-1.5 text-[13px] text-muted">
            데이터를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
          </p>
        </div>
        <button
          onClick={reset}
          className="mt-2 rounded-full bg-brand px-5 py-2.5 text-[13px] font-semibold text-white active:scale-[0.97]"
        >
          다시 시도
        </button>
      </div>
    </div>
  );
}
