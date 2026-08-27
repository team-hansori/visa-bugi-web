# Next.js 공용 BFF와 아이디/비밀번호 인증 구현 계획

> **에이전트 작업자용:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development`(권장) 또는
> `superpowers:executing-plans`로 이 계획을 Task 단위로 구현한다. 각 Step은 체크박스(`- [ ]`)로 추적한다.

**목표:** Supabase 아이디/비밀번호 인증을 추가하고, 브라우저의 애플리케이션 데이터 조회를
Supabase 직접 접속(`.from(...)`)에서 공용 Next.js API 경유로 바꾼다.

**아키텍처:** Next.js Route Handler가 브라우저용 HTTP 경계를 담당하고, `features/<domain>/server/*`
도메인 모듈이 Supabase 쿼리·응답 조립·오류 변환을 담당한다. Server Component와 Server Action은
같은 도메인 모듈을 직접 호출한다. 인증은 별도 라이브러리 없이 Supabase Auth만 쓰며, 아이디는
`features/auth/schema.ts`가 고정 도메인의 내부용 가상 이메일로 변환한다.

**기술 스택:** Next.js App Router, TypeScript, `@supabase/ssr`, `zod`, `vitest` + jsdom,
`@testing-library/react`.

**Spec:** `docs/superpowers/specs/2026-08-28-next-bff-id-password-auth-design.md`

## 전역 제약 (모든 Task에 암묵 포함)

- 브라우저에는 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`만 노출한다.
  `SUPABASE_SECRET_KEY`, `OPENAI_API_KEY`는 서버 전용.
- 환경변수가 없어도 `npm run build`와 기본 정적 화면이 동작해야 한다. 도메인 모듈은
  `NEXT_PUBLIC_SUPABASE_URL`/`PUBLISHABLE_KEY` 존재 여부를 확인하고, 미설정 시 기존 preview
  fallback 동작을 유지한다.
- 비자·쿼터·기관·위험 라우팅 마스터 데이터는 읽기 전용이다. 스키마·검수·적재는 `visa-data`
  소유. 이 계획은 `public.profiles`에 컬럼만 추가하며(웹 소유 테이블) 마스터 테이블은 건드리지 않는다.
- 모든 BFF 오류 응답 형태는 `{ error: { code: string; message: string; requestId: string } }`.
  브라우저에는 안전한 코드·문구만, Supabase/외부 API 상세 오류는 `requestId`와 함께 서버 로그에만.
- API 경로에 `/v1`을 붙이지 않는다.
- 아이디: 영문 소문자·숫자·밑줄, 3~30자. 비밀번호: 8~72자. 이름: trim 후 1~50자.
- 내부용 가상 이메일 도메인은 `id.visabugi.internal` (라우팅 불가 TLD).
- `main`에 직접 커밋 금지. Phase마다 별도 PR. 직접 머지 금지(팀 리뷰).
- Server Action은 서버 경계에서 Zod 검증을 다시 수행한다(클라이언트 검증만 신뢰하지 않음).
- 익명 로그인(`signInAnonymously`) 경로는 그대로 유지한다. 익명→정식 계정 데이터 이전은 하지 않는다.
- 커밋 메시지 말미:
  `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01V9p4bLcqeERLXwe4V8oEPy`

## 사전 조건 (사람이 수행 — 코드 아님)

Phase 1 배포 전 Supabase 대시보드에서:

- **Authentication → Providers → Email**: "Confirm email" **비활성화**
  (내부용 가상 이메일은 수신함이 없으므로 즉시 세션이 필요하다).
- **Authentication → Providers → Anonymous sign-ins**: **활성화 유지**.
- `OPENAI_API_KEY`: 이전 세션 대화에 노출된 키는 **폐기**하고 새 키 발급 →
  `.env.local` + Vercel Preview/Production에 등록. 이 계획은 OCR demo 모드를 끄지 않는다.

이 항목들이 없어도 코드·빌드·단위 테스트는 통과한다. 수동 검증(가입/로그인 실측)만 영향받는다.

## 파일 구조

### Phase 1 — 인증

| 파일 | 책임 |
| --- | --- |
| `supabase/migrations/20260828000000_profiles_username_auth.sql` | 생성. `profiles.username`·`profiles.name` nullable 컬럼, 대소문자 무시 유니크 인덱스 |
| `lib/supabase/database.types.ts` | 수정. `ProfileRow`/`ProfileInsert`에 `username`·`name` 추가 |
| `features/auth/schema.ts` | 생성. `toIdEmail`, `signUpSchema`, `signInSchema`, 파생 타입 |
| `features/auth/schema.test.ts` | 생성 |
| `features/auth/actions.ts` | 생성. `signUpWithId`, `signInWithId` Server Action |
| `features/auth/actions.test.ts` | 생성 |
| `features/auth/auth-form.tsx` | 생성. 아이디/비밀번호 가입·로그인 폼 (Client Component) |
| `features/auth/auth-form.test.tsx` | 생성 |
| `lib/auth/use-auth-state.ts` | 수정. mock 제거, `getUser()` + `onAuthStateChange` 실제 구현 |
| `lib/auth/use-auth-state.test.tsx` | 생성 |
| `features/onboarding/onboarding-welcome.tsx` | 수정. 미구현 Google 버튼 → `AuthForm`. 게스트 경로 유지 |
| `features/onboarding/onboarding-welcome.test.tsx` | 수정 |
| `messages/{ko,zh,vi,uz,ne,km}.json` | 수정. `Auth` 네임스페이스 추가 |

### Phase 2 — 공용 BFF

| 파일 | 책임 |
| --- | --- |
| `lib/api/errors.ts` | 생성. `ApiError` 타입, `apiErrorResponse()`, `withApiRoute()` (requestId·로깅·공통 오류 직렬화) |
| `lib/api/errors.test.ts` | 생성 |
| `features/map/server/agencies.ts` | 생성. 서버 클라이언트로 `map_visible_agency_contacts` 조회·조립. `agency-queries.ts`의 순수 함수(거리 계산·정렬·`toAgency`) 재사용 |
| `features/map/server/agencies.test.ts` | 생성 |
| `app/api/map/agencies/route.ts` | 생성. `GET`. 쿼리 파라미터 검증 → 도메인 모듈 호출 → 짧은 public 캐시 |
| `app/api/map/agencies/route.test.ts` | 생성 |
| `features/map/agency-map.tsx` | 수정. 브라우저 `createClient()`/`fetchNearbyAgencies` 제거, `/api/map/agencies` fetch |
| `features/map/agency-map.test.tsx` | 신규 또는 수정 (없으면 생성) |
| `features/map/agency-queries.ts` | 수정. 순수 함수는 유지, `fetchNearbyAgencies`(SupabaseClient 인자)는 도메인 모듈로 이동 후 제거 |
| `tests/agency-queries.test.ts` | 수정. 이동한 함수 테스트를 `features/map/server/agencies.test.ts`로 옮기고 순수 함수 테스트만 잔류 |
| `features/profile/server/target-visa.ts` | 생성. 서버 클라이언트로 `user_visa_profile.target_visa_code` 조회 |
| `features/profile/server/target-visa.test.ts` | 생성 |
| `app/api/profile/target-visa/route.ts` | 생성. `GET`. 사용자 세션 없으면 401(공통 오류 계약). `no-store` |
| `app/api/profile/target-visa/route.test.ts` | 생성 |
| `lib/onboarding/target-visa.ts` | 수정. `resolveStoredTargetVisaCode`가 브라우저 `.from()` 대신 `/api/profile/target-visa` fetch. `isTargetVisaCode`는 유지 |
| `tests/target-visa-profile.test.ts` | 수정. supabase client mock → `fetch` mock |

### 이번 범위에서 제외 (근거 있는 축소 — 확정)

Spec §2는 공용 API 5개를 나열하지만, 현재 코드에서 브라우저가 `.from()`으로 애플리케이션 데이터를
읽는 지점은 **`features/map/agency-map.tsx`와 `lib/onboarding/target-visa.ts` 2곳뿐**이다.
`/api/home`, `/api/documents/catalog`, `/api/documents/progress`가 다룰 데이터
(`getVisaQuotaOverview`, `getHomeVisaPreparationCatalog`, `getApplicationFormCatalog`,
`getSavedDocumentProgress`)는 이미 `server-only` 모듈이고 Server Component(`app/[locale]/(app)/page.tsx`,
`documents/page.tsx`, `ocr/page.tsx`)에서만 호출된다. Spec §1도 "Server Component는 도메인 모듈을
직접 호출"이라고 명시한다. 소비자 없는 엔드포인트는 end-to-end 검증이 불가하고 실제 소비자가 생길 때
필요한 형태와 어긋나기 쉬우므로 지금 만들지 않는다(YAGNI). 이 결정은 사람이 승인했다.

**나중에 이 3개가 필요해질 때(예: 홈 대시보드가 클라이언트 상호작용형으로 바뀜):** Task 10~11 또는
Task 13~14와 동일한 3파일 패턴을 반복한다 —
(1) `features/<domain>/server/<name>.ts` 도메인 모듈: 기존 `server-only` 함수를 감싸고 인증·오류를
`ApiRouteError`로 표준화. (2) `app/api/<path>/route.ts`: `withApiRoute`로 감싼 `GET`, 캐시 정책은
Spec §2 표대로(`/api/home`·`/api/documents/progress` = `no-store`, `/api/documents/catalog` =
`public, max-age`). (3) 브라우저 소비자를 `fetch`로 이관 + 테스트. `lib/api/errors.ts`는 그대로 재사용.

---

## Phase 1 — 아이디/비밀번호 인증

### Task 1: profiles username/name 마이그레이션

**Files:**
- Create: `supabase/migrations/20260828000000_profiles_username_auth.sql`

**Interfaces:**
- Produces: `public.profiles`에 `username text` (nullable), `name text` (nullable),
  `profiles_username_lower_key` 유니크 인덱스(`lower(username)`).

- [ ] **Step 1: 마이그레이션 파일 작성**

`supabase/migrations/20260824000000_onboarding_user_schema.sql`의 스타일(주석 한국어,
`if not exists`, 재실행 안전)을 그대로 따른다.

```sql
-- profiles에 아이디/이름 추가 (2026-08-28 next-bff-id-password-auth-design 스펙 §4)
-- 비밀번호는 Supabase Auth의 auth.users에만 보관한다. profiles에는 저장하지 않는다.

alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists name text;

-- 아이디는 대소문자를 구분하지 않고 유일해야 한다. citext 확장 대신
-- 표현식 유니크 인덱스를 쓴다(확장 설치 불필요). NULL은 유니크 제약에서 제외되므로
-- username 없는 기존 익명 사용자 행은 그대로 유효하다.
create unique index if not exists profiles_username_lower_key
  on public.profiles (lower(username));

-- 길이·문자 제약은 애플리케이션(Zod)에서 강제한다. DB에는 형식 체크를 걸지 않는다
-- (마이그레이션 재실행/데이터 백필 시 유연성 확보).

comment on column public.profiles.username is '로그인 아이디(소문자). 대소문자 무시 유니크.';
comment on column public.profiles.name is '표시 이름. 가입 시 입력.';
```

- [ ] **Step 2: 커밋**

```bash
git add supabase/migrations/20260828000000_profiles_username_auth.sql
git commit -m "feat(db): profiles에 username/name 컬럼과 대소문자 무시 유니크 인덱스 추가"
```

> 실제 Supabase 적용은 사람이 SQL Editor에서 실행한다. 단위 테스트는 DB에 접속하지 않는다.

---

### Task 2: database.types.ts에 username/name 반영

**Files:**
- Modify: `lib/supabase/database.types.ts:24-34`

**Interfaces:**
- Consumes: 없음.
- Produces: `ProfileRow`에 `username: string | null`, `name: string | null`.
  `ProfileInsert = Omit<ProfileRow, "created_at" | "updated_at">` 는 그대로 두면 자동 포함.

- [ ] **Step 1: 타입 수정**

```ts
export type ProfileRow = {
  user_id: string;
  locale: string;
  username: string | null;
  name: string | null;
  gender: string | null;
  birthdate: string | null;
  nationality: string | null;
  created_at: string;
  updated_at: string;
};
```

- [ ] **Step 2: typecheck**

Run: `npx tsc --noEmit`
Expected: PASS. (`features/onboarding/actions.ts`의 `ProfileInsert` 사용부는 `username`/`name`이
optional이 아니라 컴파일 에러가 날 수 있음 → 다음 Step)

- [ ] **Step 3: 기존 온보딩 insert 보정**

`features/onboarding/actions.ts`의 `profileRow: ProfileInsert` 리터럴에서 `username`/`name`을
누락하면 타입 에러. 온보딩은 아이디를 수집하지 않으므로 명시적으로 `null`을 넣는다.

`features/onboarding/actions.ts:84-90` 를:

```ts
  const profileRow: ProfileInsert = {
    user_id: user.id,
    locale: submission.locale,
    username: null,
    name: null,
    gender: submission.gender,
    birthdate: submission.birthdate,
    nationality: submission.nationality,
  };
```

> 주의: 이 upsert는 `onConflict: "user_id"`라 기존 행의 `username`/`name`을 `null`로
> 덮어쓸 수 있다. 가입 시 `signUpWithId`가 먼저 `username`/`name`을 넣고, 그 뒤 온보딩이
> 같은 행을 upsert한다. Task 4 Step 3에서 이 순서 문제를 처리한다(온보딩 upsert가
> `username`/`name` 컬럼을 건드리지 않도록 조정).

- [ ] **Step 4: 기존 테스트 실행**

Run: `npx vitest run features/onboarding/actions.test.ts`
Expected: PASS (mock이 컬럼을 검사하지 않으면 그대로 통과).

- [ ] **Step 5: 커밋**

```bash
git add lib/supabase/database.types.ts features/onboarding/actions.ts
git commit -m "feat(types): ProfileRow에 username/name 추가, 온보딩 insert에 null 명시"
```

---

### Task 3: features/auth/schema.ts — 아이디 정규화와 Zod 스키마

**Files:**
- Create: `features/auth/schema.ts`
- Test: `features/auth/schema.test.ts`

**Interfaces:**
- Produces:
  - `toIdEmail(username: string): string` — 정규화(소문자·trim)한 아이디 + `@id.visabugi.internal`.
  - `signUpSchema: ZodType` → `{ username: string; password: string; name: string; locale: Locale }`.
  - `signInSchema: ZodType` → `{ username: string; password: string }`.
  - `type SignUpInput`, `type SignInInput`.
  - `ID_EMAIL_DOMAIN = "id.visabugi.internal"`.

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// features/auth/schema.test.ts
import { describe, expect, it } from "vitest";
import { toIdEmail, signUpSchema, signInSchema } from "./schema";

describe("toIdEmail", () => {
  it("정규화한 아이디를 고정 도메인 이메일로 만든다", () => {
    expect(toIdEmail("visa_bugi")).toBe("visa_bugi@id.visabugi.internal");
  });
  it("대문자·공백을 정규화한다", () => {
    expect(toIdEmail("  Visa_Bugi  ")).toBe("visa_bugi@id.visabugi.internal");
  });
});

describe("signUpSchema", () => {
  const base = { username: "visa_bugi", password: "secret12", name: "홍길동", locale: "ko" };
  it("정상 입력을 통과시킨다", () => {
    expect(signUpSchema.parse(base)).toEqual(base);
  });
  it("아이디는 소문자·숫자·밑줄 3~30자만 허용한다", () => {
    expect(signUpSchema.safeParse({ ...base, username: "AB" }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...base, username: "has space" }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...base, username: "a".repeat(31) }).success).toBe(false);
  });
  it("비밀번호는 8~72자", () => {
    expect(signUpSchema.safeParse({ ...base, password: "short" }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...base, password: "x".repeat(73) }).success).toBe(false);
  });
  it("이름은 trim 후 1~50자", () => {
    expect(signUpSchema.safeParse({ ...base, name: "   " }).success).toBe(false);
    expect(signUpSchema.parse({ ...base, name: "  홍길동  " }).name).toBe("홍길동");
  });
  it("username을 소문자로 정규화한다", () => {
    expect(signUpSchema.parse({ ...base, username: "Visa_Bugi" }).username).toBe("visa_bugi");
  });
});

describe("signInSchema", () => {
  it("아이디·비밀번호만 받는다", () => {
    expect(signInSchema.parse({ username: "visa_bugi", password: "secret12" })).toEqual({
      username: "visa_bugi",
      password: "secret12",
    });
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run features/auth/schema.test.ts`
Expected: FAIL ("Cannot find module './schema'").

- [ ] **Step 3: 구현**

```ts
// features/auth/schema.ts
import { z } from "zod";
import { routing } from "@/i18n/routing";

export const ID_EMAIL_DOMAIN = "id.visabugi.internal";

/** 아이디를 정규화한다: 앞뒤 공백 제거 + 소문자. */
function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

