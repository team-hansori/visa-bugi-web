# Next.js 공용 BFF API와 아이디/비밀번호 인증 설계

- 작성일: 2026-08-28
- 상태: 대화에서 합의됨, 구현 계획 작성 전 검토 필요

## 목표

Next.js App Router를 웹앱의 유일한 서버로 유지한다. Supabase 아이디/비밀번호
인증을 추가하고, 브라우저가 애플리케이션 데이터를 읽을 때 Supabase에 직접
접속하지 않고 공용 Next.js API를 통하게 한다.

## 범위

포함:

- 아이디에서 내부용 가상 이메일 주소를 만드는 Supabase Auth 가입·로그인.
- 실제 Supabase 세션을 반영하는 클라이언트 인증 상태와 기존 캘린더의 로그인/게스트 화면 분기.
- 지도, 목표 비자, 홈, 문서, OCR 서식 조회를 위한 공용 Next.js BFF API.
- Supabase 쿼리, 캐시 정책, 응답 조립, 오류 변환을 담당하는 도메인 서버 모듈.
- 기존 OCR/OCR 도움말 API가 사용할 서버 전용 OpenAI 설정.

제외:

- Google OAuth, 로그아웃 UI, 비밀번호 재설정·변경, 회원 탈퇴.
- 익명 계정에서 정식 계정으로의 승격 및 데이터 이전.
- `tracked_items`, 개인 캘린더 영속화, 새 마스터 데이터 스키마.
- `visa-data`가 소유하는 마스터 테이블의 변경 또는 적재 과정 변경.

## 핵심 결정

### 1. Next.js가 BFF 역할을 한다

별도 Express/NestJS, API Gateway 제품, GraphQL 서버, 마이크로서비스는 추가하지 않는다.
Next.js Route Handler가 브라우저용 API를 제공하며, Server Component와 Server Action도
같은 도메인 서버 모듈을 직접 호출한다.

```text
브라우저 Client Component
  -> /api/home | /api/map/agencies | /api/profile/target-visa
  -> app/api/* Route Handler (HTTP 경계)
  -> features/<domain>/server/* (도메인 쿼리·응답 조립)
  -> lib/supabase/server.ts
  -> Supabase

Server Component / Server Action
  -> features/<domain>/server/*
  -> Supabase
```

Route Handler는 화면 JSX나 중복 쿼리를 갖지 않는다. 입력 검증, 캐시 헤더,
요청 ID, 공통 오류 직렬화만 담당한다. 도메인 모듈은 `Request`·`Response`에
의존하지 않는다.

API 경로에는 `/v1`을 붙이지 않는다. 현재는 단일 웹 클라이언트 MVP이므로,
모바일 앱이나 외부 파트너 API처럼 장기 호환성 계약이 필요한 시점에만 버전을 도입한다.

### 2. 공용 API 계약

초기 공용 API는 다음과 같다.

| 엔드포인트 | 사용 화면 | 책임 | 캐시 |
| --- | --- | --- | --- |
| `GET /api/home` | 홈 대시보드 | 쿼터, 준비 서류 카탈로그, 저장된 OCR 진행상황 | 사용자 진행상황 포함 시 private/no-store |
| `GET /api/map/agencies` | 지도 | 필터된 기관 목록과 쿼리 파라미터 검증 | 개인화되지 않은 조회만 짧은 public 캐시 |
| `GET /api/profile/target-visa` | 캘린더·목표 비자 선택 | 로그인 사용자의 목표 비자 또는 `null` | no-store |
| `GET /api/documents/catalog` | OCR 화면 | 검수된 신청서 서식 카탈로그 | 짧은 public 캐시 |
| `GET /api/documents/progress` | 문서 현황 | 현재 사용자의 OCR 검토 진행상황 | no-store |

기존 쓰기 경계는 유지한다.

- `features/onboarding/actions.ts`: 온보딩 저장 Server Action.
- `POST /api/ocr/results`: OCR 요약 결과 저장.
- `POST /api/chat`, `POST /api/chat/ocr-help`, `POST /api/ocr/application-form`:
  외부 AI 제공자와 통신하는 서버 전용 경계.

모든 BFF 오류는 다음 형태로 통일한다.

```ts
type ApiError = {
  error: { code: string; message: string; requestId: string };
};
```

브라우저에는 안전한 오류 코드와 설명만 반환한다. Supabase·외부 API의 상세 오류는
요청 ID와 함께 서버 로그에만 남기며 브라우저로 반환하지 않는다.

### 3. 데이터와 보안 경계

브라우저는 Supabase Auth 세션 유지와 인증 상태 구독을 위해서만 Supabase client를
초기화할 수 있다. 이 변경 이후 애플리케이션 데이터에 대해 브라우저에서 `.from(...)`
쿼리를 실행하지 않는다.

공개 가능한 Supabase URL·publishable key는 브라우저에 둘 수 있다. OpenAI 키와
Supabase service-role key는 서버에만 둔다.

