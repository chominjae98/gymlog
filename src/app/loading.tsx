/**
 * 앱이 처음 열릴 때(또는 화면 전환으로 서버 데이터를 다시 받아오는 동안) Next.js가
 * 자동으로 띄워주는 로딩 화면.
 *
 * 참고: OS/브라우저가 PWA를 standalone으로 실행할 때 맨 처음 잠깐 보여주는
 * "네이티브 스플래시"(아이콘 + 앱 이름, manifest.ts의 icons/name/background_color로
 * 결정됨)는 우리 코드가 그려지기도 전에 뜨는 화면이라 이 컴포넌트로 바꿀 수 없다.
 * 이 화면은 그 다음, 즉 우리 코드가 실제로 그리는 "첫 화면"이다.
 */
export default function Loading() {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-background px-6">
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-soft/70 blur-[64px]" />

      <div className="animate-fade-up relative flex flex-col items-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-brand text-[30px] shadow-[var(--shadow-soft)]">
          🔥
        </div>
        <div>
          <p className="text-[20px] font-bold tracking-tight text-foreground">오운완</p>
          <p className="mt-1 text-[13px] text-muted">친구들과 함께, 오늘도 운동 완료</p>
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand [animation-delay:-0.3s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand [animation-delay:-0.15s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand" />
        </div>
      </div>
    </div>
  );
}
