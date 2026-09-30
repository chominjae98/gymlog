"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

function subscribe() {
  return () => {};
}

/**
 * 시트/모달을 document.body 바로 아래에 렌더링한다.
 * 부모 트리의 overflow/relative 조상(RoomsTab·Dashboard·LeaderboardView의 루트 등) 안에
 * 그대로 두면, 일부 웹뷰에서 position:fixed가 뷰포트가 아니라 그 조상 기준으로 잡혀
 * 모달이 화면 중앙이 아니라 조상 박스 하단에 붙어 보이는 문제가 생길 수 있다 — 포탈로
 * DOM 트리를 완전히 벗어나게 하면 이 클래스의 버그 자체가 원천적으로 사라진다.
 *
 * 서버에는 document가 없으므로, 하이드레이션이 끝나 클라이언트에서 다시 렌더링될
 * 때까지는 아무것도 그리지 않는다(useSyncExternalStore로 이펙트 없이 처리).
 */
export function Portal({ children }: { children: React.ReactNode }) {
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
  if (!mounted) return null;
  return createPortal(children, document.body);
}
