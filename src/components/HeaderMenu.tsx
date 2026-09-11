"use client";

import { useEffect, useRef, useState } from "react";
import { EllipsisVertical, LogOut, Moon, Sun } from "lucide-react";
import { signOut } from "@/lib/auth";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("theme", theme);
}

/** 헤더 오른쪽 끝의 "···" 메뉴. 다크모드 전환 / 로그아웃처럼 자주 안 쓰거나
 * 실수로 누르면 곤란한 액션을 여기 숨겨둔다. */
export function HeaderMenu() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 마운트 시 1회: layout.tsx 인라인 스크립트가 이미 적용해둔 실제 DOM 상태를 읽어와 동기화
    const current = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(current);
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  function toggleTheme() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="메뉴 열기"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-surface-muted active:scale-95"
      >
        <EllipsisVertical size={18} />
      </button>

      {open && (
        <div className="animate-fade-up absolute right-0 top-11 z-40 w-44 overflow-hidden rounded-2xl bg-surface py-1 shadow-[var(--shadow-pop)]">
          <button
            onClick={toggleTheme}
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-[13px] font-medium text-foreground transition hover:bg-surface-muted"
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            {theme === "dark" ? "라이트 모드" : "다크 모드"}
          </button>
          <div className="mx-2 h-px bg-border" />
          <button
            onClick={() => {
              setOpen(false);
              signOut();
            }}
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-[13px] font-medium text-warn transition hover:bg-surface-muted"
          >
            <LogOut size={15} />
            로그아웃
          </button>
        </div>
      )}
    </div>
  );
}