/** 정규화한 아이디를 내부용 가상 이메일로 바꾼다. 라우팅 불가 TLD라 실제 메일은 나가지 않는다. */
export function toIdEmail(username: string): string {
  return `${normalizeUsername(username)}@${ID_EMAIL_DOMAIN}`;
}

const usernameSchema = z
  .string()
  .transform(normalizeUsername)
  .pipe(
    z
      .string()
      .regex(/^[a-z0-9_]{3,30}$/, "아이디는 영문 소문자·숫자·밑줄 3~30자입니다."),
  );

const passwordSchema = z
  .string()
  .min(8, "비밀번호는 8자 이상입니다.")
  .max(72, "비밀번호는 72자 이하입니다.");

const nameSchema = z
  .string()
  .transform((value) => value.trim())
  .pipe(z.string().min(1, "이름을 입력해 주세요.").max(50, "이름은 50자 이하입니다."));

export const signUpSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
  name: nameSchema,
  locale: z.enum(routing.locales),
});

export const signInSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run features/auth/schema.test.ts`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add features/auth/schema.ts features/auth/schema.test.ts
git commit -m "feat(auth): 아이디 정규화(toIdEmail)와 가입/로그인 Zod 스키마"
```

---

### Task 4: features/auth/actions.ts — signUpWithId / signInWithId Server Action

**Files:**
- Create: `features/auth/actions.ts`
- Test: `features/auth/actions.test.ts`
- Modify: `features/onboarding/actions.ts` (온보딩 upsert가 username/name을 건드리지 않도록)

**Interfaces:**
- Consumes: `signUpSchema`, `signInSchema`, `toIdEmail` (Task 3); `createClient` from
  `@/lib/supabase/server`; `ProfileInsert` (Task 2).
- Produces:
  - `type AuthActionState = { status: "idle" } | { status: "error"; message: string } | { status: "success" }`
  - `signUpWithId(prev: AuthActionState, formData: FormData): Promise<AuthActionState>`
  - `signInWithId(prev: AuthActionState, formData: FormData): Promise<AuthActionState>`
  - 두 Action 모두 `FormData` 필드: `username`, `password`, `name`(가입만), `locale`(가입만).

- [ ] **Step 1: 실패하는 테스트 작성**

`features/onboarding/actions.test.ts`의 `vi.mock("@/lib/supabase/server", ...)` 패턴을 따른다.

