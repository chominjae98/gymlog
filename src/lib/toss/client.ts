import "server-only";
import { fetch as undiciFetch } from "undici";
import { TOSS_LOGIN_API_BASE_URL, getTossMtlsDispatcher } from "@/lib/toss/config";

export class TossApiError extends Error {
  constructor(message: string, public readonly errorCode?: string) {
    super(message);
    this.name = "TossApiError";
  }
}

type TossApiEnvelope<T> =
  | { resultType: "SUCCESS"; success: T }
  | {
      resultType: "FAIL" | "HTTP_TIMEOUT" | "NETWORK_ERROR" | "EXECUTION_FAIL" | "INTERRUPTED" | "INTERNAL_ERROR";
      error?: { errorCode?: string; reason?: string };
    };

async function callTossPartnerApi<T>(
  path: string,
  init: { method: "GET" | "POST"; body?: unknown; accessToken?: string }
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (init.accessToken) headers.Authorization = `Bearer ${init.accessToken}`;

  const response = await undiciFetch(`${TOSS_LOGIN_API_BASE_URL}${path}`, {
    method: init.method,
    headers,
    body: init.body ? JSON.stringify(init.body) : undefined,
    dispatcher: getTossMtlsDispatcher(),
  });

  const json = (await response.json()) as TossApiEnvelope<T>;
  if (json.resultType !== "SUCCESS") {
    throw new TossApiError(
      json.error?.reason ?? "토스 로그인 API 호출에 실패했어요.",
      json.error?.errorCode
    );
  }
  return json.success;
}

export type TossTokenResponse = {
  tokenType: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  scope: string;
};

/** 클라이언트에서 appLogin()으로 받은 authorizationCode를 AccessToken으로 교환한다. */
export function generateTossToken(params: {
  authorizationCode: string;
  referrer: "DEFAULT" | "SANDBOX";
}) {
  return callTossPartnerApi<TossTokenResponse>(
    "/api-partner/v1/apps-in-toss/user/oauth2/generate-token",
    { method: "POST", body: params }
  );
}

export type TossLoginMeResponse = {
  userKey: number;
  agreedTerms: string[];
  name: string | null;
  email: string | null;
  phone: string | null;
  gender: string | null;
  birthday: string | null;
  nationality: string | null;
};

/** AccessToken으로 로그인한 사용자 정보를 조회한다. */
export function getTossLoginMe(accessToken: string) {
  return callTossPartnerApi<TossLoginMeResponse>(
    "/api-partner/v1/apps-in-toss/user/oauth2/login-me",
    { method: "GET", accessToken }
  );
}
