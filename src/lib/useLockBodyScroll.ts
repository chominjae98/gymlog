"use client";

import { useLayoutEffect } from "react";

/**
 * 바텀시트/모달이 떠 있는 동안 뒤 배경(body)이 같이 스크롤되는 걸 막는다.
 * 열려있는 동안만 body에 overflow:hidden을 걸고, 닫히면 원래 값으로 복원한다.
 */
export function useLockBodyScroll() {
  useLayoutEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);
}