```ts
// features/auth/actions.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const signUp = vi.fn();
const signInWithPassword = vi.fn();
const upsertProfiles = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { signUp, signInWithPassword },
    from: () => ({ upsert: upsertProfiles }),
  }),
}));

const { signUpWithId, signInWithId } = await import("./actions");

function fd(entries: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.set(k, v);
  return f;
}

beforeEach(() => {
  vi.clearAllMocks();
  upsertProfiles.mockResolvedValue({ error: null });
});

describe("signUpWithId", () => {
  it("가상 이메일로 auth.signUp 후 profiles에 username/name/locale upsert", async () => {
    signUp.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    const result = await signUpWithId(
      { status: "idle" },
      fd({ username: "Visa_Bugi", password: "secret12", name: "  홍길동 ", locale: "ko" }),
    );
    expect(signUp).toHaveBeenCalledWith({
      email: "visa_bugi@id.visabugi.internal",
      password: "secret12",
    });
    expect(upsertProfiles).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "u1", username: "visa_bugi", name: "홍길동", locale: "ko" }),
      { onConflict: "user_id" },
    );
    expect(result).toEqual({ status: "success" });
  });

  it("입력이 규칙에 안 맞으면 검증 오류를 반환한다", async () => {
    const result = await signUpWithId(
      { status: "idle" },
      fd({ username: "AB", password: "secret12", name: "홍길동", locale: "ko" }),
    );
    expect(result.status).toBe("error");
    expect(signUp).not.toHaveBeenCalled();
  });

  it("아이디 중복(23505)이면 안내 문구를 반환한다", async () => {
    signUp.mockResolvedValue({
      data: { user: null },
      error: { message: "User already registered", status: 422 },
    });
    const result = await signUpWithId(
      { status: "idle" },
      fd({ username: "visa_bugi", password: "secret12", name: "홍길동", locale: "ko" }),
    );
    expect(result).toEqual({ status: "error", message: "이미 사용 중인 아이디입니다." });
  });
});

describe("signInWithId", () => {
  it("가상 이메일로 signInWithPassword를 호출한다", async () => {
    signInWithPassword.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    const result = await signInWithId(
      { status: "idle" },
      fd({ username: "Visa_Bugi", password: "secret12" }),
    );
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "visa_bugi@id.visabugi.internal",
      password: "secret12",
    });
    expect(result).toEqual({ status: "success" });
  });

  it("아이디 오류와 비밀번호 오류를 같은 문구로 응답한다", async () => {
    signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: "Invalid login credentials", status: 400 },
    });
    const result = await signInWithId(
      { status: "idle" },
      fd({ username: "visa_bugi", password: "wrongpass" }),
    );
    expect(result).toEqual({
      status: "error",
      message: "아이디 또는 비밀번호가 올바르지 않습니다.",
    });
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run features/auth/actions.test.ts`
Expected: FAIL ("Cannot find module './actions'").

- [ ] **Step 3: 구현**

```ts
// features/auth/actions.ts
"use server";

import type { ProfileInsert } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { signInSchema, signUpSchema, toIdEmail } from "./schema";

export type AuthActionState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success" };

const GENERIC_ERROR = "일시적인 오류로 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";
const CREDENTIALS_ERROR = "아이디 또는 비밀번호가 올바르지 않습니다.";
const DUPLICATE_ERROR = "이미 사용 중인 아이디입니다.";

function firstIssueMessage(issues: { message: string }[]): string {
  return issues[0]?.message ?? "입력값을 다시 확인해 주세요.";
}

/** 가입: auth.signUp → profiles upsert(username·name·locale). Confirm Email 비활성 전제라 즉시 세션이 생긴다. */
export async function signUpWithId(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signUpSchema.safeParse({
    username: String(formData.get("username") ?? ""),
    password: String(formData.get("password") ?? ""),
    name: String(formData.get("name") ?? ""),
    locale: String(formData.get("locale") ?? ""),
  });
  if (!parsed.success) {
    return { status: "error", message: firstIssueMessage(parsed.error.issues) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: toIdEmail(parsed.data.username),
    password: parsed.data.password,
  });

  if (error || !data.user) {
    // Supabase는 이메일 중복 가입에 "User already registered"(422)를 준다.
    if (error && (error.status === 422 || /already registered/i.test(error.message))) {
      return { status: "error", message: DUPLICATE_ERROR };
    }
    return { status: "error", message: GENERIC_ERROR };
  }

  const profileRow: Pick<ProfileInsert, "user_id" | "locale" | "username" | "name"> = {
    user_id: data.user.id,
    locale: parsed.data.locale,
    username: parsed.data.username,
    name: parsed.data.name,
  };
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert(profileRow, { onConflict: "user_id" });
  if (profileError) {
    return { status: "error", message: GENERIC_ERROR };
  }

  return { status: "success" };
}

/** 로그인: auth.signInWithPassword. 아이디 없음/비번 틀림을 같은 문구로 응답. */
export async function signInWithId(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signInSchema.safeParse({
    username: String(formData.get("username") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) {
    return { status: "error", message: CREDENTIALS_ERROR };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: toIdEmail(parsed.data.username),
    password: parsed.data.password,
  });
  if (error || !data.user) {
    return { status: "error", message: CREDENTIALS_ERROR };
  }

  return { status: "success" };
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run features/auth/actions.test.ts`
Expected: PASS.

- [ ] **Step 5: 온보딩 upsert가 username/name을 덮어쓰지 않게 조정**

`features/onboarding/actions.ts`의 `profileRow`에서 Task 2 Step 3에 넣었던 `username: null,
name: null,` 두 줄을 **삭제**하고, upsert 옵션에 `ignoreDuplicates: false` + 명시적 컬럼만 갱신하도록
`onConflict`는 유지하되 `username`/`name`을 페이로드에서 뺀다. Supabase upsert는 페이로드에 없는
컬럼을 건드리지 않으므로, 두 줄을 빼는 것으로 충분하다. `ProfileInsert` 타입 에러를 피하려면
리터럴 타입을 좁힌다:

```ts
  const profileRow: Omit<ProfileInsert, "username" | "name"> = {
    user_id: user.id,
    locale: submission.locale,
    gender: submission.gender,
    birthdate: submission.birthdate,
    nationality: submission.nationality,
  };
```

- [ ] **Step 6: 온보딩 테스트 회귀 확인**

Run: `npx vitest run features/onboarding/actions.test.ts`
Expected: PASS.

- [ ] **Step 7: 커밋**

```bash
git add features/auth/actions.ts features/auth/actions.test.ts features/onboarding/actions.ts
git commit -m "feat(auth): signUpWithId/signInWithId Server Action + 온보딩 upsert 컬럼 분리"
```

---

### Task 5: lib/auth/use-auth-state.ts — 실제 Supabase 세션 반영

**Files:**
- Modify: `lib/auth/use-auth-state.ts` (전체 교체)
- Test: `lib/auth/use-auth-state.test.tsx` (생성)

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/client`.
- Produces: `useAuthState(): AuthState` — 시그니처·반환 타입 불변.
  `AuthState = { status: "loading" } | { status: "guest" } | { status: "authenticated"; userId: string }`.
  판정: `user`가 있고 `user.is_anonymous !== true` → `authenticated`. 익명 세션 또는 세션 없음 → `guest`.
  env 미설정 → `guest` (로딩 종료).

- [ ] **Step 1: 실패하는 테스트 작성**

```tsx
// lib/auth/use-auth-state.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
const onAuthStateChange = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { getUser, onAuthStateChange } }),
}));

const { useAuthState } = await import("./use-auth-state");

function Probe() {
  const state = useAuthState();
  return <output>{state.status === "authenticated" ? `auth:${state.userId}` : state.status}</output>;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "pk";
  onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
});

it("비익명 사용자는 authenticated", async () => {
  getUser.mockResolvedValue({ data: { user: { id: "u1", is_anonymous: false } } });
  render(<Probe />);
  await waitFor(() => expect(screen.getByRole("status", { hidden: true }) ?? screen.getByText(/auth:u1/)).toBeTruthy());
  expect(screen.getByText("auth:u1")).toBeInTheDocument();
});

it("익명 세션은 guest", async () => {
  getUser.mockResolvedValue({ data: { user: { id: "anon", is_anonymous: true } } });
  render(<Probe />);
  await waitFor(() => expect(screen.getByText("guest")).toBeInTheDocument());
});

it("세션 없음은 guest", async () => {
  getUser.mockResolvedValue({ data: { user: null } });
  render(<Probe />);
  await waitFor(() => expect(screen.getByText("guest")).toBeInTheDocument());
});

it("env 미설정이면 조회 없이 guest", async () => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  render(<Probe />);
  await waitFor(() => expect(screen.getByText("guest")).toBeInTheDocument());
  expect(getUser).not.toHaveBeenCalled();
});
```

> 테스트가 뜨면 `screen.getByRole` 라인은 단순화해도 된다 — 핵심은 최종 텍스트 단언이다.

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run lib/auth/use-auth-state.test.tsx`
Expected: FAIL (현재 구현은 항상 `{ status: "guest" }`라 `authenticated` 케이스가 깨진다).

- [ ] **Step 3: 구현**

```ts
// lib/auth/use-auth-state.ts
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type AuthState =
  | { status: "loading" }
  | { status: "guest" }
  | { status: "authenticated"; userId: string };

function hasSupabaseEnv(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

function toState(user: { id: string; is_anonymous?: boolean } | null): AuthState {
  if (user && user.is_anonymous !== true) {
    return { status: "authenticated", userId: user.id };
  }
  return { status: "guest" };
}

/**
 * 실제 Supabase 세션을 반영한다. 비익명 사용자만 authenticated,
 * 익명 세션·세션 없음·env 미설정은 guest.
 */
export function useAuthState(): AuthState {
  const [state, setState] = useState<AuthState>(
    hasSupabaseEnv() ? { status: "loading" } : { status: "guest" },
  );

  useEffect(() => {
    if (!hasSupabaseEnv()) return;
    const supabase = createClient();
    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (active) setState(toState(data.user));
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setState(toState(session?.user ?? null));
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return state;
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run lib/auth/use-auth-state.test.tsx features/calendar`
Expected: PASS (calendar-page는 시그니처 그대로라 회귀 없음).

- [ ] **Step 5: 커밋**

```bash
git add lib/auth/use-auth-state.ts lib/auth/use-auth-state.test.tsx
git commit -m "feat(auth): useAuthState를 실제 Supabase 세션 구독으로 구현"
```

---

### Task 6: features/auth/auth-form.tsx — 아이디/비밀번호 폼

**Files:**
- Create: `features/auth/auth-form.tsx`
- Test: `features/auth/auth-form.test.tsx`
- Modify: `messages/{ko,zh,vi,uz,ne,km}.json` (`Auth` 네임스페이스)

**Interfaces:**
- Consumes: `signUpWithId`, `signInWithId`, `AuthActionState` (Task 4); `useRouter` from
  `@/i18n/navigation`; `useLocale`, `useTranslations` from `next-intl`.
- Produces: `AuthForm(props: { onAuthenticated: () => void })` — Client Component.
  탭 2개(로그인/회원가입), `useActionState`로 각 Action 연결, `status === "success"`면
  `onAuthenticated()` 호출.

- [ ] **Step 1: 메시지 키 추가**

`messages/ko.json`의 최상위에 `Auth` 네임스페이스를 추가한다(다른 5개 locale도 같은 키 구조로,
값은 각 언어 번역). `tests/i18n-messages.test.ts`가 "ko와 같은 키 구조"를 강제하므로 6개 파일 모두 필요.

