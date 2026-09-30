import { CheckCircle2, XCircle } from "lucide-react-native";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ToastKind = "success" | "error";
type ToastItem = { id: number; message: string; kind: ToastKind };

const ToastContext = createContext<((message: string, kind?: ToastKind) => void) | null>(null);

/** 화면 어디서든 토스트 메시지를 띄우기 위한 훅. 루트 레이아웃의 ToastProvider 안에서만 동작한다. */
export function useToast() {
  const show = useContext(ToastContext);
  if (!show) throw new Error("useToast는 ToastProvider 안에서만 사용할 수 있어요");
  return show;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const timeoutIds = useRef<ReturnType<typeof setTimeout>[]>([]);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const ids = timeoutIds.current;
    return () => {
      ids.forEach(clearTimeout);
    };
  }, []);

  const show = useCallback((message: string, kind: ToastKind = "success") => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, message, kind }]);
    const timeoutId = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      timeoutIds.current = timeoutIds.current.filter((t) => t !== timeoutId);
    }, 2400);
    timeoutIds.current.push(timeoutId);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}

      <View
        pointerEvents="none"
        style={[styles.container, { bottom: insets.bottom + 96 }]}
      >
        {toasts.map((t) => (
          <View key={t.id} className="flex-row items-center gap-2 rounded-full bg-foreground px-4 py-2.5 shadow-lg">
            {t.kind === "success" ? (
              <CheckCircle2 size={15} color="#1fb872" />
            ) : (
              <XCircle size={15} color="#ff6a4d" />
            )}
            <Text className="text-[13px] font-medium text-background">{t.message}</Text>
          </View>
        ))}
      </View>
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    zIndex: 100,
  },
});
