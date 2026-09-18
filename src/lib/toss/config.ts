import { Agent } from "undici";

/**
 * .env.local에 실제 mTLS 인증서 값이 채워졌는지 확인한다.
 * 앱인토스 콘솔에서 미니앱 등록 + mTLS 인증서 발급이 끝나기 전까지는 비어 있는 게
 * 정상이며, 이 경우 /api/auth/toss 는 503으로 응답한다(빌드/배포는 막지 않는다).
 */
export const TOSS_LOGIN_CONFIGURED =
  !!process.env.TOSS_LOGIN_MTLS_CERT && !!process.env.TOSS_LOGIN_MTLS_KEY;

export const TOSS_LOGIN_API_BASE_URL =
  process.env.TOSS_LOGIN_API_BASE_URL ?? "https://apps-in-toss-api.toss.im";

/** .env 값에 담긴 \n 이스케이프를 실제 개행으로 되돌린다 (PEM은 여러 줄 문자열). */
function unescapePem(value: string) {
  return value.replace(/\\n/g, "\n");
}

let cachedDispatcher: Agent | null = null;

/**
 * 앱인토스 파트너 API는 서버간 통신에 mTLS(클라이언트 인증서)를 요구한다.
 * Node 전역 fetch(undici)는 옵션으로 클라이언트 인증서를 받지 않으므로,
 * undici의 Agent를 직접 만들어 dispatcher로 넘겨야 한다.
 */
export function getTossMtlsDispatcher(): Agent {
  if (!TOSS_LOGIN_CONFIGURED) {
    throw new Error("토스 로그인 mTLS 인증서가 설정되지 않았습니다.");
  }
  if (!cachedDispatcher) {
    cachedDispatcher = new Agent({
      connect: {
        cert: unescapePem(process.env.TOSS_LOGIN_MTLS_CERT!),
        key: unescapePem(process.env.TOSS_LOGIN_MTLS_KEY!),
      },
    });
  }
  return cachedDispatcher;
}