```jsonc
  "Auth": {
    "tabSignIn": "로그인",
    "tabSignUp": "회원가입",
    "username": "아이디",
    "usernameHint": "영문 소문자·숫자·밑줄 3~30자",
    "password": "비밀번호",
    "passwordHint": "8자 이상",
    "name": "이름",
    "signInSubmit": "로그인",
    "signUpSubmit": "회원가입하고 시작하기",
    "submitting": "처리 중…",
    "genericError": "일시적인 오류로 처리하지 못했습니다. 잠시 후 다시 시도해 주세요."
  }
```

- [ ] **Step 2: 실패하는 테스트 작성**

```tsx
// features/auth/auth-form.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import messages from "@/messages/ko.json";

const signInWithId = vi.fn();
const signUpWithId = vi.fn();
vi.mock("./actions", () => ({ signInWithId: (...a: unknown[]) => signInWithId(...a), signUpWithId: (...a: unknown[]) => signUpWithId(...a) }));
vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

const { AuthForm } = await import("./auth-form");

function renderForm(onAuthenticated = vi.fn()) {
  return render(
    <NextIntlClientProvider locale="ko" messages={messages}>
      <AuthForm onAuthenticated={onAuthenticated} />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => vi.clearAllMocks());

it("기본은 로그인 탭이고 아이디/비밀번호 필드를 보여준다", () => {
  renderForm();
  expect(screen.getByLabelText("아이디")).toBeInTheDocument();
  expect(screen.getByLabelText("비밀번호")).toBeInTheDocument();
  expect(screen.queryByLabelText("이름")).not.toBeInTheDocument();
});

it("회원가입 탭으로 바꾸면 이름 필드가 나타난다", async () => {
  renderForm();
  await userEvent.click(screen.getByRole("tab", { name: "회원가입" }));
  expect(screen.getByLabelText("이름")).toBeInTheDocument();
});

it("로그인 실패 메시지를 표시한다", async () => {
  signInWithId.mockResolvedValue({ status: "error", message: "아이디 또는 비밀번호가 올바르지 않습니다." });
  renderForm();
  await userEvent.type(screen.getByLabelText("아이디"), "visa_bugi");
  await userEvent.type(screen.getByLabelText("비밀번호"), "wrongpass");
  await userEvent.click(screen.getByRole("button", { name: "로그인" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("아이디 또는 비밀번호가 올바르지 않습니다.");
});

it("성공하면 onAuthenticated를 호출한다", async () => {
  const onAuthenticated = vi.fn();
  signInWithId.mockResolvedValue({ status: "success" });
  renderForm(onAuthenticated);
  await userEvent.type(screen.getByLabelText("아이디"), "visa_bugi");
  await userEvent.type(screen.getByLabelText("비밀번호"), "secret12");
  await userEvent.click(screen.getByRole("button", { name: "로그인" }));
  await vi.waitFor(() => expect(onAuthenticated).toHaveBeenCalled());
});
```

- [ ] **Step 3: 실패 확인**

Run: `npx vitest run features/auth/auth-form.test.tsx`
Expected: FAIL ("Cannot find module './auth-form'").

- [ ] **Step 4: 구현**

`features/onboarding/onboarding-form.tsx`의 `useActionState` 사용 패턴을 따른다. 접근성:
`role="tablist"`/`role="tab"`, 각 입력에 `<label htmlFor>`, 오류는 `role="alert"`.

```tsx
// features/auth/auth-form.tsx
"use client";

import { useTranslations, useLocale } from "next-intl";
import { useActionState, useEffect, useState } from "react";
import { signInWithId, signUpWithId, type AuthActionState } from "./actions";

type Mode = "signIn" | "signUp";
const IDLE: AuthActionState = { status: "idle" };

export function AuthForm({ onAuthenticated }: { onAuthenticated: () => void }) {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const [mode, setMode] = useState<Mode>("signIn");
  const [signInState, signInAction, signInPending] = useActionState(signInWithId, IDLE);
  const [signUpState, signUpAction, signUpPending] = useActionState(signUpWithId, IDLE);

  const state = mode === "signIn" ? signInState : signUpState;
  const pending = mode === "signIn" ? signInPending : signUpPending;

  useEffect(() => {
    if (state.status === "success") onAuthenticated();
  }, [state.status, onAuthenticated]);

  return (
    <div className="w-full max-w-xs">
      <div role="tablist" aria-label={t("tabSignIn") + " / " + t("tabSignUp")} className="mb-4 grid grid-cols-2 gap-1 rounded-2xl bg-[#eef2f0] p-1">
        {(["signIn", "signUp"] as const).map((m) => (
          <button
            key={m}
            role="tab"
            type="button"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`min-h-11 rounded-xl text-sm font-extrabold ${mode === m ? "bg-white text-[#20332c] shadow-sm" : "text-[#6c7873]"}`}
          >
            {m === "signIn" ? t("tabSignIn") : t("tabSignUp")}
          </button>
        ))}
      </div>

      <form action={mode === "signIn" ? signInAction : signUpAction} className="grid gap-3 text-left">
        <input type="hidden" name="locale" value={locale} />

        <label className="grid gap-1 text-xs font-bold text-[#52615b]" htmlFor="auth-username">
          {t("username")}
          <input
            id="auth-username"
            name="username"
            autoComplete="username"
            required
            className="min-h-12 rounded-xl border border-[#dfe5e1] bg-white px-3 text-sm text-[#20332c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d]"
          />
          <span className="font-normal text-[#8a938e]">{t("usernameHint")}</span>
        </label>

        {mode === "signUp" ? (
          <label className="grid gap-1 text-xs font-bold text-[#52615b]" htmlFor="auth-name">
            {t("name")}
            <input
              id="auth-name"
              name="name"
              autoComplete="name"
              required
              className="min-h-12 rounded-xl border border-[#dfe5e1] bg-white px-3 text-sm text-[#20332c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d]"
            />
          </label>
        ) : null}

        <label className="grid gap-1 text-xs font-bold text-[#52615b]" htmlFor="auth-password">
          {t("password")}
          <input
            id="auth-password"
            name="password"
            type="password"
            autoComplete={mode === "signIn" ? "current-password" : "new-password"}
            required
            className="min-h-12 rounded-xl border border-[#dfe5e1] bg-white px-3 text-sm text-[#20332c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d]"
          />
          <span className="font-normal text-[#8a938e]">{t("passwordHint")}</span>
        </label>

        {state.status === "error" ? (
          <p role="alert" className="rounded-xl bg-[#fff0ed] px-3 py-2 text-xs font-semibold leading-5 text-[#9f4038]">
            {state.message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="mt-1 inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#2d6d5d] px-5 text-sm font-extrabold text-white shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d] disabled:bg-[#c7d1cc]"
        >
          {pending ? t("submitting") : mode === "signIn" ? t("signInSubmit") : t("signUpSubmit")}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 5: 통과 확인 + i18n 구조 테스트**

Run: `npx vitest run features/auth/auth-form.test.tsx tests/i18n-messages.test.ts`
Expected: PASS (6개 locale에 `Auth` 키를 모두 넣었으면 구조 테스트 통과).

- [ ] **Step 6: 커밋**

```bash
git add features/auth/auth-form.tsx features/auth/auth-form.test.tsx messages/
git commit -m "feat(auth): 아이디/비밀번호 로그인·회원가입 폼과 Auth 메시지"
```

---

### Task 7: 온보딩 진입 화면에 AuthForm 연결

**Files:**
- Modify: `features/onboarding/onboarding-welcome.tsx`
- Modify: `features/onboarding/onboarding-welcome.test.tsx`

**Interfaces:**
- Consumes: `AuthForm` (Task 6).
- Produces: 동작 변화 없음(외부 시그니처 `onContinueWithoutLogin` 유지). 미구현 Google 버튼과
  `googleComingSoon` 안내를 제거하고 그 자리에 `<AuthForm>`.
  - 로그인/회원가입 성공(`onAuthenticated`) → `router.push("/")`. 홈의 `hasCompletedOnboarding`
    가드가 미완료 프로필을 `/onboarding?step=...`로 되돌린다(회원가입 직후엔 프로필 미완이라
    온보딩 0단계로 감).
  - "로그인 없이 시작하기"(`onContinueWithoutLogin`) → 기존대로 익명 계정으로 0단계.

- [ ] **Step 1: 테스트 갱신 (실패 상태로)**

`features/onboarding/onboarding-welcome.test.tsx`에서 "Google 버튼 클릭 시 안내" 케이스를
삭제하고 다음을 추가한다.

```tsx
it("아이디/비밀번호 폼을 보여준다 (미구현 Google 버튼 없음)", () => {
  renderWelcome();
  expect(screen.queryByText("Google로 시작하기")).not.toBeInTheDocument();
  expect(screen.getByLabelText("아이디")).toBeInTheDocument();
});

it("로그인 없이 시작하기는 그대로 동작한다", async () => {
  const onContinue = vi.fn();
  renderWelcome({ onContinueWithoutLogin: onContinue });
  await userEvent.click(screen.getByRole("button", { name: "로그인 없이 시작하기" }));
  expect(onContinue).toHaveBeenCalled();
});
```

렌더 헬퍼는 `NextIntlClientProvider` + `messages/ko.json`로 감싸고,
`@/i18n/navigation`의 `useRouter`를 mock한다(Task 6 테스트와 동일 패턴).

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run features/onboarding/onboarding-welcome.test.tsx`
Expected: FAIL (아직 Google 버튼이 남아 있음).

- [ ] **Step 3: 구현**

`onboarding-welcome.tsx`에서 `handleGoogleLogin`, `showGoogleNotice` state, Google 버튼과
`googleComingSoon` 문단을 삭제하고, `useRouter`를 추가한다.

