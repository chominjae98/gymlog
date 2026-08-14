/**
 * 모달/바텀시트가 열려 있는 동안 기기의 "뒤로가기"(안드로이드 물리/제스처 버튼)를 누르면
 * PWA가 통째로 꺼지는 대신 열려있는 모달만 닫히도록 만드는 유틸.
 *
 * 원리: 모달이 하나라도 열려있을 때 브라우저 히스토리에 더미 항목을 하나만 쌓아두고,
 * popstate(=뒤로가기)가 발생하면 그걸 소비하면서 "가장 최근에 열린" 모달을 닫는다.
 * 여러 모달이 겹쳐 열려도(날짜 상세 위에 수정 화면 등) 히스토리 항목은 항상 최대 1개만
 * 쌓이도록 해서, 모달을 닫으면서 동시에 다른 모달을 여는 상황(예: 업로드 완료 → 날짜 상세로
 * 전환)에서도 히스토리가 꼬이지 않는다.
 */

type CloseHandler = () => void;

const stack: CloseHandler[] = [];
let hasGuardEntry = false;
let listenerAttached = false;

function pushGuardEntry() {
  if (hasGuardEntry) return;
  window.history.pushState({ __modalGuard: true }, "");
  hasGuardEntry = true;
}

function handlePopState() {
  // 실제 뒤로가기가 눌려서 우리가 쌓아둔 더미 항목이 소비된 상태.
  hasGuardEntry = false;
  const top = stack.pop();
  if (!top) return;
  top();
  // 그 아래 아직 열려있는 모달이 남아있다면, 다음 뒤로가기에도 대응할 수 있도록 다시 보호막을 친다.
  if (stack.length > 0) pushGuardEntry();
}

function ensureListener() {
  if (listenerAttached || typeof window === "undefined") return;
  listenerAttached = true;
  window.addEventListener("popstate", handlePopState);
}

/**
 * 모달이 열릴 때 호출한다. 반환된 함수를 모달이 닫힐 때(unmount 시) 호출해야 한다.
 */
export function registerModalBackGuard(onClose: CloseHandler): () => void {
  ensureListener();
  stack.push(onClose);
  pushGuardEntry();

  let unregistered = false;
  return function unregister() {
    if (unregistered) return;
    unregistered = true;

    const idx = stack.lastIndexOf(onClose);
    if (idx !== -1) stack.splice(idx, 1);

    // 뒤로가기가 아니라 X 버튼 등 UI로 닫힌 경우: 스택이 완전히 비었으면
    // 다음 tick까지 기다렸다가(그 사이 다른 모달이 새로 열리지 않았을 때만) 더미 히스토리를 정리한다.
    // setTimeout으로 미루는 이유: "닫으면서 동시에 다른 모달을 여는" 케이스에서
    // 여기서 바로 history.back()을 부르면 그 다른 모달이 막 쌓은 항목과 순서가 꼬일 수 있음.
    if (stack.length === 0) {
      setTimeout(() => {
        if (stack.length === 0 && hasGuardEntry) {
          hasGuardEntry = false;
          window.history.back();
        }
      }, 0);
    }
  };
}
