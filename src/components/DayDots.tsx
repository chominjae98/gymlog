/** 목표 대비 달성한 날짜를 점(dot)으로 시각화. "N/M일" 텍스트보다 한눈에 들어온다. */
export function DayDots({
  target,
  achieved,
  tone = "brand",
}: {
  target: number;
  achieved: number;
  tone?: "brand" | "warn";
}) {
  const fillClass = tone === "warn" ? "bg-warn" : "bg-brand";

  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: target }).map((_, i) => (
        <span
          key={i}
          className={`h-2.5 w-2.5 rounded-full transition-colors ${
            i < achieved ? fillClass : "bg-surface-muted"
          }`}
        />
      ))}
    </div>
  );
}
