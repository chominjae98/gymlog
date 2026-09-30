import * as Clipboard from "expo-clipboard";
import * as Linking from "expo-linking";
import { Share } from "react-native";
import type { Room } from "@/types/database";

/** 초대 코드를 담은 참가 링크. 커스텀 스킴 딥링크로 만든다 (app.json의 scheme 기준). */
export function buildRoomInviteLink(room: Room) {
  return Linking.createURL("join", { queryParams: { code: room.invite_code } });
}

/**
 * 방 초대를 공유한다. RN의 공유 시트를 열고, 실패/취소 시 클립보드 복사로 대체한다.
 * (웹 버전의 3단 폴백 중 토스 SDK 단계는 네이티브 앱에선 의미가 없어 제거했다.)
 */
export async function shareRoomInvite(room: Room): Promise<"shared" | "copied"> {
  const link = buildRoomInviteLink(room);
  const message = `[운인방] "${room.name}" 방에 초대할게요! 초대 코드: ${room.invite_code}\n${link}`;

  try {
    const result = await Share.share({ message });
    if (result.action !== Share.dismissedAction) return "shared";
  } catch {
    // 공유 시트 자체를 열지 못한 경우 클립보드 복사로 넘어간다.
  }

  await Clipboard.setStringAsync(message);
  return "copied";
}

/**
 * 정산(벌금) 송금을 요청하는 메시지를 공유한다. 특정 상대를 지정해서 자동으로
 * 돈을 보내는 건 불가능하므로(전자금융업 라이선스 없이는 임의의 P2P 송금 API를
 * 쓸 수 없음), 카카오톡/문자 등 사용자가 직접 앱을 골라 보낼 수 있는 공유
 * 시트를 열어준다 — shareRoomInvite와 동일한 폴백.
 */
export async function shareSettlementRequest(
  nickname: string,
  amount: number,
  monthLabel: string,
  roomName: string
): Promise<"shared" | "copied"> {
  const message = `[운인방] "${roomName}" ${monthLabel} 정산 — ${nickname}님 벌금 ${amount.toLocaleString()}원 부탁드려요 🙏`;

  try {
    const result = await Share.share({ message });
    if (result.action !== Share.dismissedAction) return "shared";
  } catch {
    // 공유 시트 자체를 열지 못한 경우 클립보드 복사로 넘어간다.
  }

  await Clipboard.setStringAsync(message);
  return "copied";
}