```tsx
"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import { Link, useRouter } from "@/i18n/navigation";
import { AuthForm } from "@/features/auth/auth-form";

type Props = { onContinueWithoutLogin: () => void };

export function OnboardingWelcome({ onContinueWithoutLogin }: Props) {
  const t = useTranslations("Onboarding");
  const router = useRouter();

  return (
    <section
      aria-labelledby="welcome-title"
      className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-sm flex-col items-center justify-between gap-8 px-4 py-10 text-center"
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        <Image
          src="/brand/onboarding/visa-bugi-login-hero-v1.png"
          alt="비자부기"
          width={1145}
          height={1373}
          priority
          className="h-auto w-32 sm:w-40"
        />
        <div>
          <h2 id="welcome-title" className="text-2xl font-black leading-tight tracking-[-0.04em] text-[#20332c] sm:text-3xl">
            {t("welcomeTitle")}
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#6c7873] sm:text-base">{t("welcomeDescription")}</p>
        </div>
      </div>

      <div className="grid w-full max-w-xs gap-3">
        <AuthForm onAuthenticated={() => router.push("/")} />

        <button
          type="button"
          onClick={onContinueWithoutLogin}
          className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-[#dfe5e1] bg-white px-5 text-sm font-extrabold text-[#33453e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d]"
        >
          {t("continueWithoutLogin")}
        </button>

        <p className="mt-1 max-w-xs text-center text-xs leading-5 text-[#8a938e]">
          {t.rich("consentNotice", {
            terms: (chunks) => (
              <Link href="/terms" className="font-semibold text-[#52615b] underline underline-offset-2">{chunks}</Link>
            ),
            privacy: (chunks) => (
              <Link href="/privacy" className="font-semibold text-[#52615b] underline underline-offset-2">{chunks}</Link>
            ),
          })}
        </p>
      </div>
    </section>
  );
}
```

> `messages`의 `Onboarding.googleStart`·`googleComingSoon`는 다른 곳에서 안 쓰이면
> 삭제한다. `tests/i18n-messages.test.ts` 구조 테스트 때문에 6개 locale에서 함께 지운다.
> (grep으로 사용처 확인 후 진행: `rg "googleStart|googleComingSoon"`).

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run features/onboarding tests/i18n-messages.test.ts`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add features/onboarding/onboarding-welcome.tsx features/onboarding/onboarding-welcome.test.tsx messages/
git commit -m "feat(auth): 온보딩 진입 화면의 미구현 Google 버튼을 아이디/비밀번호 폼으로 교체"
```

---

### Task 8: Phase 1 검증과 PR

- [ ] **Step 1: 전체 검증**

Run: `npm run lint && npm run typecheck && npm test && npm run build`
Expected: 모두 PASS. (`vitest`가 느린 콜드런에서 타임아웃 나면 1회 재실행)

- [ ] **Step 2: 문서화 — 사전 조건 재확인**

이 계획 상단 "사전 조건" 섹션의 Supabase 대시보드 설정(Confirm Email 비활성, Anonymous 유지)과
`OPENAI_API_KEY` 교체가 배포 전 필요함을 PR 본문에 명시한다.

- [ ] **Step 3: PR 생성 (머지하지 않음)**

```bash
git push -u origin taeeunni/next-bff-id
gh pr create --base main --title "feat(auth): 아이디/비밀번호 인증 (Phase 1)" --body "<변경 요약 / 검증 명령 / 남은 작업(사전 조건, Phase 2) / 수동 검증 체크리스트>"
```

- [ ] **Step 4: 수동 검증 체크리스트 (PR 본문에 포함, 사람이 확인)**
  - 새 계정 회원가입 → 즉시 온보딩 0단계
  - 로그아웃 상태에서 로그인 → 홈, 미완료 프로필은 온보딩으로
  - "로그인 없이 시작하기" → 익명 계정 온보딩
  - 캘린더가 로그인 사용자에게 `PersonalCalendar`, 게스트/익명에게 `GuestChecklistCalendar`

---

## Phase 2 — 공용 BFF API

> Phase 1 PR이 머지된 뒤 `main`에서 새 브랜치 `taeeunni/next-bff-api`를 딴다.
> (Phase 1이 리뷰 중이면 `taeeunni/next-bff-id` 위에 스택). 아래 커밋도 이 브랜치에.

### Task 9: lib/api/errors.ts — 공통 오류 계약과 라우트 래퍼

**Files:**
- Create: `lib/api/errors.ts`
- Test: `lib/api/errors.test.ts`

**Interfaces:**
- Produces:
  - `type ApiError = { error: { code: string; message: string; requestId: string } }`
  - `class ApiRouteError extends Error` — `constructor(status: number, code: string, message: string)`.
  - `apiErrorResponse(status: number, code: string, message: string, requestId: string): Response`
    — `Response.json(ApiError, { status, headers: { "Cache-Control": "no-store" } })`.
  - `withApiRoute(handler: (req: Request, ctx: { requestId: string }) => Promise<Response>): (req: Request) => Promise<Response>`
    — `x-request-id` 헤더가 있으면 사용, 없으면 `crypto.randomUUID()`. `handler`가 던진
    `ApiRouteError`는 `apiErrorResponse`로, 그 외 예외는 500 `INTERNAL`로 직렬화. 두 경우 모두
    `console.error`로 `{ requestId, code, status, message }` + 원인 로깅. 성공 응답에는
    `x-request-id` 헤더를 붙여 반환.

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// lib/api/errors.test.ts
import { describe, expect, it, vi } from "vitest";
import { ApiRouteError, withApiRoute } from "./errors";

describe("withApiRoute", () => {
  it("정상 핸들러 응답에 x-request-id를 붙인다", async () => {
    const wrapped = withApiRoute(async (_req, { requestId }) =>
      Response.json({ ok: true, requestId }),
    );
    const res = await wrapped(new Request("https://x/api/t", { headers: { "x-request-id": "req-1" } }));
    expect(res.headers.get("x-request-id")).toBe("req-1");
    expect(await res.json()).toEqual({ ok: true, requestId: "req-1" });
  });

  it("ApiRouteError를 공통 오류 형태로 직렬화한다", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const wrapped = withApiRoute(async () => {
      throw new ApiRouteError(401, "AUTH_REQUIRED", "로그인이 필요합니다.");
    });
    const res = await wrapped(new Request("https://x/api/t", { headers: { "x-request-id": "req-2" } }));
    expect(res.status).toBe(401);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(await res.json()).toEqual({
      error: { code: "AUTH_REQUIRED", message: "로그인이 필요합니다.", requestId: "req-2" },
    });
  });

  it("예상치 못한 예외는 500 INTERNAL로 감싸고 상세를 브라우저에 노출하지 않는다", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const wrapped = withApiRoute(async () => {
      throw new Error("supabase down: secret detail");
    });
    const res = await wrapped(new Request("https://x/api/t"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe("INTERNAL");
    expect(JSON.stringify(body)).not.toContain("secret detail");
    expect(typeof body.error.requestId).toBe("string");
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run lib/api/errors.test.ts`
Expected: FAIL ("Cannot find module './errors'").

- [ ] **Step 3: 구현**

```ts
// lib/api/errors.ts
export type ApiError = {
  error: { code: string; message: string; requestId: string };
};

/** 라우트 핸들러가 던지면 withApiRoute가 공통 오류 형태로 직렬화한다. */
export class ApiRouteError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiRouteError";
  }
}

export function apiErrorResponse(
  status: number,
  code: string,
  message: string,
  requestId: string,
): Response {
  const body: ApiError = { error: { code, message, requestId } };
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", "x-request-id": requestId },
  });
}

type Handler = (
  request: Request,
  context: { requestId: string },
) => Promise<Response>;

/** 요청 ID 부여 + 공통 오류 직렬화 + 서버 로깅. */
export function withApiRoute(handler: Handler) {
  return async (request: Request): Promise<Response> => {
    const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
    try {
      const response = await handler(request, { requestId });
      // 성공 응답에도 추적용 헤더를 남긴다(캐시 정책은 핸들러가 각자 설정).
      const headers = new Headers(response.headers);
      headers.set("x-request-id", requestId);
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch (cause) {
      if (cause instanceof ApiRouteError) {
        console.error("[api]", {
          requestId,
          code: cause.code,
          status: cause.status,
          message: cause.message,
        });
        return apiErrorResponse(cause.status, cause.code, cause.message, requestId);
      }
      console.error("[api]", { requestId, code: "INTERNAL", status: 500 }, cause);
      return apiErrorResponse(
        500,
        "INTERNAL",
        "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
        requestId,
      );
    }
  };
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run lib/api/errors.test.ts`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add lib/api/errors.ts lib/api/errors.test.ts
git commit -m "feat(api): 공통 오류 계약(ApiError)과 withApiRoute 래퍼"
```

---

### Task 10: features/map/server/agencies.ts — 기관 조회 도메인 모듈

**Files:**
- Create: `features/map/server/agencies.ts`
- Test: `features/map/server/agencies.test.ts`
- Modify: `features/map/agency-queries.ts` (순수 함수만 남기고 `fetchNearbyAgencies` 이동)

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/server`; `haversineDistanceKm`, `sortByDistance`,
  `toAgency`(export 추가), `type Agency`, `type AgencyType`, `REGION_QUERY_TOKENS`,
  `PROVINCE_WIDE_TOKEN`(export 추가) from `@/features/map/agency-queries`; `type RegionId`,
  `type LatLng`, `REGION_CENTERS` from `@/features/map/geo`.
- Produces:
  - `type AgencyQuery = { region: RegionId | null; agencyType: AgencyType | null; near: LatLng; limit: number }`
  - `getNearbyAgencies(query: AgencyQuery): Promise<Agency[]>` — env 미설정이면 `ApiRouteError(503, "MAP_NOT_CONFIGURED", ...)`.
    Supabase 오류면 `ApiRouteError(502, "MAP_QUERY_FAILED", ...)`.

- [ ] **Step 1: agency-queries.ts에서 재사용 심볼 export**

`features/map/agency-queries.ts`에서 `toAgency`와 `PROVINCE_WIDE_TOKEN`에 `export`를 붙인다.
`fetchNearbyAgencies`(SupabaseClient를 인자로 받는 버전)와 그 위의 `AgencyRow` 타입은 다음 Step에서
새 모듈로 옮긴다.

- [ ] **Step 2: 실패하는 테스트 작성**

```ts
// features/map/server/agencies.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const select = vi.fn();
const or = vi.fn();
const eq = vi.fn();
let rows: unknown[] = [];
let queryError: unknown = null;

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: () => {
      const builder: Record<string, unknown> = {};
      builder.select = () => builder;
      builder.or = () => builder;
      builder.eq = () => builder;
      builder.then = (resolve: (v: unknown) => void) => resolve({ data: rows, error: queryError });
      return builder;
    },
  }),
}));