비자 요건, 쿼터, 기관, 위험 라우팅 마스터 데이터는 읽기 전용이다. 해당 스키마,
검수, 적재는 `visa-data`가 소유한다. 웹 BFF는 계약된 테이블과 뷰를 조회만 하며
마스터 데이터를 생성하거나 수정하지 않는다.

### 4. 아이디/비밀번호 인증

비밀번호의 저장과 검증은 Supabase Auth가 전담한다. 애플리케이션은
`public.profiles`에 비밀번호 또는 비밀번호 해시를 저장하지 않는다.

UI는 공개 이메일이 아닌 아이디를 입력받는다. `features/auth/schema.ts`는 정규화한
아이디를 고정 도메인의 내부용 가상 이메일로 변환한다.

```ts
toIdEmail("visa_bugi") === "visa_bugi@id.visabugi.internal";
```

입력 규칙:

- 아이디: 영문 소문자, 숫자, 밑줄만 허용하며 3~30자.
- 비밀번호: 8~72자.
- 이름: 앞뒤 공백 제거 후 1~50자.

`profiles`에는 nullable `username`, `name` 컬럼과 대소문자를 구분하지 않는
아이디 유니크 인덱스를 추가한다. 기존 익명 사용자는 계속 유효하다. 비밀번호는
Supabase Auth의 `auth.users`에만 보관된다.

`features/auth/actions.ts`에는 `signUpWithId`, `signInWithId` Server Action을 둔다.
두 Action은 서버 경계에서 Zod 검증을 다시 수행한다.

- 가입: `auth.signUp` 후 `{ user_id, username, name, locale }`을 `profiles`에 upsert.
- 로그인: `auth.signInWithPassword` 호출. 아이디 오류와 비밀번호 오류를 같은
  "아이디 또는 비밀번호가 올바르지 않습니다" 메시지로 응답.

내부용 가상 이메일 방식에서는 즉시 세션이 필요하므로 Supabase의 Confirm Email은
비활성화한다. 게스트 경로를 위해 Anonymous sign-ins는 활성화 상태를 유지한다.

### 5. 인증 상태와 이동 규칙

`useAuthState`는 게스트 mock 대신 `getUser()`와 `onAuthStateChange`로 구현한다.
비익명 사용자는 `authenticated`, 익명 세션과 세션 없음은 `guest`다.

온보딩 진입 화면의 미구현 Google 버튼은 아이디/비밀번호 가입·로그인 폼으로 교체한다.
로그인 없이 시작하는 게스트 경로는 유지한다.

| 이벤트 | 결과 |
| --- | --- |
| 게스트가 로그인 없이 시작 | 익명 계정으로 온보딩 0단계 시작 |
| 회원가입 성공 | 새 정식 계정으로 온보딩 0단계 시작 |
| 로그인 성공 | 홈으로 이동. 기존 완료 가드가 미완료 프로필을 온보딩으로 이동 |

익명 프로필 데이터는 새로 가입한 정식 계정으로 옮기지 않는다. 공모전 심사에서
안정적으로 재현 가능한 흐름을 우선하고, 검증되지 않은 계정 연결 문제를 피하기 위한 결정이다.

### 6. OpenAI 설정

OpenAI 키는 gitignore 대상인 `.env.local`의 `OPENAI_API_KEY`에만 저장하고,
Vercel Preview/Production에는 별도로 등록한다. 기존 OCR 및 OCR 도움말 Route Handler가
이 서버 환경변수를 이미 사용한다. 키는 커밋, 렌더링, 로그, 브라우저 전송을 하지 않는다.

대화에 노출된 기존 키는 반드시 폐기하고 새 키를 발급받아 사용한다. 새 키가 유효하고
운영 모델 설정이 완료된 환경에서만 OCR demo 모드를 끈다.

## 오류 처리와 관측

- BFF Route마다 요청 ID를 생성 또는 수신하고, 엔드포인트·상태 코드·캐시 결과·안전한
  오류 코드를 기록한다.
- 사용자 데이터 API는 유효한 Supabase 사용자가 없으면 공통 오류 계약으로 401을 반환한다.
- 마스터 데이터 조회 실패는 API 소비자에게 명시적인 서비스 오류를 반환한다. 현재
  서버 렌더링 화면이 의도적으로 제공하는 preview fallback만 기존 동작을 유지한다.
- 현재 메모리 기반 rate limit은 서버리스 인스턴스 간 공유되지 않는다. 이는 분산 운영용
  방어가 아니며 이번 범위에서는 변경하지 않는다.

## 검증

- Zod 입력 파싱, 응답 매퍼, 인증 Server Action, API 권한 검사, 브라우저 직접
  Supabase 데이터 조회 제거를 단위 테스트한다.
- 익명·로그인·로그아웃 세션별 인증 상태 전환을 테스트한다.
- Supabase mock으로 Route Handler 입력 검증과 공통 오류 응답을 테스트한다.
- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`를 실행한다.
- 새 테스트 계정으로 가입, 로그인, 게스트 온보딩, 지도 조회, 목표 비자 조회,
  OCR 실모드, OCR 도움말 실모드를 수동 검증한다.
