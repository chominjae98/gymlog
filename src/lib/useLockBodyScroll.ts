"use client";

import { useLayoutEffect } from "react";

// 시트가 여러 개 겹쳐 뜨는 경우(예: DayDrawer 위에 UploadSheet/EditPostSheet)를 대비한
// 전역 참조 카운터. 각 인스턴스가 마운트 시점 값을 따로 캡처했다가 복원하는 방식은
// 닫히는 순서가 열린 순서와 달라지면(마지막에 연 것보다 먼저 연 것이 먼저 닫히는 경우)
// 아직 열려 있는 다른 시트의 스크롤 잠금까지 풀려버리는 문제가 있었다 — 마지막 하나가
// 닫힐 때만 원래 값으로 복원하도록 바꿔 열림/닫힘 순서와 무관하게 안전하게 만든다.
let lockCount = 0;
let originalOverflow: string | null = null;

/**
 * 바텀시트/모달이 떠 있는 동안 뒤 배경(body)이 같이 스크롤되는 걸 막는다.
 * 열려있는 동안만 body에 overflow:hidden을 걸고, 마지막 시트가 닫히면 원래 값으로 복원한다.
 */
export function useLockBodyScroll() {
  useLayoutEffect(() => {
    if (lockCount === 0) {
      originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    lockCount += 1;
    return () => {
      lockCount -= 1;
      if (lockCount === 0) {
        document.body.style.overflow = originalOverflow ?? "";
        originalOverflow = null;
      }
    };
  }, []);
}
