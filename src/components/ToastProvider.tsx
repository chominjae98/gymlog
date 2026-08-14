"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

type ToastKind = "success" | "error";
type ToastItem = { id: number; message: string; kind: ToastKind };

const ToastContext = createContext<((message: string, kind?: ToastKind) => void) | null>(null);

/** 화면 어디서든 토스트 메시지를 띄우기 위한 훅. layout.tsx의 ToastProvider 안에서만 동작한다. */
export function useToast() {
  const show = useContext(ToastContext);
  if (!show) throw new Error("useToast는 ToastProvider 안에서만 사용할 수 있어요");
  return show;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const show = useCallback((message: string, kind: ToastKind = "success") => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, message, kind }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2400);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}

      <div className="safe-bottom pointer-events-none fixed inset-x-0 bottom-24 z-[100] flex flex-col items-center gap-2 px-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="animate-fade-up flex items-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-[13px] font-medium text-background shadow-[var(--shadow-pop)]"
          >
            {t.kind === "success" ? (
              <CheckCircle2 size={15} className="text-brand shrink-0" />
            ) : (
              <XCircle size={15} className="text-warn shrink-0" />
            )}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
