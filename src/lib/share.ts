import type { Room } from "@/types/database";

/** 초대 코드를 담은 참가 링크. 앱 로그인 화면과 동일하게 현재 오리진 기준으로 만든다. */
export function buildRoomInviteLink(room: Room) {
  return `${window.location.origin}/?join=${room.invite_code}`;
}

/**
 * 방 초대를 공유한다. 토스 웹뷰 안이면 네이티브 공유 시트를,
 * 아니면 브라우저 공유 시트를, 그것도 없으면 클립보드 복사로 단계적으로 대체한다.
 * (signInWithToss와 동일한 "기능 감지 후 폴백" 방식.)
 */
export async function shareRoomInvite(room: Room): Promise<"shared" | "copied"> {
  const link = buildRoomInviteLink(room);
  const message = `[오운완] "${room.name}" 방에 초대할게요! 초대 코드: ${room.invite_code}\n${link}`;

  try {
    const { Share } = await import("@apps-in-toss/web-framework");
    await Share.sendMessage({ message });
    return "shared";
  } catch {
    // 토스 웹뷰가 아니거나 SDK 호출이 실패하면 다음 방법으로 넘어간다.
  }

  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ text: message, url: link });
      return "shared";
    } catch {
      // 사용자가 공유를 취소한 경우도 여기로 오므로, 조용히 클립보드 복사로 넘어간다.
    }
  }

  await navigator.clipboard.writeText(message);
  return "copied";
}

/**
 * 정산(벌금) 송금을 요청하는 메시지를 공유한다. 특정 상대를 지정해서 자동으로
 * 돈을 보내는 건 불가능하므로(전자금융업 라이선스 없이는 임의의 P2P 송금 API를
 * 쓸 수 없음), 카카오톡/문자 등 사용자가 직접 앱을 골라 보낼 수 있는 공유
 * 시트를 열어준다 — shareRoomInvite와 동일한 3단 폴백.
 */
export async function shareSettlementRequest(
  nickname: string,
  amount: number,
  monthLabel: string,
  roomName: string
): Promise<"shared" | "copied"> {
  const message = `[오운완] "${roomName}" ${monthLabel} 정산 — ${nickname}님 벌금 ${amount.toLocaleString()}원 부탁드려요 🙏`;

  try {
    const { Share } = await import("@apps-in-toss/web-framework");
    await Share.sendMessage({ message });
    return "shared";
  } catch {
    // 토스 웹뷰가 아니거나 SDK 호출이 실패하면 다음 방법으로 넘어간다.
  }

  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ text: message });
      return "shared";
    } catch {
      // 사용자가 공유를 취소한 경우도 여기로 오므로, 조용히 클립보드 복사로 넘어간다.
    }
  }

  await navigator.clipboard.writeText(message);
  return "copied";
}
