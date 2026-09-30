/**
 * 방마다 고정된 색상을 하나씩 배정한다(그라데이션 없이 단색으로만 구분).
 * "참여 중인 방" 목록/관리 화면, 그리고 지금 보고 있는 방이 어디인지 한눈에
 * 알려주는 용도 — 홈 화면(대시보드)과는 다른 느낌을 주기 위한 장치다.
 */
export type RoomAccentKey = "blue" | "purple" | "amber" | "rose" | "teal";

const ACCENT_KEYS: RoomAccentKey[] = ["blue", "purple", "amber", "rose", "teal"];

const ACCENT_CLASSES: Record<RoomAccentKey, { soft: string; strong: string }> = {
  blue: { soft: "bg-room-blue-soft", strong: "text-room-blue" },
  purple: { soft: "bg-room-purple-soft", strong: "text-room-purple" },
  amber: { soft: "bg-room-amber-soft", strong: "text-room-amber" },
  rose: { soft: "bg-room-rose-soft", strong: "text-room-rose" },
  teal: { soft: "bg-room-teal-soft", strong: "text-room-teal" },
};

/** 방 id를 해시해 고정된 색상 키를 결정적으로 고른다(같은 방은 항상 같은 색). */
export function getRoomAccentKey(roomId: string): RoomAccentKey {
  let hash = 0;
  for (let i = 0; i < roomId.length; i++) {
    hash = (hash * 31 + roomId.charCodeAt(i)) | 0;
  }
  return ACCENT_KEYS[Math.abs(hash) % ACCENT_KEYS.length];
}

export function getRoomAccentClasses(roomId: string) {
  return ACCENT_CLASSES[getRoomAccentKey(roomId)];
}
