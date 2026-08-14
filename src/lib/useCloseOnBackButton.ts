"use client";

import { useEffect, useRef } from "react";
import { registerModalBackGuard } from "@/lib/modal-back-guard";

/**
 * 모달/바텀시트 컴포넌트에서 호출하면, 열려있는 동안 기기 뒤로가기를 눌렀을 때
 * 앱이 꺼지는 대신 이 모달만 닫히게(onClose 호출) 된다.
 */
export function useCloseOnBackButton(onClose: () => void) {
  const onCloseRef = useRef(onClose);

  // onClose가 매 렌더 새로 생성되는 인라인 함수라도 최신 값을 ref에 반영한다.
  // (렌더 중이 아니라 커밋 이후 이펙트에서 갱신 — popstate는 사용자가 실제로
  //  뒤로가기를 눌러야 발생하므로, 이 갱신이 그보다 항상 먼저 끝나 있다)
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    // 히스토리 항목 등록/해제는 최초 마운트 시 1번만 수행한다.
    return registerModalBackGuard(() => onCloseRef.current());
  }, []);
}