const { getNearbyAgencies } = await import("./agencies");

beforeEach(() => {
  vi.clearAllMocks();
  rows = [];
  queryError = null;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "pk";
});

it("행을 Agency로 변환하고 거리순 정렬 후 limit만큼 반환한다", async () => {
  rows = [
    { agency_id: "a", department_name: "먼 곳", agency_type: "OTHER", road_address: null, latitude: 38, longitude: 128, phone: "", url: null, operating_hours: null },
    { agency_id: "b", department_name: "가까운 곳", agency_type: "OTHER", road_address: null, latitude: 36.64, longitude: 127.49, phone: "", url: null, operating_hours: null },
  ];
  const result = await getNearbyAgencies({
    region: "cheongju",
    agencyType: null,
    near: { lat: 36.64, lng: 127.49 },
    limit: 1,
  });
  expect(result.map((a) => a.id)).toEqual(["b"]);
  expect(result[0].name).toBe("가까운 곳");
});

it("env 미설정이면 MAP_NOT_CONFIGURED", async () => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  await expect(
    getNearbyAgencies({ region: null, agencyType: null, near: { lat: 36.6, lng: 127.5 }, limit: 3 }),
  ).rejects.toMatchObject({ status: 503, code: "MAP_NOT_CONFIGURED" });
});

it("Supabase 오류면 MAP_QUERY_FAILED", async () => {
  queryError = { message: "boom" };
  await expect(
    getNearbyAgencies({ region: null, agencyType: null, near: { lat: 36.6, lng: 127.5 }, limit: 3 }),
  ).rejects.toMatchObject({ status: 502, code: "MAP_QUERY_FAILED" });
});
```

- [ ] **Step 3: 실패 확인**

Run: `npx vitest run features/map/server/agencies.test.ts`
Expected: FAIL ("Cannot find module './agencies'").

- [ ] **Step 4: 구현**

`agency-queries.ts`의 기존 `fetchNearbyAgencies` 쿼리 로직을 그대로 옮기되, `SupabaseClient`
인자 대신 서버 클라이언트를 내부에서 만들고, `throw`를 `ApiRouteError`로 바꾼다.

```ts
// features/map/server/agencies.ts
import "server-only";
import { ApiRouteError } from "@/lib/api/errors";
import {
  PROVINCE_WIDE_TOKEN,
  REGION_QUERY_TOKENS,
  sortByDistance,
  toAgency,
  type Agency,
  type AgencyType,
} from "@/features/map/agency-queries";
import type { LatLng, RegionId } from "@/features/map/geo";
import { createClient } from "@/lib/supabase/server";

export type AgencyQuery = {
  region: RegionId | null;
  agencyType: AgencyType | null;
  near: LatLng;
  limit: number;
};

function hasSupabaseEnv(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

export async function getNearbyAgencies(query: AgencyQuery): Promise<Agency[]> {
  if (!hasSupabaseEnv()) {
    throw new ApiRouteError(503, "MAP_NOT_CONFIGURED", "기관 정보가 아직 연결되지 않았습니다.");
  }

  const supabase = await createClient();
  let request = supabase
    .from("map_visible_agency_contacts")
    .select(
      "agency_id, department_name, agency_type, road_address, latitude, longitude, phone, url, operating_hours",
    );

  if (query.region) {
    const token = REGION_QUERY_TOKENS[query.region];
    request = request.or(`region.eq.${token},region.eq.${PROVINCE_WIDE_TOKEN}`);
  }
  if (query.agencyType) {
    request = request.eq("agency_type", query.agencyType);
  }

  const { data, error } = await request;
  if (error) {
    throw new ApiRouteError(502, "MAP_QUERY_FAILED", "기관 정보를 불러오지 못했습니다.");
  }

  const agencies = (data ?? []).map(toAgency);
  return sortByDistance(agencies, query.near).slice(0, query.limit);
}
```

`features/map/agency-queries.ts`에서 이제 쓰이지 않는 `fetchNearbyAgencies`, `AgencyRow`,
`import type { SupabaseClient }` 를 삭제한다.

- [ ] **Step 5: 통과 확인 + agency-queries 테스트 정리**

`tests/agency-queries.test.ts`에서 `fetchNearbyAgencies`를 검증하던 케이스를
`features/map/server/agencies.test.ts`로 옮겼는지 확인하고, 순수 함수(`haversineDistanceKm`,
`sortByDistance`) 테스트만 남긴다.

Run: `npx vitest run features/map tests/agency-queries.test.ts`
Expected: PASS.

- [ ] **Step 6: 커밋**

```bash
git add features/map/server/agencies.ts features/map/server/agencies.test.ts features/map/agency-queries.ts tests/agency-queries.test.ts
git commit -m "feat(map): 기관 조회를 서버 도메인 모듈로 이동(getNearbyAgencies)"
```

---

### Task 11: app/api/map/agencies/route.ts — 기관 목록 엔드포인트

**Files:**
- Create: `app/api/map/agencies/route.ts`
- Test: `app/api/map/agencies/route.test.ts`

**Interfaces:**
- Consumes: `withApiRoute`, `ApiRouteError` (Task 9); `getNearbyAgencies`, `type AgencyQuery` (Task 10);
  `REGION_CENTERS` from `@/features/map/geo`.
- Produces: `GET` 핸들러. 쿼리 파라미터:
  - `region` (선택): `cheongju|chungju|jincheon|eumseong` 중 하나. 없으면 `null`.
  - `type` (선택): `AgencyType` enum. 없거나 `all`이면 `null`.
  - `lat`, `lng` (선택 쌍): 둘 다 있으면 숫자 파싱, 아니면 `region`(또는 기본 `cheongju`)의
    `REGION_CENTERS` 좌표.
  - `limit` (선택): 1~20 정수, 기본 3.
  - 잘못된 값이면 `ApiRouteError(400, "INVALID_QUERY", ...)`.
  - 성공: `Response.json({ agencies }, { headers: { "Cache-Control": "public, max-age=60" } })`.
    (개인화되지 않은 조회라 짧은 public 캐시)

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// app/api/map/agencies/route.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const getNearbyAgencies = vi.fn();
vi.mock("@/features/map/server/agencies", () => ({ getNearbyAgencies: (...a: unknown[]) => getNearbyAgencies(...a) }));

const { GET } = await import("./route");

beforeEach(() => vi.clearAllMocks());

it("region+type을 파싱해 도메인 모듈에 넘기고 짧은 public 캐시로 응답한다", async () => {
  getNearbyAgencies.mockResolvedValue([{ id: "a", name: "x" }]);
  const res = await GET(new Request("https://x/api/map/agencies?region=chungju&type=COMMUNITY_CENTER&limit=2"));
  expect(res.status).toBe(200);
  expect(res.headers.get("Cache-Control")).toBe("public, max-age=60");
  expect(await res.json()).toEqual({ agencies: [{ id: "a", name: "x" }] });
  expect(getNearbyAgencies).toHaveBeenCalledWith(
    expect.objectContaining({ region: "chungju", agencyType: "COMMUNITY_CENTER", limit: 2 }),
  );
});

it("type=all 또는 미지정이면 agencyType=null", async () => {
  getNearbyAgencies.mockResolvedValue([]);
  await GET(new Request("https://x/api/map/agencies?type=all"));
  expect(getNearbyAgencies).toHaveBeenCalledWith(expect.objectContaining({ agencyType: null }));
});

it("lat/lng가 둘 다 오면 그 좌표를 near로 쓴다", async () => {
  getNearbyAgencies.mockResolvedValue([]);
  await GET(new Request("https://x/api/map/agencies?lat=36.64&lng=127.49"));
  expect(getNearbyAgencies).toHaveBeenCalledWith(
    expect.objectContaining({ near: { lat: 36.64, lng: 127.49 } }),
  );
});

it("잘못된 region이면 400 INVALID_QUERY", async () => {
  const res = await GET(new Request("https://x/api/map/agencies?region=seoul"));
  expect(res.status).toBe(400);
  expect((await res.json()).error.code).toBe("INVALID_QUERY");
});

it("limit이 범위를 벗어나면 400", async () => {
  const res = await GET(new Request("https://x/api/map/agencies?limit=999"));
  expect(res.status).toBe(400);
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run app/api/map/agencies/route.test.ts`
Expected: FAIL ("Cannot find module './route'").

- [ ] **Step 3: 구현**

```ts
// app/api/map/agencies/route.ts
import { ApiRouteError, withApiRoute } from "@/lib/api/errors";
import { getNearbyAgencies } from "@/features/map/server/agencies";
import { REGION_CENTERS, type LatLng, type RegionId } from "@/features/map/geo";

const REGIONS: RegionId[] = ["cheongju", "chungju", "jincheon", "eumseong"];
const AGENCY_TYPES = [
  "COMMUNITY_CENTER",
  "ADMINISTRATIVE_AGENCY",
  "UNIVERSITY_DEPT_OFFICE",
  "FOREIGN_SUPPORT_CENTER",
  "OTHER",
] as const;

function parseNear(params: URLSearchParams, region: RegionId | null): LatLng {
  const latRaw = params.get("lat");
  const lngRaw = params.get("lng");
  if (latRaw !== null && lngRaw !== null) {
    const lat = Number(latRaw);
    const lng = Number(lngRaw);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < 33 || lat > 39 || lng < 124 || lng > 132) {
      throw new ApiRouteError(400, "INVALID_QUERY", "좌표 값이 올바르지 않습니다.");
    }
    return { lat, lng };
  }
  return REGION_CENTERS[region ?? "cheongju"];
}

export const GET = withApiRoute(async (request) => {
  const params = new URL(request.url).searchParams;

  const regionRaw = params.get("region");
  if (regionRaw !== null && !REGIONS.includes(regionRaw as RegionId)) {
    throw new ApiRouteError(400, "INVALID_QUERY", "지원하지 않는 지역입니다.");
  }
  const region = (regionRaw as RegionId | null) ?? null;

  const typeRaw = params.get("type");
  if (typeRaw !== null && typeRaw !== "all" && !AGENCY_TYPES.includes(typeRaw as (typeof AGENCY_TYPES)[number])) {
    throw new ApiRouteError(400, "INVALID_QUERY", "지원하지 않는 기관 유형입니다.");
  }
  const agencyType = typeRaw && typeRaw !== "all" ? (typeRaw as (typeof AGENCY_TYPES)[number]) : null;

  let limit = 3;
  const limitRaw = params.get("limit");
  if (limitRaw !== null) {
    limit = Number(limitRaw);
    if (!Number.isInteger(limit) || limit < 1 || limit > 20) {
      throw new ApiRouteError(400, "INVALID_QUERY", "limit은 1~20 사이 정수입니다.");
    }
  }

  const near = parseNear(params, region);
  const agencies = await getNearbyAgencies({ region, agencyType, near, limit });

  return Response.json({ agencies }, { headers: { "Cache-Control": "public, max-age=60" } });
});
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run app/api/map/agencies/route.test.ts`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add app/api/map/agencies/route.ts app/api/map/agencies/route.test.ts
git commit -m "feat(api): GET /api/map/agencies 라우트 핸들러"
```

---

### Task 12: agency-map.tsx가 브라우저 Supabase 대신 API를 쓰도록 이관

**Files:**
- Modify: `features/map/agency-map.tsx`
- Test: `features/map/agency-map.test.tsx` (없으면 생성)

**Interfaces:**
- Consumes: `GET /api/map/agencies` (Task 11); `type Agency`, `type AgencyType` from
  `@/features/map/agency-queries` (타입만 — 순수 타입 import 유지).
- Produces: 동작·UI 변화 없음. `createClient`(브라우저)와 `fetchNearbyAgencies` import 제거.
  `loadAgencies`가 쿼리스트링을 만들어 `fetch`하고, 실패 시 기존 `t("errors.loadFailed")` /
  `t("errors.notConfigured")` 배너를 그대로 쓴다(503 → notConfigured, 그 외 → loadFailed).

- [ ] **Step 1: 실패하는 테스트 작성**

```tsx
// features/map/agency-map.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import messages from "@/messages/ko.json";

vi.mock("@/features/map/kakao-map", () => ({ KakaoMap: () => <div data-testid="kakao-map" /> }));

const { AgencyMap } = await import("./agency-map");

function renderMap() {
  return render(
    <NextIntlClientProvider locale="ko" messages={messages}>
      <AgencyMap />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "pk";
});
afterEach(() => vi.restoreAllMocks());

it("마운트 시 /api/map/agencies를 호출하고 결과를 목록에 표시한다", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ agencies: [{ id: "a", name: "청주시청", agencyType: "ADMINISTRATIVE_AGENCY", roadAddress: null, position: { lat: 36.64, lng: 127.49 }, phone: "", url: null, operatingHours: null }] }), { status: 200 }),
  );
  vi.stubGlobal("fetch", fetchMock);
  renderMap();
  await waitFor(() => expect(screen.getByRole("button", { name: "청주시청" })).toBeInTheDocument());
  expect(fetchMock.mock.calls[0][0]).toContain("/api/map/agencies?");
});

