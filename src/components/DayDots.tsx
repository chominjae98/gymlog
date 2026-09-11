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
  // 목표를 낮춘 뒤에 이미 그보다 많이 달성한 경우, 초과분도 점으로 보이도록 개수를 늘린다.
  const dotsCount = Math.max(target, achieved);

  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: dotsCount }).map((_, i) => (
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
