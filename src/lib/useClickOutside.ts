"use client";

import { useEffect, type RefObject } from "react";

/**
 * ref가 가리키는 요소 바깥을 클릭(mousedown)하면 onOutside를 호출한다.
 * 드롭다운/메뉴가 열려있을 때만(active) 리스너를 등록하도록 호출부에서 active를 넘긴다.
 */
export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
  onOutside: () => void
) {
  useEffect(() => {
    if (!active) return;
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onOutside();
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}