it("API가 실패하면 오류 배너를 보여준다", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 502 })));
  renderMap();
  await waitFor(() => expect(screen.getByText(messages.Map.errors.loadFailed)).toBeInTheDocument());
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run features/map/agency-map.test.tsx`
Expected: FAIL (현재는 `createClient`/`fetchNearbyAgencies` 경로, fetch 호출 안 함).

- [ ] **Step 3: 구현**

`agency-map.tsx`에서:
- `import { createClient } from "@/lib/supabase/client";` 삭제.
- `import { fetchNearbyAgencies, type Agency, type AgencyType } from "@/features/map/agency-queries";`
  → `import type { Agency, AgencyType } from "@/features/map/agency-queries";`
- `supabase` `useMemo` 블록 삭제.
- `loadAgencies` 내부를 fetch로 교체:

```tsx
      const params = new URLSearchParams();
      if (!userPosition && selectedRegion) params.set("region", selectedRegion);
      if (typeFilter !== "all") params.set("type", typeFilter);
      params.set("lat", String(near.lat));
      params.set("lng", String(near.lng));
      params.set("limit", String(NEARBY_LIMIT));

      try {
        const response = await fetch(`/api/map/agencies?${params.toString()}`);
        if (cancelled) return;
        if (!response.ok) {
          setLoadError(response.status === 503 ? t("errors.notConfigured") : t("errors.loadFailed"));
          setAgencies([]);
          setSelectedId(null);
          return;
        }
        const body = (await response.json()) as { agencies: Agency[] };
        if (cancelled) return;
        setAgencies(body.agencies);
        setSelectedId(body.agencies[0]?.id ?? null);
      } catch {
        if (cancelled) return;
        setLoadError(t("errors.loadFailed"));
        setAgencies([]);
        setSelectedId(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
```

- `if (!supabase) { ... }` 분기 삭제(env 미설정은 서버가 503으로 응답).
- `useEffect` 의존성 배열에서 `supabase` 제거, 나머지(`selectedRegion, typeFilter, userPosition,
  near.lat, near.lng`)는 유지.

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run features/map`
Expected: PASS.

- [ ] **Step 5: 브라우저 `.from()` 잔존 확인**

Run: `rg "supabase/client|\.from\(" features/map`
Expected: `agency-map.tsx`에서 매치 없음.

- [ ] **Step 6: 커밋**

```bash
git add features/map/agency-map.tsx features/map/agency-map.test.tsx
git commit -m "refactor(map): 지도 화면이 브라우저 Supabase 대신 /api/map/agencies 사용"
```

---

### Task 13: features/profile/server/target-visa.ts — 목표 비자 조회 도메인 모듈

**Files:**
- Create: `features/profile/server/target-visa.ts`
- Test: `features/profile/server/target-visa.test.ts`

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/server`; `isTargetVisaCode` from
  `@/lib/onboarding/target-visa` (유지되는 순수 가드).
- Produces: `getCurrentUserTargetVisa(): Promise<{ targetVisaCode: string | null }>`.
  - 유효한 Supabase 사용자가 없으면 `ApiRouteError(401, "AUTH_REQUIRED", ...)`.
  - 행/값 없음 → `{ targetVisaCode: null }`.
  - 조회 오류 → `ApiRouteError(502, "PROFILE_QUERY_FAILED", ...)`.
  - env 미설정 → `ApiRouteError(503, "PROFILE_NOT_CONFIGURED", ...)`.

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// features/profile/server/target-visa.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
let row: unknown = null;
let queryError: unknown = null;

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: row, error: queryError }) }) }),
    }),
  }),
}));

const { getCurrentUserTargetVisa } = await import("./target-visa");

beforeEach(() => {
  vi.clearAllMocks();
  row = null;
  queryError = null;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "pk";
  getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
});

it("저장된 목표 비자 코드를 반환한다", async () => {
  row = { target_visa_code: "E-7-4R" };
  await expect(getCurrentUserTargetVisa()).resolves.toEqual({ targetVisaCode: "E-7-4R" });
});

it("행이 없으면 null", async () => {
  await expect(getCurrentUserTargetVisa()).resolves.toEqual({ targetVisaCode: null });
});

it("유효하지 않은 코드면 null로 정규화한다", async () => {
  row = { target_visa_code: "ZZZ" };
  await expect(getCurrentUserTargetVisa()).resolves.toEqual({ targetVisaCode: null });
});

it("사용자 세션이 없으면 401 AUTH_REQUIRED", async () => {
  getUser.mockResolvedValue({ data: { user: null } });
  await expect(getCurrentUserTargetVisa()).rejects.toMatchObject({ status: 401, code: "AUTH_REQUIRED" });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run features/profile/server/target-visa.test.ts`
Expected: FAIL ("Cannot find module './target-visa'").

- [ ] **Step 3: 구현**

```ts
// features/profile/server/target-visa.ts
import "server-only";
import { ApiRouteError } from "@/lib/api/errors";
import { isTargetVisaCode } from "@/lib/onboarding/target-visa";
import { createClient } from "@/lib/supabase/server";

function hasSupabaseEnv(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

export async function getCurrentUserTargetVisa(): Promise<{ targetVisaCode: string | null }> {
  if (!hasSupabaseEnv()) {
    throw new ApiRouteError(503, "PROFILE_NOT_CONFIGURED", "프로필 저장소가 아직 연결되지 않았습니다.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new ApiRouteError(401, "AUTH_REQUIRED", "로그인이 필요합니다.");
  }

  const { data, error } = await supabase
    .from("user_visa_profile")
    .select("target_visa_code")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) {
    throw new ApiRouteError(502, "PROFILE_QUERY_FAILED", "프로필을 불러오지 못했습니다.");
  }

  const code = data?.target_visa_code;
  return { targetVisaCode: isTargetVisaCode(code) ? code : null };
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run features/profile/server/target-visa.test.ts`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add features/profile/server/target-visa.ts features/profile/server/target-visa.test.ts
git commit -m "feat(profile): 목표 비자 조회 서버 도메인 모듈(getCurrentUserTargetVisa)"
```

---

### Task 14: app/api/profile/target-visa/route.ts

**Files:**
- Create: `app/api/profile/target-visa/route.ts`
- Test: `app/api/profile/target-visa/route.test.ts`

**Interfaces:**
- Consumes: `withApiRoute` (Task 9); `getCurrentUserTargetVisa` (Task 13).
- Produces: `GET` 핸들러. 성공 시 `Response.json({ targetVisaCode }, { headers: { "Cache-Control": "no-store" } })`.
  도메인 모듈이 던지는 `ApiRouteError`는 `withApiRoute`가 처리(401/502/503).

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// app/api/profile/target-visa/route.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiRouteError } from "@/lib/api/errors";

const getCurrentUserTargetVisa = vi.fn();
vi.mock("@/features/profile/server/target-visa", () => ({
  getCurrentUserTargetVisa: (...a: unknown[]) => getCurrentUserTargetVisa(...a),
}));

const { GET } = await import("./route");
beforeEach(() => vi.clearAllMocks());

it("no-store로 목표 비자를 반환한다", async () => {
  getCurrentUserTargetVisa.mockResolvedValue({ targetVisaCode: "D-2" });
  const res = await GET(new Request("https://x/api/profile/target-visa"));
  expect(res.status).toBe(200);
  expect(res.headers.get("Cache-Control")).toBe("no-store");
  expect(await res.json()).toEqual({ targetVisaCode: "D-2" });
});

it("세션 없음은 공통 오류 계약으로 401", async () => {
  getCurrentUserTargetVisa.mockRejectedValue(new ApiRouteError(401, "AUTH_REQUIRED", "로그인이 필요합니다."));
  const res = await GET(new Request("https://x/api/profile/target-visa"));
  expect(res.status).toBe(401);
  const body = await res.json();
  expect(body.error.code).toBe("AUTH_REQUIRED");
  expect(typeof body.error.requestId).toBe("string");
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run app/api/profile/target-visa/route.test.ts`
Expected: FAIL.

- [ ] **Step 3: 구현**

```ts
// app/api/profile/target-visa/route.ts
import { withApiRoute } from "@/lib/api/errors";
import { getCurrentUserTargetVisa } from "@/features/profile/server/target-visa";

export const GET = withApiRoute(async () => {
  const result = await getCurrentUserTargetVisa();
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
});
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run app/api/profile/target-visa/route.test.ts`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add app/api/profile/target-visa/route.ts app/api/profile/target-visa/route.test.ts
git commit -m "feat(api): GET /api/profile/target-visa 라우트 핸들러"
```

---

### Task 15: resolveStoredTargetVisaCode가 API를 쓰도록 이관

**Files:**
- Modify: `lib/onboarding/target-visa.ts`
- Test: `tests/target-visa-profile.test.ts`

**Interfaces:**
- Consumes: `GET /api/profile/target-visa` (Task 14).
- Produces: `resolveStoredTargetVisaCode(): Promise<string | null>` — 시그니처 불변.
  브라우저 `createClient()`/`.from()` 제거. `fetch("/api/profile/target-visa")` 후
  200이면 `body.targetVisaCode`(가드 통과 시), 그 외(401 포함)면 `null`. 네트워크 예외도 `null`.
  `isTargetVisaCode`는 그대로 export 유지. 호출부(`features/home/use-selected-visa.ts`,
  `features/calendar/use-target-visa.ts`)는 수정 불필요.

- [ ] **Step 1: 테스트 갱신 (실패 상태로)**

`tests/target-visa-profile.test.ts`의 `resolveStoredTargetVisaCode` describe 블록에서
supabase client mock을 걷어내고 `fetch`를 stub한다. `isTargetVisaCode` describe는 그대로.

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isTargetVisaCode, resolveStoredTargetVisaCode } from "@/lib/onboarding/target-visa";

describe("resolveStoredTargetVisaCode", () => {
  afterEach(() => vi.restoreAllMocks());

  it("API가 유효한 코드를 주면 그 값을 반환한다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ targetVisaCode: "E-7-4R" }), { status: 200 })));
    await expect(resolveStoredTargetVisaCode()).resolves.toBe("E-7-4R");
  });

  it("API가 null을 주면 null", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ targetVisaCode: null }), { status: 200 })));
    await expect(resolveStoredTargetVisaCode()).resolves.toBeNull();
  });

  it("401이면 null", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 401 })));
    await expect(resolveStoredTargetVisaCode()).resolves.toBeNull();
  });

  it("유효하지 않은 코드면 null", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ targetVisaCode: "ZZZ" }), { status: 200 })));
    await expect(resolveStoredTargetVisaCode()).resolves.toBeNull();
  });

  it("네트워크 예외면 null", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(resolveStoredTargetVisaCode()).resolves.toBeNull();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run tests/target-visa-profile.test.ts`
Expected: FAIL.

- [ ] **Step 3: 구현**

```ts
// lib/onboarding/target-visa.ts
const TARGET_VISA_CODES = new Set(["F-2-R", "E-7-4R", "F-4-R", "D-2"]);

export function isTargetVisaCode(value: unknown): value is string {
  return typeof value === "string" && TARGET_VISA_CODES.has(value);
}

/**
 * 현재 사용자의 목표 비자를 공용 API에서 조회한다.
 * 브라우저에서 Supabase에 직접 접속하지 않는다(스펙 §3). 세션 없음(401)·오류·유효하지 않은 값은
 * 모두 null로 정규화해, 호출부는 "목표 비자 미설정"으로 동일하게 처리한다.
 */
export async function resolveStoredTargetVisaCode(): Promise<string | null> {
  try {
    const response = await fetch("/api/profile/target-visa");
    if (!response.ok) return null;
    const body = (await response.json()) as { targetVisaCode?: unknown };
    return isTargetVisaCode(body.targetVisaCode) ? body.targetVisaCode : null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: 통과 확인 + 회귀**

Run: `npx vitest run tests/target-visa-profile.test.ts features/calendar features/home`
Expected: PASS.

- [ ] **Step 5: 브라우저 `.from()` 잔존 확인**

Run: `rg "supabase/client|\.from\(" lib/onboarding features/home/use-selected-visa.ts features/calendar/use-target-visa.ts`
Expected: 매치 없음.

- [ ] **Step 6: 커밋**

```bash
git add lib/onboarding/target-visa.ts tests/target-visa-profile.test.ts
git commit -m "refactor(profile): resolveStoredTargetVisaCode가 /api/profile/target-visa 사용"
```

---

### Task 16: Phase 2 검증과 PR

- [ ] **Step 1: 브라우저 애플리케이션 데이터 `.from()` 전수 확인**

Run: `rg -n "from\\(\"|from\\('" --glob '!**/*.test.*' features lib app | rg -v "supabase/server|createServerClient|Array.from|form"`
확인: 남는 매치는 서버 모듈(`server-only`)이거나 인증 세션 용도(`ensureAnonymousSession`)뿐이어야 한다.
`agency-map.tsx`, `lib/onboarding/target-visa.ts`에는 애플리케이션 데이터 `.from()`이 없어야 한다.

- [ ] **Step 2: 전체 검증**

Run: `npm run lint && npm run typecheck && npm test && npm run build`
Expected: 모두 PASS.

- [ ] **Step 3: PR 생성 (머지하지 않음)**

```bash
git push -u origin <phase2-branch>
gh pr create --base main --title "feat(api): 공용 BFF — 지도·목표비자 (Phase 2)" --body "<변경 요약 / 검증 / 이번 범위에서 제외한 3개 엔드포인트 근거 / 수동 검증>"
```

- [ ] **Step 4: 수동 검증 체크리스트 (PR 본문)**
  - 지도: 지역 선택·유형 필터·현재 위치 사용 시 목록/마커/상세가 이전과 동일
  - 지도: env 미설정 환경에서 `errors.notConfigured` 배너
  - 캘린더·홈: 목표 비자 기반 화면이 이전과 동일하게 뜸(네트워크 탭에 `/api/profile/target-visa` 호출)
  - 콘솔/서버 로그에 `[api]` + `requestId` 기록 확인

---

## 자체 검토 (계획 작성자 수행)

**1. Spec 커버리지**

| Spec 항목 | 구현 위치 |
| --- | --- |
| §1 Next.js BFF, Route Handler = HTTP 경계, 도메인 모듈 분리 | Task 9~14 (`lib/api/errors.ts`, `features/*/server/*`, `app/api/*`) |
| §1 `/v1` 미도입 | 전역 제약, 라우트 경로 |
| §2 공용 API 계약 표 | `/api/map/agencies`(Task 11), `/api/profile/target-visa`(Task 14). 나머지 3개 = "이번 범위에서 제외" 근거 명시 |
| §2 `ApiError` 형태 | Task 9 |
| §2 기존 쓰기 경계 유지 | 이 계획은 `features/onboarding/actions.ts`, `/api/ocr/*`, `/api/chat/*`를 변경하지 않음(Task 4 Step 5는 컬럼 분리만) |
| §3 브라우저는 인증 세션에만 Supabase client, 데이터 `.from()` 제거 | Task 12, Task 15, Task 16 Step 1 검증 |
| §3 마스터 데이터 읽기 전용 | 전역 제약. 새 쿼리는 select만 |
| §4 비밀번호는 auth.users에만 | Task 1 주석, Task 4 (profiles에 password 없음) |
| §4 아이디→가상 이메일, 입력 규칙 | Task 3 |
| §4 `profiles` username/name + 대소문자 무시 유니크 | Task 1, Task 2 |
| §4 signUpWithId/signInWithId + 서버 재검증 | Task 4 |
| §4 로그인 오류 문구 통일 | Task 4 (`CREDENTIALS_ERROR`) |
| §4 Confirm Email 비활성 / Anonymous 유지 | 사전 조건 섹션 |
| §5 useAuthState 실제 구현, 비익명=authenticated | Task 5 |
| §5 온보딩 Google 버튼 → 폼, 게스트 경로 유지 | Task 7 |
| §5 이동 규칙(가입→온보딩0, 로그인→홈+가드) | Task 7 Interfaces |
| §5 익명 데이터 이전 안 함 | 전역 제약 |
| §6 OpenAI 키 서버 전용·교체 | 사전 조건 섹션 (코드 변경 없음) |
| §오류처리·관측 requestId 로깅 | Task 9 |
| §오류처리 사용자 데이터 API 401 | Task 13/14 |
| §오류처리 메모리 rate limit 미변경 | 이 계획 범위 밖(명시) |
| §검증 항목 | Task 8, Task 16 |

**2. 플레이스홀더 스캔:** 각 코드 Step에 실제 코드/테스트 포함. "적절한 오류 처리" 류 문구 없음. ✅

**3. 타입 일관성:** `AuthActionState`(Task 4) ↔ `auth-form.tsx`(Task 6) 동일. `ApiRouteError`
생성자 `(status, code, message)` — Task 9 정의와 Task 10/13/14 사용 일치. `Agency`/`AgencyType`는
`agency-queries.ts` 원본 타입을 Task 10·12에서 그대로 참조. `getNearbyAgencies`(단수 아님, Task 10)
= Task 11 import 이름 일치. `getCurrentUserTargetVisa`(Task 13) = Task 14 import 일치.

**미해결/실행 중 판단할 점:**
- Task 5 테스트의 `screen.getByRole("status"...)` 라인은 실제로 뜨면 단순화(최종 텍스트 단언만).
- Task 10 테스트의 Supabase 쿼리빌더 mock은 `.or`/`.eq` 체이닝 + thenable 형태. 실제 실행 시
  `@supabase/postgrest-js`의 반환이 Promise라 `await request` 가 동작함을 확인(기존
  `quota-data.ts`가 같은 패턴).
- Task 12에서 `near`가 매 렌더 새 객체라 `useEffect` deps는 기존대로 `near.lat, near.lng` 유지.
