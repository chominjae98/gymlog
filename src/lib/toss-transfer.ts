/**
 * 토스 앱을 "계좌·금액이 미리 채워진 송금 확인 화면"으로 바로 여는 딥링크.
 *
 * supertoss://send?bank=...&accountNo=...&amount=... 형태는 토스가 QR 송금
 * 기능에서 내부적으로 쓰는 방식으로, 토스가 정식 문서로 공개한 API는 아니지만
 * 더치페이/정산 앱들이 실제로 쓰고 있는 걸 확인했다(2026-09 기준). 비공식이라
 * 토스 쪽 구현이 바뀌면 예고 없이 동작하지 않을 수 있다는 점을 감안해야 한다.
 *
 * 우리 서버는 이 링크를 "구성"만 할 뿐 돈에는 전혀 관여하지 않는다 — 실제 송금은
 * 토스 앱 안에서 사용자가 최종 확인(PIN/생체인증)해야 일어난다.
 */

/** "OOO은행" 형태에서 "은행" 접미사를 떼어낸다(토스 딥링크가 짧은 이름을 기대함). */
function normalizeBankName(bank: string): string {
  return bank.trim().replace(/은행$/, "");
}

/** 계좌번호에서 하이픈/공백 등을 제거하고 숫자만 남긴다. */
function normalizeAccountNo(accountNo: string): string {
  return accountNo.replace(/[^0-9]/g, "");
}

export function buildTossTransferLink(bank: string, accountNo: string, amount: number): string | null {
  const normalizedBank = normalizeBankName(bank);
  const normalizedAccountNo = normalizeAccountNo(accountNo);
  if (!normalizedBank || !normalizedAccountNo || amount <= 0) return null;

  const params = new URLSearchParams({
    bank: normalizedBank,
    accountNo: normalizedAccountNo,
    amount: String(Math.round(amount)),
  });
  return `supertoss://send?${params.toString()}`;
}
