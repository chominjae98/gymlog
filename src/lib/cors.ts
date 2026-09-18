/**
 * 나중에 별도 SPA(앱인토스 미니앱 프론트, *.web.tossmini.com)가 이 Vercel API를
 * 부를 때를 대비한 CORS 헬퍼. TOSS_ALLOWED_ORIGINS가 비어 있으면(현재 상태)
 * 아무 헤더도 추가하지 않는다 — 지금은 같은 오리진(Next.js UI)에서만 호출되므로 안전.
 */
function getAllowedOrigins() {
  return (process.env.TOSS_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function isOriginAllowed(origin: string, allowed: string[]) {
  return allowed.some((pattern) =>
    pattern.startsWith("*.") ? origin.endsWith(pattern.slice(1)) : origin === pattern
  );
}

export function buildCorsHeaders(requestOrigin: string | null): HeadersInit {
  const allowed = getAllowedOrigins();
  if (!requestOrigin || allowed.length === 0 || !isOriginAllowed(requestOrigin, allowed)) {
    return {};
  }
  return {
    "Access-Control-Allow-Origin": requestOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
