# [설계] MY 탭·설정·정책 화면 기본 구조 — 2026-08-26

관련 이슈: https://github.com/team-hansori/visa-bugi-web/issues/18

## 배경 및 목적

모바일 하단 내비게이션에 `MY` 탭을 추가하고, 로그인 도입 전에도 접근 가능한
마이페이지·설정·문의·정책 화면의 기본 구조를 만든다. 실제 계정 정보와
법무 문서는 아직 확정되지 않았으므로, 이번 작업 범위에서는 화면 구조와
locale-aware 라우팅, "준비 중" 상태 처리만 다루고 임의의 콘텐츠(가짜 사용자,
연락처, 법무 원문)를 만들지 않는다.

## 결정된 사항 (사용자 확인 완료)

- 이용약관·개인정보처리방침 원문: 아직 없음 → 화면에 "준비 중" 안내만 표시
- 문의하기 채널(이메일/폼): 아직 없음 → "준비 중" 안내만 표시
- MY 허브 상단 계정 영역: 로그인 세션 UI 자체를 만들지 않고, "로그인 준비 중"
  안내 배너만 표시 (#10 인증 설계 확정 후 연결)
- 설정 화면의 언어 변경: 헤더의 `LocaleSwitcher`와 동일한 컴포넌트를 공유해서
  설정 화면 안에서도 바로 언어를 바꿀 수 있게 한다

## 범위

### 포함
- 하단(모바일)/상단(데스크톱) 내비게이션에 `MY` 탭 추가
- `/[locale]/my`, `/[locale]/settings`, `/[locale]/contact`,
  `/[locale]/terms`, `/[locale]/privacy` 라우트 신설
- `LocaleSwitcher`를 공용 컴포넌트로 분리해 헤더·설정 화면에서 재사용
- 6개 로케일(`ko`, `zh`, `vi`, `uz`, `ne`, `km`) 메시지 파일에 신규 문구 추가
- `icon.tsx`에 `mail` 아이콘 1개 추가

### 제외 (이슈에 명시된 범위 밖)
- 푸시 알림 설정 UI/로직 (행 자체를 추가하지 않음)
- 실제 로그인/로그아웃/탈퇴 동작 (#10)
- 실제 GPS 동의·활성화 로직 (#11, #12)
- 이용약관·개인정보처리방침의 실제 법무 문구
- 문의하기 실제 채널 연결

## 아키텍처

기존 저장소 패턴을 그대로 따른다 (calendar/map/ocr/onboarding과 동일):

```
app/[locale]/<route>/page.tsx   — 얇은 서버 컴포넌트 wrapper (metadata + 컴포넌트 렌더)
features/<domain>/<Component>.tsx — 실제 UI/로직
messages/*.json                  — 네임스페이스별 번역 문자열
```

### 라우트 구성

| 라우트 | 페이지 파일 | 구현 파일 | 컴포넌트 종류 |
|---|---|---|---|
| `/[locale]/my` | `app/[locale]/my/page.tsx` | `features/my/my-hub.tsx` | Server (상태 없음) |
| `/[locale]/settings` | `app/[locale]/settings/page.tsx` | `features/settings/settings-page.tsx` | Client (LocaleSwitcher 상태 필요) |
| `/[locale]/contact` | `app/[locale]/contact/page.tsx` | `features/contact/contact-page.tsx` | Server |
| `/[locale]/terms` | `app/[locale]/terms/page.tsx` | `features/legal/terms-page.tsx` | Server |
| `/[locale]/privacy` | `app/[locale]/privacy/page.tsx` | `features/legal/privacy-page.tsx` | Server |

### 내비게이션 (`components/app-shell.tsx`)

- `navItems` 배열에 `{ href: "/my", icon: "user", key: "my" }` 추가 (5번째 항목)
  - `user` 아이콘은 이미 `icon.tsx`에 존재하므로 신규 아이콘 불필요
- `MobileNavigation`의 `grid-cols-4` → `grid-cols-5`
- `DesktopNavigation`은 동일한 `navItems`를 그대로 순회하므로 별도 수정 없이
  5번째 항목이 자동 노출됨 (이슈의 "데스크톱에서도 MY 기능 접근 가능" 충족).
  별도 계정 아이콘 진입점은 만들지 않는다.

### `LocaleSwitcher` 공유

- 현재 `app-shell.tsx` 내부에 정의된 `LocaleSwitcher` 함수 컴포넌트를
  `components/locale-switcher.tsx`로 추출한다.
- `app-shell.tsx`와 `features/settings/settings-page.tsx` 양쪽에서 import.
- 스타일 variant가 필요하면 최소한의 prop(`variant?: "compact" | "full"`)만
  추가하고, 로직(locale 변경 트랜지션)은 그대로 공유한다.

## 화면별 상세

### MY 허브 (`features/my/my-hub.tsx`)

- 상단: "로그인 준비 중" 안내 배너. `aria-disabled` 패턴은 쓰지 않고(버튼이
  아니므로) 단순 안내 카드로 처리, 가짜 사용자명/프로필 절대 표시하지 않음
- 진입 카드 4개: 설정 / 문의하기 / 이용약관 / 개인정보처리방침
  - 각 카드는 `Link`(locale-aware) + `chevron-right` 아이콘
  - map/onboarding 화면과 동일한 카드 톤(둥근 모서리, 흰 배경, 그림자) 재사용

### 설정 화면 (`features/settings/settings-page.tsx`)

- **언어 섹션**: 공유 `LocaleSwitcher`(full variant)
- **위치 기반 기능 섹션**:
  - 비활성 토글(스위치 UI는 `aria-disabled="true"` + `cursor-not-allowed`,
    기존 `agency-map-demo.tsx`의 "준비 중" 버튼 패턴을 재사용)
  - 안내 문구: 브라우저/OS 위치 권한은 앱 내 스위치만으로 해제되지 않으며
    기기 설정에서 직접 변경해야 한다는 점을 명시
  - "위치정보 이용약관 (준비 중)" 항목 1개 — #12 결과 확정 전까지 비활성 링크

### 문의하기 (`features/contact/contact-page.tsx`)

- "문의 채널을 준비하고 있어요" 안내 + 비활성 버튼(`mail` 아이콘, "준비 중" 라벨)
- 실제 이메일/폼 URL이 없으므로 링크를 걸지 않는다

### 이용약관 / 개인정보처리방침 (`features/legal/terms-page.tsx`, `privacy-page.tsx`)

- 둘 다 "준비 중" 배지 + "팀에서 원문을 확정하는 대로 게시할 예정입니다" 안내
- 개인정보처리방침 화면에는 위치정보 처리방침이 별도 확정 예정(#12)이라는
  안내 문구를 추가로 포함

### 다국어 (`messages/*.json`)

- 신규 네임스페이스: `Nav.my`, `My`, `Settings`, `Contact`, `Terms`, `Privacy`
- `ko.json`을 기준으로 작성한 뒤 `zh`, `vi`, `uz`, `ne`, `km` 5개 파일에 동일
  키 구조로 채운다. 기계 번역 수준이며 팀의 전문 번역 검수가 별도로 필요함을
  PR 설명에 명시한다.

### 아이콘 (`components/ui/icon.tsx`)

- `mail` 아이콘 1개 추가 (기존 24x24 stroke 컨벤션 유지)

## 오류/빈 상태 처리

- 모든 "준비 중" 상태는 `aria-disabled="true"` + 시각적 비활성(회색조) +
  텍스트 라벨로 명확히 표시 (보조기술 사용자도 알 수 있도록)
- 별도 API 호출이 없는 정적 화면이므로 로딩/에러 상태는 해당 없음

## 테스트 계획

- `npm run lint`, `npm run typecheck`, `npm run build` 통과
- dev 서버에서 360px 뷰포트로 하단 5탭 터치 영역·라벨 겹침 여부 직접 확인
- `/[locale]/my`에서 4개 진입점 모두 이동 확인 (6개 로케일 중 최소 `ko` 기준)
- 데스크톱 너비에서 MY 탭 노출 확인

## 영향 범위 확인

- 데이터 근거표·비자 판정 스키마: 영향 없음
- 상태 코드: 영향 없음
- 후속 의존성: #10(인증), #11(지도 SDK), #12(위치정보 정책) 확정 후 각각
  MY 계정 영역, 위치 기능 활성화, 위치정보 처리방침 원문 연결 필요
