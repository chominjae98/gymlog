# 빌드 & 배포 가이드

`eas.json`은 JSON이라 주석을 못 달아서, 명령어와 설명을 여기 정리해둔다.

## 채널이 뭔지 (development / preview / production)

apk/aab 하나마다 "어느 채널을 구독할지"가 빌드 시점에 고정된다. `eas update`로 코드를
올리면 **그 채널을 구독하는 기기에만** 반영되고, 다른 채널은 전혀 영향받지 않는다 —
그래서 내 테스트폰에 올린 게 실사용자한테 그대로 나가는 사고가 안 난다.

| 채널 | 누가 쓰는가 | 코드 반영 방식 |
| --- | --- | --- |
| `development` | 개발 중 테스트폰(지금 설치한 그 apk) | PC의 `npx expo start`가 켜져 있으면 실시간 반영(핫 리로드). 개발서버가 꺼져 있을 때만 이 채널에 올린 `eas update`를 받아온다. |
| `preview` | "실제 배포판처럼" 미리 확인해보는 별도 apk (개발서버 없이 독립 실행) | `eas update --channel preview`로 반영 |
| `production` | 플레이스토어에서 실사용자가 받는 진짜 앱 | `eas update --channel production`으로 반영 |

**주의**: 지금 폰에 깔려있는 apk는 `eas build --profile development`로 만든 거라
`development` 채널이다. `preview`는 아직 만든 적 없는 별도의 apk — 필요하면
`eas build --profile preview`로 새로 만들어야 한다.

## 명령어 모음

### 개발 중 (지금 하는 것)
```bash
npx expo start -c
```
개발 빌드 apk가 이 서버에 연결돼서 코드 저장하면 바로 반영됨. 스토어/업데이트랑 무관.

### 빌드 (apk/aab 새로 만들기)
```bash
# 테스트용 apk (개발서버 연결)
npx eas-cli build --profile development --platform android

# "진짜처럼" 미리 확인용 apk (개발서버 없이 독립 실행)
npx eas-cli build --profile preview --platform android

# 스토어 제출용 aab
npx eas-cli build --profile production --platform android
```
새 네이티브 라이브러리를 추가했거나, 앱 아이콘/권한/패키지명 같은 네이티브 설정을
바꿨을 때만 다시 빌드하면 된다. 화면/로직만 고친 거면 빌드 필요 없음(아래 참고).

### OTA 업데이트 (화면/로직만 고친 걸 이미 배포된 앱에 반영)
```bash
# 1. 먼저 preview 채널에만 배포해서 확인
npx eas-cli update --channel preview --message "여기에 뭘 고쳤는지 한 줄 설명"

# 2. 문제없으면 그제서야 production(실사용자)한테 배포
npx eas-cli update --channel production --message "여기에 뭘 고쳤는지 한 줄 설명"
```
`--channel`을 안 적으면 명령어가 실패하거나 엉뚱한 브랜치로 나갈 수 있으니
**항상 명시적으로 채널을 적을 것.**

### 스토어 제출
```bash
npx eas-cli submit --profile production --platform android
```

## 정리: 앞으로 코드 고쳤을 때 순서

1. `npx expo start -c` 켜두고 개발 빌드로 확인
2. 다 됐으면:
   - **네이티브 변경 없음** (화면/로직만) → `eas update --channel production`
   - **네이티브 변경 있음** (새 라이브러리, 아이콘, 권한 등) → `eas build --profile production` 다시 만들고 `eas submit`으로 스토어 재제출
