# 캘린더: 비로그인 기본 비자 일정 + 로그인 개인 일정 분리 설계

## 배경

캘린더 페이지(`app/[locale]/calendar/page.tsx` → `features/calendar/demo-calendar.tsx`)는 현재 완전한 클라이언트 로컬 데모다. 인증, Supabase 연동, 비자 유형 연계가 전혀 없고 새로고침하면 추가한 일정도 사라진다.

서비스 원칙상 로그인 없이도 앱에 접속할 수 있어야 하는데, 구글 캘린더 연동 등 개인화 기능은 로그인이 전제된다. 이 문서는 그 간극을 메우기 위해 "로그인 전에는 비자 유형 기본 일정을 보여주고, 로그인하면 개인 일정 등록 기능을 추가로 제공"하는 캘린더 페이지 구조를 설계한다.

이 레포에는 아직 **로그인 시스템 자체가 없다** (`lib/supabase/{server,client}.ts`는 클라이언트 생성기만 있고 세션·OAuth 코드 없음). Google 로그인 자체의 설계는 [#10](https://github.com/team-hansori/visa-bugi-web/issues/10)에서 별도로 논의 중이며, 이 문서는 그 결과를 나중에 갈아 끼울 수 있는 형태로 캘린더 쪽을 준비하는 데 집중한다.

## 목표

- 비로그인 사용자도 자신이 관심 있는 비자 유형의 기본 절차를 캘린더에서 확인할 수 있다.
- 로그인하면 개인 일정을 직접 등록할 수 있다 (카테고리·위치·시간 포함).
- 나중에 실제 Google 로그인이 붙어도 캘린더 쪽 컴포넌트를 다시 설계할 필요가 없도록 인증 상태를 훅 뒤에 추상화한다.
- 나중에 `visa_process_stages`가 Supabase에 적재돼도 데이터 조회 함수 내부만 교체하면 되도록 데이터 접근을 함수 뒤에 추상화한다.

## 범위 밖 (후속 이슈로 분리)

| 항목 | 추적 위치 |
|---|---|
| 실제 Google OAuth 로그인 구현 | [#10](https://github.com/team-hansori/visa-bugi-web/issues/10) (코멘트로 이번 설계 맥락 공유) |
| 온보딩 "현재 비자/목표 비자" 필드 분리 | [#5](https://github.com/team-hansori/visa-bugi-web/issues/5) (코멘트로 이번 설계 맥락 공유) |
| 개인 일정(`tracked_items`) 실제 영속 저장·Supabase 스키마 | [#6](https://github.com/team-hansori/visa-bugi-web/issues/6) (코멘트로 이번 설계 맥락 공유) |
| `visa_process_stages` Supabase 적재 (visa-data 책임) | [#20](https://github.com/team-hansori/visa-bugi-web/issues/20) |
| 캘린더 문구 다국어 번역 (`messages/*.json`) | [#21](https://github.com/team-hansori/visa-bugi-web/issues/21) |

이번 브랜치는 위 항목이 완료되기 전에도 동작하도록 mock 인증 상태와 mock 비자 절차 데이터로 UI·데이터 흐름을 완성한다.

## 아키텍처

### 인증 상태 추상화

`lib/auth/use-auth-state.ts` (신규): 캘린더뿐 아니라 향후 다른 화면도 재사용할 수 있는 공용 훅.

```ts
type AuthState =
  | { status: "loading" }
  | { status: "guest" }
  | { status: "authenticated"; userId: string };
```

지금은 `{ status: "guest" }` 고정값(로컬 개발 편의를 위한 세션 토글 정도만 허용)을 반환하는 mock 구현이다. `loading` 상태를 처음부터 타입에 포함시켜, 실제 Supabase 세션 확인이 붙었을 때 로딩 스켈레톤을 추가로 설계하지 않아도 되게 한다. [#10](https://github.com/team-hansori/visa-bugi-web/issues/10)에서 실제 로그인 방식이 정해지면 이 파일 **내부 구현만** `supabase.auth.getSession()`/`onAuthStateChange`로 교체한다. 이 훅을 쓰는 컴포넌트는 변경하지 않는다.

### 페이지 분기

라우트를 나누지 않고 한 페이지 안에서 `useAuthState()` 결과로 분기한다 (주소 공유·북마크가 로그인 여부와 무관하게 동일해야 하므로).

- `features/calendar/calendar-page.tsx` (신규, `use client`): `useAuthState()`를 읽어 `loading` → 스켈레톤, `guest` → `GuestChecklistCalendar`, `authenticated` → `PersonalCalendar` 렌더링.
- `features/calendar/guest-checklist-calendar.tsx` (신규): 비로그인 뷰.
- `features/calendar/personal-calendar.tsx` (기존 `demo-calendar.tsx`를 이름 변경·확장): 로그인 뷰. 기존 일정 추가 폼을 카테고리·위치·시간 필드로 확장한다.
- `app/[locale]/calendar/page.tsx`는 `CalendarPage`만 렌더링하도록 축소.

## 데이터 모델 (mock, 실제 visa-data 스키마 컬럼명에 맞춤)

`visa-data`의 `visa_process_stages.csv` 실제 컬럼(`stage_id, visa_id, stage_order, stage_name, stage_name_kr, actor_from, actor_to, stage_start_date, stage_end_date, notes, notice_round, document_requirements_status, valid_from, valid_to, source_document, source_page, last_verified_at`)을 확인했다. 여기엔 "기준일+offset" 컬럼이 없고, 대신 **공고 회차(`notice_round`) 기준 절대 날짜**가 이미 채워져 있다 (예: 접수마감 2026-09-18). 이는 사용자 개인 기준일과 무관한 공개 행정 일정이다.

```ts
type ChecklistItem = {
  stageId: string;
  stageOrder: number;
  stageName: string;
  stageNameKr: string;
  stageStartDate?: string; // ISO date, 공고 회차형 비자만 존재
  stageEndDate?: string;
  noticeRound?: number;
  referenceEvent?: string; // 개인 기준일형 비자용, 현재 mock 데이터엔 없음
  offsetDays?: number;
  source: string;
  sourcePage: string;
  lastVerifiedAt: string;
};
```

렌더링 규칙:

- `stageStartDate`/`stageEndDate`가 있으면 **비로그인 상태에서도 실제 날짜 그대로 표시**한다 (공개 행정 일정이므로 개인화 불필요).
- `referenceEvent`/`offsetDays`만 있고 절대 날짜가 없으면, 로그인 후 사용자가 기준일을 직접 입력하기 전까지 **날짜 없이 체크리스트로만** 표시한다. 기준일 입력 전에는 절대 자동으로 날짜를 추정하지 않는다 (`AGENTS.md` 원칙).
- 두 종류가 섞인 목록도 지원해야 하므로 두 필드 그룹 모두 optional로 둔다.

`lib/visa-schedule/default-checklist.ts` (신규): 위 스키마와 동일한 모양의 정적 mock 데이터 + `getDefaultChecklist(targetVisaId: string): ChecklistItem[]`. visa-data 적재가 끝나면 이 함수 내부만 Supabase 쿼리로 교체한다.

**목표 비자 판별:** 온보딩이 아직 "현재/목표"를 구분하지 않으므로([#5](https://github.com/team-hansori/visa-bugi-web/issues/5) 참고), 이번 스코프에서는 `sessionStorage`의 `visa-bugi-demo-profile.visa` 값을 "목표 비자"로 취급한다. 값이 없거나 `UNKNOWN`이면 캘린더 안에 인라인 비자 유형 선택 UI를 둔다 (온보딩 재실행을 강제하지 않음).

## 게스트 뷰 (`guest-checklist-calendar.tsx`)

- `getDefaultChecklist(targetVisaId)`로 절차 목록을 불러와 사이드 패널에 체크리스트(읽기 전용, 체크 불가)로 보여준다.
- `stageStartDate`가 있는 항목은 캘린더 그리드 해당 날짜 셀에도 표시한다. 날짜가 여러 달에 걸칠 수 있으므로(예: 3월 공고~9월 마감) **월 이동 버튼을 실제로 동작**하게 만든다 (기존 데모의 "데모에서는 사용할 수 없음" 비활성화 버튼을 제거).
- 절대 날짜가 없는 항목은 날짜 없이 목록에만 노출한다.
- 로그인 유도 문구와 버튼을 배치한다. Google 로그인이 아직 없으므로 버튼은 "Google로 로그인 (준비 중)"처럼 명확히 준비 중 상태를 표시한다 (`AGENTS.md`: 버튼은 실제 동작 연결 또는 준비 중 표시).

## 로그인 뷰 (`personal-calendar.tsx`)

기존 `DemoCalendar`의 월 그리드·일정 추가 폼 구조를 유지하되:

- 게스트와 동일한 기본 절차 체크리스트를 계속 보여주되, `referenceEvent`/`offsetDays`형 항목에 **기준일 입력 필드**를 추가한다. 입력 시 `기준일 + offsetDays`로 계산한 날짜가 그리드에 표시된다 (계산은 사용자가 기준일을 입력한 시점에만 발생).
- "개인 일정 등록" 폼 필드를 확장한다.

```ts
type PersonalEvent = {
  id: string;
  title: string;
  category: string; // 기본 카테고리 또는 사용자 커스텀
  date: string;
  time?: string;
  location?: string;
};
```

  - 카테고리: 서비스 범위에 맞춘 기본 목록(예: "관공서 방문", "비자 인터뷰·서류 제출", "교육·상담 참석") + "직접 입력" 버튼으로 커스텀 카테고리 추가. 운동·친구 약속 같은 일상 일정은 기본 목록에 넣지 않는다 (서비스 본질 흐림 방지).
  - 위치: 자유 텍스트 입력으로 시작한다. 지도 기능(`features/map/agency-map-demo.tsx`)과의 연동(기관 선택 등)은 이번 스코프 밖 — 필드 형태만 나중에 구조화된 선택으로 바꿀 수 있게 문자열로 둔다.
  - 시간: 선택 입력.
- 저장은 **여전히 세션(브라우저 탭) 로컬 state**다. 새로고침하면 사라진다 — 실제 서버 영속 저장은 [#6](https://github.com/team-hansori/visa-bugi-web/issues/6)에서 결정된 스키마가 나온 뒤 별도로 구현한다. 이는 git/브랜치 푸시 여부와 무관하며 순수 브라우저 상태를 의미한다.

## 테스트 방침

이 레포는 자동 테스트 프레임워크가 없다 (`AGENTS.md` 기준 검증 루프는 `npm run lint`/`npm run typecheck`/`npm run build`). 구현 후 다음을 수동 확인한다.

- 게스트 상태: 비자 유형 미선택/선택 상태 각각에서 체크리스트·날짜 표시가 원칙대로(공고형만 날짜, 개인기준일형은 무날짜) 동작하는지.
- 로그인 상태(mock 토글): 기준일 입력 전/후 날짜 계산, 일정 추가 폼의 카테고리 커스텀 추가, 새로고침 시 초기화되는지.
- 월 이동 버튼이 실제 날짜가 있는 항목을 다른 달로 이동해도 정상 표시되는지.
- 키보드 포커스·`aria-live`/`role="alert"` 등 기존 접근성 패턴 유지.
