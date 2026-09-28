"use client";

import { useState } from "react";
import { Check, Plus, Settings, X } from "lucide-react";
import { CreateRoomSheet } from "@/components/CreateRoomSheet";
import { JoinRoomSheet } from "@/components/JoinRoomSheet";
import { RoomManageSheet } from "@/components/RoomManageSheet";
import { useCloseOnBackButton } from "@/lib/useCloseOnBackButton";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import type { Room } from "@/types/database";

type Props = {
  rooms: Room[];
  activeRoomId: string;
  onClose: () => void;
  onSelectRoom: (roomId: string) => void;
  onRoomAdded: (roomId: string) => void;
  onRoomLeft: () => void;
};

export function RoomSwitcherSheet({
  rooms,
  activeRoomId,
  onClose,
  onSelectRoom,
  onRoomAdded,
  onRoomLeft,
}: Props) {
  useLockBodyScroll();
  useCloseOnBackButton(onClose);

  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [manageRoom, setManageRoom] = useState<Room | null>(null);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <button
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 bg-black/35 backdrop-blur-[1px]"
      />
      <div className="animate-modal-pop relative z-10 max-h-[85dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-[28px] bg-background px-5 pt-5 pb-6 shadow-[var(--shadow-pop)]">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[17px] font-bold text-foreground">참여 중인 방</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface-muted"
          >
            <X size={18} />
          </button>
        </div>

        <ul className="flex flex-col gap-1.5">
          {rooms.map((room) => {
            const active = room.id === activeRoomId;
            return (
              <li
                key={room.id}
                className={[
                  "flex items-center gap-2 rounded-2xl px-3.5 py-3 transition",
                  active ? "bg-brand-soft" : "bg-surface-muted",
                ].join(" ")}
              >
                <button
                  onClick={() => {
                    onSelectRoom(room.id);
                    onClose();
                  }}
                  className="flex flex-1 items-center gap-2 text-left"
                >
                  <span
                    className={[
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                      active ? "bg-brand text-white" : "border border-border",
                    ].join(" ")}
                  >
                    {active && <Check size={12} />}
                  </span>
                  <span className="truncate text-[14px] font-semibold text-foreground">
                    {room.name}
                  </span>
                </button>
                <button
                  onClick={() => setManageRoom(room)}
                  aria-label={`${room.name} 방 관리`}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition active:scale-90"
                >
                  <Settings size={15} />
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border py-3 text-[13px] font-semibold text-muted transition active:scale-[0.98]"
          >
            <Plus size={15} />
            새 방 만들기
          </button>
          <button
            onClick={() => setShowJoin(true)}
            className="flex items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border py-3 text-[13px] font-semibold text-muted transition active:scale-[0.98]"
          >
            참가하기
          </button>
        </div>
      </div>

      {showCreate && (
        <CreateRoomSheet
          onClose={() => setShowCreate(false)}
          onCreated={(roomId) => {
            setShowCreate(false);
            onRoomAdded(roomId);
          }}
        />
      )}

      {showJoin && (
        <JoinRoomSheet
          onClose={() => setShowJoin(false)}
          onJoined={(roomId) => {
            setShowJoin(false);
            onRoomAdded(roomId);
          }}
        />
      )}

      {manageRoom && (
        <RoomManageSheet
          room={manageRoom}
          isActive={manageRoom.id === activeRoomId}
          onClose={() => setManageRoom(null)}
          onSwitchClick={() => {
            onSelectRoom(manageRoom.id);
            setManageRoom(null);
            onClose();
          }}
          onLeft={() => {
            setManageRoom(null);
            onRoomLeft();
          }}
        />
      )}
    </div>
  );
}
