export function SetupNotice() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background px-8 text-center">
      <span className="text-3xl">🛠️</span>
      <h1 className="text-[18px] font-bold text-foreground">
        Supabase 연결이 필요해요
      </h1>
      <p className="max-w-xs text-[13px] leading-relaxed text-muted">
        .env.local 에 NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
        값을 채워 넣고 서버를 다시 시작해 주세요. 자세한 내용은 README를
        확인하세요.
      </p>
    </div>
  );
}
