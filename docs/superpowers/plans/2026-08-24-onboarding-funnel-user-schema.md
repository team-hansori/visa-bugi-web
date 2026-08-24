# 온보딩 퍼널 + User 스키마 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 온보딩 1·2단계(공통 질문 + 목표비자별 1~2문항)를 URL 기반 퍼널로 구현하고, 답변을 Supabase `profiles`/`user_visa_profile`에 저장한다. Kakao Local API 주소 자동완성을 포함한다.

**Architecture:** 스텝 상태는 URL searchParam(`?step=`)에 두어 뒤로가기·새로고침·퍼널 이탈률 분석이 동작하게 한다(토스 퍼널 패턴, 라이브러리 미도입). 폼 값은 컨테이너 1개의 `useState`가 보유하고 `sessionStorage`에 백업하며, 다음 스텝 이동 전 `validateCurrentStep()`이 zod 스키마 조각으로 **현재 스텝 필드만** 검증한다. 동일한 zod 스키마를 Server Action에서 재사용해 클라이언트 검증 우회를 차단한다. 주소 검색만 Route Handler로 Kakao API를 프록시하고(REST 키 은닉·GET 캐시), 저장은 Server Action으로 처리한다. DB는 EAV가 아닌 하이브리드(typed column + `visa_details` JSONB).

**Tech Stack:** Next.js 16.3.1 (App Router), React 19.2.8, TypeScript 5, next-intl 4.13.7, @supabase/ssr 0.12.4, zod, Vitest + @testing-library/react, Tailwind CSS 4. (`react-hook-form`은 도입하지 않는다 — Self-Review의 "알려진 편차" 참조)

**Spec:** `docs/superpowers/specs/2026-08-24-onboarding-user-schema-design.md`

## Scope

**이 계획에 포함:** 스펙 §1~§5, §7~§9, §11 — 온보딩 1·2단계, DB 스키마, 주소 검색, 저장, 테스트 인프라.

**이 계획에서 제외 (후속 계획):** 스펙 §2.4 3단계 "내 정보 입력하기" 화면, §6 민감정보 처리(E-7-4R 감점·F-4-R 결격사유), 요건 충족률(%) 계산. 이유: 독립적으로 배포 가능한 별도 서브시스템이고, 민감정보 처리는 자체 설계·법무 검토 사이클이 필요하다. **온보딩 1·2단계에서 수집하는 필드에는 민감정보가 하나도 없다** — 감점·결격 항목은 전부 3단계이므로 이 분리는 안전하다. 단, DB 스키마(Task 5)는 3단계 필드까지 수용하도록 미리 설계한다.

## Global Constraints

- 지원 locale은 정확히 6개, 이 순서로: `ko`(기본), `zh`, `vi`, `uz`, `ne`, `km`. (`i18n/routing.ts` 기존 정의를 따른다)
- 스코프 비자는 정확히 4개: `F-2-R`, `E-7-4R`, `F-4-R`, `D-2`.
- 인구감소지역은 정확히 6개: 제천시, 보은군, 옥천군, 영동군, 괴산군, 단양군. (리플렛 p.3)
- 브라우저에 노출 가능한 Supabase 환경변수는 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 뿐이다. legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY`는 쓰지 않는다. service role key는 이 계획의 어떤 코드에도 등장하지 않는다. (`.claude/rules/supabase.md`)
- `KAKAO_REST_API_KEY`는 **서버 전용**이다. `NEXT_PUBLIC_` 접두사를 붙이지 않는다.
- 환경변수가 없어도 정적 화면과 `npm run build`가 성공해야 한다. (AGENTS.md) — Kakao 키 부재 시 Route Handler는 빈 결과 + 안내를 반환하고 throw하지 않는다.
- 기본은 Server Component. 브라우저 상태·이벤트가 필요한 파일에만 `"use client"`. (`.claude/rules/frontend.md`)
- 사용자에게 보이는 버튼·링크는 실제 동작을 연결하거나 `준비 중`을 명확히 표시한다. (`.claude/rules/frontend.md`)
- 비자 판정 성격의 문구에는 참고용 결과임과 공식 확인 경로를 유지한다. (`.claude/rules/frontend.md`)
- `visa-data`의 원본 PDF·추출 CSV를 이 레포로 복사하지 않는다. (`.claude/rules/data-boundary.md`)
- 경로에 대괄호가 포함되면(`app/[locale]/...`) 셸이 glob으로 해석할 수 있으므로 항상 큰따옴표로 감싼다.
- 새 의존성 설치(`npm install`)는 네트워크가 필요하다. 샌드박스에서 실패하면 `dangerouslyDisableSandbox: true`로 재시도한다.
- 각 태스크 종료 시 `npm run lint`, `npm run typecheck`, `npm run test`를 실행한다. 최종 태스크에서는 `npm run build`까지 실행한다. (AGENTS.md)
- 커밋 메시지는 한국어 Conventional Commits(`feat:`, `fix:`, `test:`, `chore:`)를 따른다. (기존 커밋 이력 관례)

---

## File Structure

| 파일 | 상태 | 책임 |
|---|---|---|
| `vitest.config.ts` | 생성 | Vitest 설정 (jsdom, `@/` alias) |
| `vitest.setup.ts` | 생성 | jest-dom matcher 등록 |
| `features/onboarding/constants.ts` | 생성 | 비자 코드·지역·선택지 상수 (단일 진실 공급원) |
| `features/onboarding/visa-recommendation.ts` | 생성 | `현재 체류자격 → 추천 목표비자` 순수 함수 |
| `features/onboarding/schema.ts` | 생성 | 스텝별 zod 스키마 + 제출 스키마 (클라이언트·서버 공유) |
| `features/onboarding/steps.ts` | 생성 | 스텝 시퀀스·분기 로직 (순수 함수) |
| `features/onboarding/actions.ts` | 생성 | Server Action: 인증 확인 + zod 재검증 + upsert |
| `features/onboarding/onboarding-form.tsx` | **재작성** | 퍼널 컨테이너 (URL 스텝 + 값 보관 + 스텝별 검증) |
| `features/onboarding/steps/choice-step.tsx` | 생성 | 단일 선택 스텝 UI (버튼 그리드) |
| `features/onboarding/steps/birthdate-step.tsx` | 생성 | 생년월일 입력 스텝 UI |
| `features/onboarding/steps/korean-level-step.tsx` | 생성 | 한국어능력 스텝 UI (유형 + 급수) |
| `features/onboarding/steps/address-step.tsx` | 생성 | 주소 스텝 UI (검색 + 인구감소지역 안내) |
| `features/onboarding/steps/d2-detail-step.tsx` | 생성 | D-2 전용 4필드 스텝 UI |
| `components/address/address-search-input.tsx` | 생성 | 주소 자동완성 combobox (debounce·키보드·aria-live) |
| `lib/address/normalize.ts` | 생성 | Kakao 응답 → 앱 도메인 정규화 (순수 함수) |
| `app/api/address/search/route.ts` | 생성 | Kakao Local API 프록시 (GET) |
| `supabase/migrations/20260824000000_onboarding_user_schema.sql` | 생성 | `profiles`, `user_visa_profile`, RLS 정책 |
| `lib/supabase/database.types.ts` | 생성 | DB 행 타입 (수기 정의) |
| `messages/*.json` | 수정 | 온보딩 문구 6개 언어 |
| `.env.example` | 수정 | `KAKAO_REST_API_KEY` 추가 |
| `package.json` | 수정 | 의존성 + `test` 스크립트 |
| `.github/workflows/ci.yml` | 수정 | 테스트 단계 추가 |

---

## Task 1: Vitest 테스트 인프라 구축

이 레포에는 테스트 러너가 없다. 이후 모든 태스크가 TDD로 진행되므로 먼저 구축한다.

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `lib/address/normalize.test.ts` (스모크 테스트 겸 Task 6 준비)
- Create: `lib/address/normalize.ts`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: 없음
- Produces: `npm run test` 명령, `normalizeSigungu(regionDepth2: string): string`

- [ ] **Step 1: 의존성 설치**

```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom
```

샌드박스에서 네트워크 오류가 나면 `dangerouslyDisableSandbox: true`로 재시도한다.

- [ ] **Step 2: Vitest 설정 파일 작성**

`vitest.config.ts`:

```ts
import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules/**", ".next/**"],
  },
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "./") },
  },
});
```

`vitest.setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

> `globals: true`를 쓰지 않는다. 테스트 파일마다 `import { describe, it, expect } from "vitest"`로 명시 import 하면 `tsconfig.json`의 `types` 배열을 건드릴 필요가 없다.

- [ ] **Step 3: package.json에 test 스크립트 추가**

`scripts`에 두 줄을 추가한다:

```json
    "test": "vitest run",
    "test:watch": "vitest"
```

- [ ] **Step 4: 실패하는 테스트 작성**

`lib/address/normalize.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { normalizeSigungu } from "./normalize";

describe("normalizeSigungu", () => {
  it("시 단위 이름은 그대로 반환한다", () => {
    expect(normalizeSigungu("제천시")).toBe("제천시");
  });

  it("군 단위 이름은 그대로 반환한다", () => {
    expect(normalizeSigungu("괴산군")).toBe("괴산군");
  });

  it("자치구가 붙은 이름은 시 단위까지만 남긴다", () => {
    expect(normalizeSigungu("청주시 흥덕구")).toBe("청주시");
  });

  it("빈 문자열은 빈 문자열을 반환한다", () => {
    expect(normalizeSigungu("")).toBe("");
  });

  it("앞뒤 공백을 제거한다", () => {
    expect(normalizeSigungu("  단양군  ")).toBe("단양군");
  });
});
```

- [ ] **Step 5: 테스트 실패 확인**

Run: `npm run test`
Expected: FAIL — `Failed to resolve import "./normalize"`

- [ ] **Step 6: 최소 구현 작성**

`lib/address/normalize.ts`:

```ts
/**
 * Kakao Local API의 `region_2depth_name`을 앱에서 쓰는 시·군 단위로 정규화한다.
 * 광역시·특별시의 자치구까지 포함된 경우("청주시 흥덕구") 시 단위만 남긴다.
 */
export function normalizeSigungu(regionDepth2: string): string {
  const trimmed = regionDepth2.trim();
  if (trimmed === "") return "";
  return trimmed.split(/\s+/)[0];
}
```

- [ ] **Step 7: 테스트 통과 확인**

Run: `npm run test`
Expected: PASS — 5 tests passed

- [ ] **Step 8: CI에 테스트 단계 추가**

`.github/workflows/ci.yml`의 `타입 검사` 단계와 `빌드` 단계 사이에 삽입한다:

```yaml
      - name: 테스트
        run: npm run test
```

- [ ] **Step 9: lint·typecheck 확인**

Run: `npm run lint && npm run typecheck`
Expected: 오류 없음

- [ ] **Step 10: 커밋**

```bash
git add package.json package-lock.json vitest.config.ts vitest.setup.ts lib/address/normalize.ts lib/address/normalize.test.ts .github/workflows/ci.yml
git commit -m "chore: Vitest 테스트 인프라 구축 및 CI 연결"
```

---

## Task 2: 비자 상수 + 추천 매핑 순수 함수

**Files:**
- Create: `features/onboarding/constants.ts`
- Create: `features/onboarding/visa-recommendation.ts`
- Test: `features/onboarding/visa-recommendation.test.ts`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `TARGET_VISA_CODES: readonly ["F-2-R", "E-7-4R", "F-4-R", "D-2"]`
  - `type TargetVisaCode = "F-2-R" | "E-7-4R" | "F-4-R" | "D-2"`
  - `CURRENT_VISA_OPTIONS: readonly string[]`
  - `type CurrentVisaCode`
  - `POPULATION_DECLINE_REGIONS: readonly string[]`
  - `isPopulationDeclineRegion(sigungu: string): boolean`
  - `recommendTargetVisas(currentVisaCode: CurrentVisaCode): TargetVisaCode[]`

- [ ] **Step 1: 상수 파일 작성**

`features/onboarding/constants.ts`:

```ts
/** 이번 스코프의 목표 비자 4종. 값은 visa-data의 `visa_requirements.csv` visa_code와 일치한다. */
export const TARGET_VISA_CODES = ["F-2-R", "E-7-4R", "F-4-R", "D-2"] as const;
export type TargetVisaCode = (typeof TARGET_VISA_CODES)[number];

/**
 * 온보딩에서 고를 수 있는 현재 체류자격.
 * 추천 분기(리플렛 p.3, p.11)에 실제로 영향을 주는 코드만 선택지로 둔다.
 */
export const CURRENT_VISA_OPTIONS = [
  "D-2",
  "D-10",
  "E-9",
  "E-10",
  "H-2",
  "F-4",
  "OTHER",
  "UNKNOWN",
] as const;
export type CurrentVisaCode = (typeof CURRENT_VISA_OPTIONS)[number];

/**
 * F-2-R 자격변경 제한 대상 (리플렛 p.3).
 * 이 자격 보유자에게는 F-2-R을 추천하지 않는다.
 */
export const F2R_RESTRICTED_VISA_CODES = [
  "D-3",
  "D-4",
  "E-6-2",
  "E-8",
  "E-9",
  "E-10",
  "G-1",
  "H-1",
] as const;

/** 지역특화형 비자 사업 대상 인구감소지역 6곳 (리플렛 p.3). */
export const POPULATION_DECLINE_REGIONS = [
  "제천시",
  "보은군",
  "옥천군",
  "영동군",
  "괴산군",
  "단양군",
] as const;

export function isPopulationDeclineRegion(sigungu: string): boolean {
  return (POPULATION_DECLINE_REGIONS as readonly string[]).includes(sigungu);
}

/** 지역특화형 비자 3종 — 인구감소지역 거주(희망)가 공통 사업대상 조건이다. */
export const REGION_SPECIALIZED_VISA_CODES = ["F-2-R", "E-7-4R", "F-4-R"] as const;
```

- [ ] **Step 2: 실패하는 테스트 작성**

`features/onboarding/visa-recommendation.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { CURRENT_VISA_OPTIONS, TARGET_VISA_CODES } from "./constants";
import { recommendTargetVisas } from "./visa-recommendation";

describe("recommendTargetVisas", () => {
  it("D-2 유학생에게는 광역형 D-2와 졸업 후 F-2-R을 추천한다", () => {
    expect(recommendTargetVisas("D-2")).toEqual(["D-2", "F-2-R"]);
  });

  it("D-10 구직자에게는 F-2-R을 추천한다", () => {
    expect(recommendTargetVisas("D-10")).toEqual(["F-2-R"]);
  });

  it.each(["E-9", "E-10", "H-2"] as const)(
    "%s 보유자에게는 E-7-4R을 추천한다",
    (code) => {
      expect(recommendTargetVisas(code)).toEqual(["E-7-4R"]);
    },
  );

  it("외국국적동포(F-4)에게는 F-4-R을 추천한다", () => {
    expect(recommendTargetVisas("F-4")).toEqual(["F-4-R"]);
  });

  it("체류자격을 모르면 4개 비자를 모두 노출한다", () => {
    expect(recommendTargetVisas("UNKNOWN")).toEqual([...TARGET_VISA_CODES]);
  });

  it("기타 체류자격도 4개 비자를 모두 노출한다", () => {
    expect(recommendTargetVisas("OTHER")).toEqual([...TARGET_VISA_CODES]);
  });

  it("추천 결과는 항상 목표 비자 4종 안에서만 나온다", () => {
    for (const code of CURRENT_VISA_OPTIONS) {
      for (const recommended of recommendTargetVisas(code)) {
        expect(TARGET_VISA_CODES).toContain(recommended);
      }
    }
  });

  it("추천 결과는 비어 있지 않다", () => {
    for (const code of CURRENT_VISA_OPTIONS) {
      expect(recommendTargetVisas(code).length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npm run test`
Expected: FAIL — `Failed to resolve import "./visa-recommendation"`

- [ ] **Step 4: 최소 구현 작성**

`features/onboarding/visa-recommendation.ts`:

```ts
import {
  type CurrentVisaCode,
  TARGET_VISA_CODES,
  type TargetVisaCode,
} from "./constants";

/**
 * 현재 체류자격으로 목표 비자 후보를 좁힌다.
 *
 * 근거 (2026 외국인정책 지원사업 리플렛):
 * - p.11 채용장려금: D-2 유학생·D-10 구직자 → F-2-R 전환 경로
 * - p.7 광역형 비자: 도내 대학 재학·입학 유학생(D-2) 대상 특례
 * - p.3 E-7-4R 대상자: 최근 10년간 E-9·E-10·H-2로 2년 이상 체류
 * - p.3 F-4-R 대상자: 국내·외 외국국적동포
 *
 * 판정이 아니라 화면에 보여줄 후보를 좁히는 용도다. 최종 자격 여부는
 * 관할 출입국·외국인관서가 판단한다.
 */
export function recommendTargetVisas(
  currentVisaCode: CurrentVisaCode,
): TargetVisaCode[] {
  switch (currentVisaCode) {
    // 재학 중에는 광역형 D-2 특례, 졸업 후에는 F-2-R 전환이 가능하다.
    case "D-2":
      return ["D-2", "F-2-R"];
    case "D-10":
      return ["F-2-R"];
    case "E-9":
    case "E-10":
    case "H-2":
      return ["E-7-4R"];
    case "F-4":
      return ["F-4-R"];
    default:
      return [...TARGET_VISA_CODES];
  }
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm run test`
Expected: PASS — 모든 테스트 통과 (`it.each` 3건 포함)

- [ ] **Step 6: lint·typecheck 확인**

Run: `npm run lint && npm run typecheck`
Expected: 오류 없음

- [ ] **Step 7: 커밋**

```bash
git add features/onboarding/constants.ts features/onboarding/visa-recommendation.ts features/onboarding/visa-recommendation.test.ts
git commit -m "feat: 비자 상수와 현재 체류자격 기반 목표비자 추천 함수 추가"
```

---

## Task 3: zod 스키마 (스텝별 + 제출)

클라이언트 스텝 검증과 Server Action 재검증이 **같은 스키마**를 쓴다.

**Files:**
- Create: `features/onboarding/schema.ts`
- Test: `features/onboarding/schema.test.ts`

**Interfaces:**
- Consumes: `constants.ts`의 `TARGET_VISA_CODES`, `CURRENT_VISA_OPTIONS`
- Produces:
  - `commonAnswersSchema`, `visaDetailSchema`, `onboardingSubmissionSchema`
  - `type OnboardingSubmission = z.infer<typeof onboardingSubmissionSchema>`
  - `type OnboardingFormValues` (폼 전체 값, 부분 입력 허용)
  - `STEP_FIELD_MAP: Record<StepId, (keyof OnboardingFormValues)[]>`

- [ ] **Step 1: 의존성 설치**

```bash
npm install zod
```

> 스펙 §8은 `react-hook-form` + `@hookform/resolvers` 조합을 지정했지만 이 계획에서는 설치하지 않는다. 스텝당 입력 필드가 최대 4개(D-2)뿐이라 RHF의 폼 상태 관리 이점이 없고, 미사용 의존성을 남기지 않기 위함이다. 스텝별 검증은 zod 스키마 조각을 직접 호출해 구현한다(Task 10의 `validateCurrentStep()`). 필드가 10개 이상인 3단계 "내 정보 입력하기"를 만들 때 RHF 도입을 재검토한다.

- [ ] **Step 2: 실패하는 테스트 작성**

`features/onboarding/schema.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { koreanLevelPairSchema, onboardingSubmissionSchema } from "./schema";

const validBase = {
  locale: "ko",
  gender: "unspecified",
  birthdate: "1998-04-12",
  nationality: "VN",
  currentVisaCode: "E-9",
  addressRoad: "충북 제천시 내토로 295",
  addressJibun: "충북 제천시 청전동 111",
  regionSigungu: "제천시",
  lat: 37.1326,
  lng: 128.1909,
  koreanLevelType: "TOPIK",
  koreanLevelValue: 3,
} as const;

describe("onboardingSubmissionSchema", () => {
  it("E-7-4R 제출값을 통과시킨다", () => {
    const result = onboardingSubmissionSchema.safeParse({
      ...validBase,
      targetVisaCode: "E-7-4R",
      e9E10H2ResidenceYears: 3,
    });
    expect(result.success).toBe(true);
  });

  it("F-4-R 제출값을 통과시킨다", () => {
    const result = onboardingSubmissionSchema.safeParse({
      ...validBase,
      targetVisaCode: "F-4-R",
      migrationType: "EXISTING_RESIDENT",
    });
    expect(result.success).toBe(true);
  });

  it("F-2-R 제출값을 통과시킨다", () => {
    const result = onboardingSubmissionSchema.safeParse({
      ...validBase,
      targetVisaCode: "F-2-R",
      educationLevel: "ASSOCIATE_OR_ABOVE",
    });
    expect(result.success).toBe(true);
  });

  it("D-2 제출값을 통과시킨다", () => {
    const result = onboardingSubmissionSchema.safeParse({
      ...validBase,
      targetVisaCode: "D-2",
      universityName: "충북대학교",
      departmentName: "융합소프트웨어학과",
      academicStatus: "BACHELOR_3_4",
      programStartDate: "2024-03-02",
    });
    expect(result.success).toBe(true);
  });

  it("목표비자와 맞지 않는 상세 필드는 거부한다", () => {
    const result = onboardingSubmissionSchema.safeParse({
      ...validBase,
      targetVisaCode: "F-4-R",
      e9E10H2ResidenceYears: 3,
    });
    expect(result.success).toBe(false);
  });

  it("한국어능력이 NONE이면 급수는 null이어야 한다", () => {
    const result = onboardingSubmissionSchema.safeParse({
      ...validBase,
      koreanLevelType: "NONE",
      koreanLevelValue: 3,
      targetVisaCode: "E-7-4R",
      e9E10H2ResidenceYears: 3,
    });
    expect(result.success).toBe(false);
  });

  it("한국어능력이 TOPIK이면 급수가 있어야 한다", () => {
    const result = onboardingSubmissionSchema.safeParse({
      ...validBase,
      koreanLevelType: "TOPIK",
      koreanLevelValue: null,
      targetVisaCode: "E-7-4R",
      e9E10H2ResidenceYears: 3,
    });
    expect(result.success).toBe(false);
  });

  it("미래 생년월일은 거부한다", () => {
    const result = onboardingSubmissionSchema.safeParse({
      ...validBase,
      birthdate: "2999-01-01",
      targetVisaCode: "E-7-4R",
      e9E10H2ResidenceYears: 3,
    });
    expect(result.success).toBe(false);
  });

  it("달력에 없는 날짜는 거부한다", () => {
    const result = onboardingSubmissionSchema.safeParse({
      ...validBase,
      birthdate: "1998-02-30",
      targetVisaCode: "E-7-4R",
      e9E10H2ResidenceYears: 3,
    });
    expect(result.success).toBe(false);
  });

  it("지원하지 않는 locale은 거부한다", () => {
    const result = onboardingSubmissionSchema.safeParse({
      ...validBase,
      locale: "ja",
      targetVisaCode: "E-7-4R",
      e9E10H2ResidenceYears: 3,
    });
    expect(result.success).toBe(false);
  });
});

describe("koreanLevelPairSchema는 제출 스키마와 같은 규칙을 쓴다", () => {
  const cases = [
    { koreanLevelType: "NONE", koreanLevelValue: null, valid: true },
    { koreanLevelType: "NONE", koreanLevelValue: 3, valid: false },
    { koreanLevelType: "TOPIK", koreanLevelValue: 3, valid: true },
    { koreanLevelType: "TOPIK", koreanLevelValue: null, valid: false },
    { koreanLevelType: "KIIP", koreanLevelValue: 2, valid: true },
  ] as const;

  it.each(cases)(
    "$koreanLevelType / $koreanLevelValue → $valid",
    ({ koreanLevelType, koreanLevelValue, valid }) => {
      const stepResult = koreanLevelPairSchema.safeParse({
        koreanLevelType,
        koreanLevelValue,
      });
      const submissionResult = onboardingSubmissionSchema.safeParse({
        ...validBase,
        koreanLevelType,
        koreanLevelValue,
        targetVisaCode: "E-7-4R",
        e9E10H2ResidenceYears: 3,
      });
      expect(stepResult.success).toBe(valid);
      // 스텝 검증과 제출 검증이 같은 판단을 해야 한다.
      expect(stepResult.success).toBe(submissionResult.success);
    },
  );
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npm run test`
Expected: FAIL — `Failed to resolve import "./schema"`

- [ ] **Step 4: 최소 구현 작성**

`features/onboarding/schema.ts`:

```ts
import { z } from "zod";
import { CURRENT_VISA_OPTIONS } from "./constants";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** `YYYY-MM-DD` 문자열이 실제 달력에 존재하는 날짜인지 확인한다. */
function isRealCalendarDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** 과거(또는 오늘)의 실제 날짜만 통과시킨다. 스텝별 검증에서도 재사용한다. */
export const pastDateSchema = z
  .string()
  .min(1, "날짜를 입력해 주세요.")
  .refine(isRealCalendarDate, { message: "달력에 없는 날짜입니다." })
  .refine((value) => new Date(`${value}T00:00:00Z`) <= new Date(), {
    message: "미래 날짜는 입력할 수 없습니다.",
  });

/** 한국어능력 유형과 급수의 조합만 따로 검증한다 (koreanLevel 스텝용). */
export const koreanLevelPairSchema = z
  .object({
    koreanLevelType: z.enum(["TOPIK", "KIIP", "NONE"]),
    koreanLevelValue: z.number().int().min(1).max(6).nullable(),
  })
  .refine(
    (value) =>
      value.koreanLevelType === "NONE"
        ? value.koreanLevelValue === null
        : value.koreanLevelValue !== null,
    {
      message: "급수를 선택해 주세요.",
      path: ["koreanLevelValue"],
    },
  );

/** 모든 목표비자에서 공통으로 수집하는 1단계 답변 (스펙 §2.1). */
export const commonAnswersSchema = z
  .object({
    locale: z.enum(["ko", "zh", "vi", "uz", "ne", "km"]),
    gender: z.enum(["male", "female", "unspecified"]),
    birthdate: pastDateSchema,
    nationality: z
      .string()
      .regex(/^[A-Z]{2}$/, "국가 코드는 대문자 2자리입니다."),
    currentVisaCode: z.enum(CURRENT_VISA_OPTIONS),
    addressRoad: z.string().min(1, "주소를 선택해 주세요."),
    addressJibun: z.string().min(1),
    regionSigungu: z.string().min(1),
    lat: z.number().min(33).max(39),
    lng: z.number().min(124).max(132),
    koreanLevelType: z.enum(["TOPIK", "KIIP", "NONE"]),
    koreanLevelValue: z.number().int().min(1).max(6).nullable(),
  })
  .refine(
    (value) =>
      value.koreanLevelType === "NONE"
        ? value.koreanLevelValue === null
        : value.koreanLevelValue !== null,
    {
      message: "한국어능력 유형과 급수가 맞지 않습니다.",
      path: ["koreanLevelValue"],
    },
  );

/** 목표비자별 2단계 답변 (스펙 §2.3). targetVisaCode로 판별한다. */
export const visaDetailSchema = z.discriminatedUnion("targetVisaCode", [
  z.object({
    targetVisaCode: z.literal("F-2-R"),
    educationLevel: z.enum(["ASSOCIATE_OR_ABOVE", "BELOW_ASSOCIATE"]),
  }),
  z.object({
    targetVisaCode: z.literal("E-7-4R"),
    e9E10H2ResidenceYears: z.number().int().min(0).max(10),
  }),
  z.object({
    targetVisaCode: z.literal("F-4-R"),
    migrationType: z.enum([
      "EXISTING_RESIDENT",
      "DOMESTIC_TRANSFER",
      "OVERSEAS_TRANSFER",
    ]),
  }),
  z.object({
    targetVisaCode: z.literal("D-2"),
    universityName: z.string().min(1, "대학명을 입력해 주세요."),
    departmentName: z.string().min(1, "학과명을 입력해 주세요."),
    academicStatus: z.enum([
      "LANGUAGE_COURSE",
      "ASSOCIATE",
      "BACHELOR_1_2",
      "BACHELOR_3_4",
      "GRADUATE",
    ]),
    programStartDate: pastDateSchema,
  }),
]);

/**
 * Server Action이 받는 최종 제출 스키마.
 * `strict()`로 목표비자와 맞지 않는 상세 필드를 거부한다.
 */
export const onboardingSubmissionSchema = z.intersection(
  commonAnswersSchema,
  visaDetailSchema,
);

export type OnboardingSubmission = z.infer<typeof onboardingSubmissionSchema>;
```

> `z.intersection`은 두 스키마를 모두 만족해야 통과시킨다. `discriminatedUnion`이 목표비자에 맞지 않는 조합을 걸러내므로 "F-4-R인데 `e9E10H2ResidenceYears`를 보낸" 케이스가 실패한다.

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm run test`
Expected: PASS — 15 tests passed (제출 스키마 10건 + 한국어능력 일관성 5건)

만약 "목표비자와 맞지 않는 상세 필드는 거부한다" 테스트가 실패하면, 해당 `discriminatedUnion` 멤버에 `.strict()`를 붙여 초과 키를 거부하도록 수정한다.

- [ ] **Step 6: lint·typecheck 확인**

Run: `npm run lint && npm run typecheck`
Expected: 오류 없음

- [ ] **Step 7: 커밋**

```bash
git add package.json package-lock.json features/onboarding/schema.ts features/onboarding/schema.test.ts
git commit -m "feat: 온보딩 zod 스키마 추가 (스텝 검증·서버 재검증 공용)"
```

> `package.json`에는 `zod`만 추가되어야 한다. `react-hook-form`이 들어갔다면 `npm uninstall react-hook-form @hookform/resolvers`로 되돌린다.

---

## Task 4: 스텝 시퀀스 분기 로직

**Files:**
- Create: `features/onboarding/steps.ts`
- Test: `features/onboarding/steps.test.ts`

**Interfaces:**
- Consumes: `constants.ts`의 `TargetVisaCode`
- Produces:
  - `type StepId`
  - `COMMON_STEP_IDS: readonly StepId[]`
  - `getStepSequence(targetVisaCode: TargetVisaCode | null): StepId[]`
  - `STEP_FIELDS: Record<StepId, string[]>`
  - `getStepIndex(sequence: StepId[], step: string): number`

- [ ] **Step 1: 실패하는 테스트 작성**

`features/onboarding/steps.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { TARGET_VISA_CODES } from "./constants";
import { COMMON_STEP_IDS, getStepIndex, getStepSequence, STEP_FIELDS } from "./steps";

describe("getStepSequence", () => {
  it("목표비자를 아직 고르지 않으면 공통 스텝까지만 반환한다", () => {
    expect(getStepSequence(null)).toEqual([...COMMON_STEP_IDS]);
  });

  it("E-7-4R을 고르면 공통 스텝 뒤에 전용 스텝이 붙는다", () => {
    const sequence = getStepSequence("E-7-4R");
    expect(sequence.slice(0, COMMON_STEP_IDS.length)).toEqual([...COMMON_STEP_IDS]);
    expect(sequence.at(-1)).toBe("e74rDetail");
  });

  it("F-4-R을 고르면 이주 유형 스텝이 붙는다", () => {
    expect(getStepSequence("F-4-R").at(-1)).toBe("f4rDetail");
  });

  it("F-2-R을 고르면 학력 스텝이 붙는다", () => {
    expect(getStepSequence("F-2-R").at(-1)).toBe("f2rDetail");
  });

  it("D-2를 고르면 학교 정보 스텝이 붙는다", () => {
    expect(getStepSequence("D-2").at(-1)).toBe("d2Detail");
  });

  it("모든 목표비자에서 스텝이 중복 없이 나온다", () => {
    for (const code of TARGET_VISA_CODES) {
      const sequence = getStepSequence(code);
      expect(new Set(sequence).size).toBe(sequence.length);
    }
  });

  it("모든 스텝에 검증할 필드 목록이 정의되어 있다", () => {
    for (const code of TARGET_VISA_CODES) {
      for (const step of getStepSequence(code)) {
        expect(STEP_FIELDS[step]).toBeDefined();
        expect(STEP_FIELDS[step].length).toBeGreaterThan(0);
      }
    }
  });
});

describe("getStepIndex", () => {
  it("시퀀스에 있는 스텝의 위치를 반환한다", () => {
    expect(getStepIndex(["locale", "gender"], "gender")).toBe(1);
  });

  it("시퀀스에 없는 스텝은 0을 반환한다", () => {
    expect(getStepIndex(["locale", "gender"], "unknown-step")).toBe(0);
  });

  it("빈 문자열은 0을 반환한다", () => {
    expect(getStepIndex(["locale", "gender"], "")).toBe(0);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm run test`
Expected: FAIL — `Failed to resolve import "./steps"`

- [ ] **Step 3: 최소 구현 작성**

`features/onboarding/steps.ts`:

```ts
import type { TargetVisaCode } from "./constants";

export type StepId =
  | "locale"
  | "nationality"
  | "gender"
  | "birthdate"
  | "currentVisa"
  | "address"
  | "koreanLevel"
  | "targetVisa"
  | "f2rDetail"
  | "e74rDetail"
  | "f4rDetail"
  | "d2Detail";

/** 목표비자와 무관하게 모두가 거치는 1단계 스텝 (스펙 §9-1 순서). */
export const COMMON_STEP_IDS = [
  "locale",
  "nationality",
  "gender",
  "birthdate",
  "currentVisa",
  "address",
  "koreanLevel",
  "targetVisa",
] as const satisfies readonly StepId[];

const DETAIL_STEP_BY_VISA: Record<TargetVisaCode, StepId> = {
  "F-2-R": "f2rDetail",
  "E-7-4R": "e74rDetail",
  "F-4-R": "f4rDetail",
  "D-2": "d2Detail",
};

/** 각 스텝이 담당하는 폼 필드. 스텝별 검증 범위를 한곳에 모아 문서화한다. */
export const STEP_FIELDS: Record<StepId, string[]> = {
  locale: ["locale"],
  nationality: ["nationality"],
  gender: ["gender"],
  birthdate: ["birthdate"],
  currentVisa: ["currentVisaCode"],
  address: ["addressRoad", "addressJibun", "regionSigungu", "lat", "lng"],
  koreanLevel: ["koreanLevelType", "koreanLevelValue"],
  targetVisa: ["targetVisaCode"],
  f2rDetail: ["educationLevel"],
  e74rDetail: ["e9E10H2ResidenceYears"],
  f4rDetail: ["migrationType"],
  d2Detail: [
    "universityName",
    "departmentName",
    "academicStatus",
    "programStartDate",
  ],
};

/**
 * 목표비자에 따라 전체 스텝 순서를 만든다.
 * 목표비자를 아직 고르지 않았으면 공통 스텝까지만 반환한다.
 */
export function getStepSequence(
  targetVisaCode: TargetVisaCode | null,
): StepId[] {
  const common = [...COMMON_STEP_IDS];
  if (targetVisaCode === null) return common;
  return [...common, DETAIL_STEP_BY_VISA[targetVisaCode]];
}

/** URL의 `?step=` 값을 시퀀스 인덱스로 바꾼다. 모르는 값이면 첫 스텝으로 되돌린다. */
export function getStepIndex(sequence: StepId[], step: string): number {
  const index = sequence.indexOf(step as StepId);
  return index === -1 ? 0 : index;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm run test`
Expected: PASS — 10 tests passed

- [ ] **Step 5: lint·typecheck 확인**

Run: `npm run lint && npm run typecheck`
Expected: 오류 없음

- [ ] **Step 6: 커밋**

```bash
git add features/onboarding/steps.ts features/onboarding/steps.test.ts
git commit -m "feat: 온보딩 스텝 시퀀스와 목표비자별 분기 로직 추가"
```

---

## Task 5: Supabase 마이그레이션 + DB 타입

**Files:**
- Create: `supabase/migrations/20260824000000_onboarding_user_schema.sql`
- Create: `lib/supabase/database.types.ts`
- Modify: `.env.example`

**Interfaces:**
- Consumes: `constants.ts`, `schema.ts`의 타입
- Produces:
  - `type ProfileRow`, `type ProfileInsert`
  - `type UserVisaProfileRow`, `type UserVisaProfileInsert`
  - `type VisaDetails`

> **검증 한계:** 이 태스크는 실행 중인 Supabase 인스턴스 없이는 SQL을 실제로 적용해볼 수 없다. Supabase CLI가 설치되어 있으면 `npx supabase db reset --local`로 검증하고, 없으면 SQL 문법 검토 + TypeScript 타입 컴파일로 대체한다. 실제 적용은 배포 담당자가 Supabase 대시보드 SQL Editor에서 수행한다.

- [ ] **Step 1: 마이그레이션 SQL 작성**

`supabase/migrations/20260824000000_onboarding_user_schema.sql`:

```sql
-- 온보딩 user 스키마 (스펙 §3)
-- 하이브리드 설계: 판정에 쓰이는 값은 typed column, 비자 전용 값은 visa_details JSONB.

create table if not exists public.profiles (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  locale      text not null,
  gender      text,
  birthdate   date,
  nationality text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.user_visa_profile (
  user_id uuid primary key references auth.users(id) on delete cascade,

  -- 현재/목표 비자
  current_visa_code text,
  target_visa_code  text,

  -- 공통 판정 필드 (2개 이상 비자에서 재사용)
  korean_level_type  text,
  korean_level_value smallint,
  address_road       text,
  address_jibun      text,
  region_sigungu     text,
  lat                double precision,
  lng                double precision,

  -- 3단계("내 정보 입력하기")에서 채워질 필드. 온보딩 단계에서는 NULL.
  annual_income_krw integer,
  employment_months smallint,
  education_level   text,

  -- 비자 전용·희귀 필드
  visa_details jsonb not null default '{}'::jsonb,

  updated_at timestamptz not null default now(),

  constraint user_visa_profile_target_visa_code_check
    check (target_visa_code is null
           or target_visa_code in ('F-2-R', 'E-7-4R', 'F-4-R', 'D-2')),
  constraint user_visa_profile_korean_level_type_check
    check (korean_level_type is null
           or korean_level_type in ('TOPIK', 'KIIP', 'NONE')),
  constraint user_visa_profile_korean_level_value_check
    check (korean_level_value is null
           or (korean_level_value between 1 and 6))
);

create index if not exists user_visa_profile_region_sigungu_idx
  on public.user_visa_profile (region_sigungu);
create index if not exists user_visa_profile_target_visa_code_idx
  on public.user_visa_profile (target_visa_code);
create index if not exists user_visa_profile_visa_details_idx
  on public.user_visa_profile using gin (visa_details jsonb_path_ops);

-- RLS: 본인 행만 읽기·쓰기 가능. Supabase RLS는 default-deny다.
alter table public.profiles enable row level security;
alter table public.user_visa_profile enable row level security;

create policy profiles_select_own on public.profiles
  for select using ((select auth.uid()) = user_id);
create policy profiles_insert_own on public.profiles
  for insert with check ((select auth.uid()) = user_id);
create policy profiles_update_own on public.profiles
  for update using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy profiles_delete_own on public.profiles
  for delete using ((select auth.uid()) = user_id);

create policy user_visa_profile_select_own on public.user_visa_profile
  for select using ((select auth.uid()) = user_id);
create policy user_visa_profile_insert_own on public.user_visa_profile
  for insert with check ((select auth.uid()) = user_id);
create policy user_visa_profile_update_own on public.user_visa_profile
  for update using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy user_visa_profile_delete_own on public.user_visa_profile
  for delete using ((select auth.uid()) = user_id);
```

> `(select auth.uid())`로 감싸는 것은 Supabase 권장 패턴이다. 행마다 함수를 재평가하지 않고 InitPlan으로 한 번만 계산해 대량 조회 시 성능이 크게 나아진다.

- [ ] **Step 2: DB 타입 파일 작성**

`lib/supabase/database.types.ts`:

```ts
import type { TargetVisaCode } from "@/features/onboarding/constants";

/** `user_visa_profile.visa_details`에 들어가는 비자 전용 값 (스펙 §3.2). */
export type VisaDetails = {
  /** F-4-R: 이주 유형 */
  migrationType?: "EXISTING_RESIDENT" | "DOMESTIC_TRANSFER" | "OVERSEAS_TRANSFER";
  /** E-7-4R: 최근 10년 내 E-9·E-10·H-2 체류 연수 */
  e9E10H2ResidenceYears?: number;
  /** D-2: 재학 정보 */
  universityName?: string;
  departmentName?: string;
  academicStatus?:
    | "LANGUAGE_COURSE"
    | "ASSOCIATE"
    | "BACHELOR_1_2"
    | "BACHELOR_3_4"
    | "GRADUATE";
  programStartDate?: string;
};

export type ProfileRow = {
  user_id: string;
  locale: string;
  gender: string | null;
  birthdate: string | null;
  nationality: string | null;
  created_at: string;
  updated_at: string;
};

export type ProfileInsert = Omit<ProfileRow, "created_at" | "updated_at">;

export type UserVisaProfileRow = {
  user_id: string;
  current_visa_code: string | null;
  target_visa_code: TargetVisaCode | null;
  korean_level_type: "TOPIK" | "KIIP" | "NONE" | null;
  korean_level_value: number | null;
  address_road: string | null;
  address_jibun: string | null;
  region_sigungu: string | null;
  lat: number | null;
  lng: number | null;
  annual_income_krw: number | null;
  employment_months: number | null;
  education_level: string | null;
  visa_details: VisaDetails;
  updated_at: string;
};

export type UserVisaProfileInsert = Omit<UserVisaProfileRow, "updated_at">;
```

- [ ] **Step 3: .env.example에 Kakao 키 추가**

`.env.example` 전체를 다음으로 교체한다:

```
# Supabase project settings
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=

# Kakao Local API (서버 전용 — NEXT_PUBLIC_ 접두사를 붙이지 않는다)
# https://developers.kakao.com 앱 등록 후 REST API 키를 입력한다.
# 값이 없으면 주소 검색은 빈 결과와 안내 메시지를 반환한다.
KAKAO_REST_API_KEY=
```

- [ ] **Step 4: 타입 컴파일 확인**

Run: `npm run typecheck`
Expected: 오류 없음

- [ ] **Step 5: (선택) Supabase CLI로 마이그레이션 검증**

Supabase CLI가 설치되어 있다면:

Run: `npx supabase db reset --local`
Expected: 마이그레이션이 오류 없이 적용됨

CLI가 없으면 이 단계를 건너뛰고, 커밋 메시지에 "SQL은 대시보드에서 수동 적용 필요"를 남긴다.

- [ ] **Step 6: lint 확인**

Run: `npm run lint && npm run test`
Expected: 오류 없음, 기존 테스트 통과

- [ ] **Step 7: 커밋**

```bash
git add supabase/migrations/20260824000000_onboarding_user_schema.sql lib/supabase/database.types.ts .env.example
git commit -m "feat: 온보딩 user 스키마 마이그레이션과 DB 타입 추가"
```

---

## Task 6: Kakao 주소 검색 Route Handler

**Files:**
- Create: `app/api/address/search/route.ts`
- Test: `app/api/address/search/route.test.ts`
- Modify: `lib/address/normalize.ts` (Task 1에서 생성됨 — 타입·매핑 함수 추가)
- Modify: `lib/address/normalize.test.ts`

**Interfaces:**
- Consumes: `normalizeSigungu` (Task 1)
- Produces:
  - `type AddressSuggestion = { roadAddress: string; jibunAddress: string; regionSigungu: string; lat: number; lng: number }`
  - `mapKakaoDocument(doc: KakaoAddressDocument): AddressSuggestion | null`
  - `GET /api/address/search?query=...` → `{ documents: AddressSuggestion[] }`

- [ ] **Step 1: 정규화 함수 테스트 추가**

`lib/address/normalize.test.ts` 파일 끝에 추가한다:

```ts
import { mapKakaoDocument } from "./normalize";

describe("mapKakaoDocument", () => {
  const doc = {
    address_name: "충북 제천시 청전동 111",
    x: "128.1909",
    y: "37.1326",
    address: {
      address_name: "충북 제천시 청전동 111",
      region_2depth_name: "제천시",
    },
    road_address: {
      address_name: "충북 제천시 내토로 295",
      region_2depth_name: "제천시",
    },
  };

  it("도로명주소와 지번주소를 함께 반환한다", () => {
    expect(mapKakaoDocument(doc)).toEqual({
      roadAddress: "충북 제천시 내토로 295",
      jibunAddress: "충북 제천시 청전동 111",
      regionSigungu: "제천시",
      lat: 37.1326,
      lng: 128.1909,
    });
  });

  it("도로명주소가 없으면 지번주소로 대체한다", () => {
    const result = mapKakaoDocument({ ...doc, road_address: null });
    expect(result?.roadAddress).toBe("충북 제천시 청전동 111");
    expect(result?.regionSigungu).toBe("제천시");
  });

  it("자치구가 붙은 시군구는 시 단위로 정규화한다", () => {
    const result = mapKakaoDocument({
      ...doc,
      road_address: {
        address_name: "충북 청주시 흥덕구 사직대로 100",
        region_2depth_name: "청주시 흥덕구",
      },
    });
    expect(result?.regionSigungu).toBe("청주시");
  });

  it("좌표가 숫자가 아니면 null을 반환한다", () => {
    expect(mapKakaoDocument({ ...doc, x: "", y: "" })).toBeNull();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm run test`
Expected: FAIL — `mapKakaoDocument is not a function`

- [ ] **Step 3: 정규화 함수 구현**

`lib/address/normalize.ts` 파일 끝에 추가한다:

```ts
/** Kakao Local API 주소 검색 응답의 문서 1건. 필요한 필드만 선언한다. */
export type KakaoAddressDocument = {
  address_name: string;
  x: string;
  y: string;
  address: { address_name: string; region_2depth_name: string } | null;
  road_address: { address_name: string; region_2depth_name: string } | null;
};

/** 화면과 DB가 쓰는 주소 표현. */
export type AddressSuggestion = {
  roadAddress: string;
  jibunAddress: string;
  regionSigungu: string;
  lat: number;
  lng: number;
};

/** Kakao 문서를 앱 도메인 표현으로 바꾼다. 좌표가 없으면 null을 반환한다. */
export function mapKakaoDocument(
  doc: KakaoAddressDocument,
): AddressSuggestion | null {
  const lat = Number(doc.y);
  const lng = Number(doc.x);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (doc.x.trim() === "" || doc.y.trim() === "") return null;

  const jibunAddress = doc.address?.address_name ?? doc.address_name;
  const roadAddress = doc.road_address?.address_name ?? jibunAddress;
  const rawSigungu =
    doc.road_address?.region_2depth_name ??
    doc.address?.region_2depth_name ??
    "";

  return {
    roadAddress,
    jibunAddress,
    regionSigungu: normalizeSigungu(rawSigungu),
    lat,
    lng,
  };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm run test`
Expected: PASS — normalize 테스트 9건 통과

- [ ] **Step 5: Route Handler 테스트 작성**

`app/api/address/search/route.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

function request(query: string) {
  return new Request(`http://localhost/api/address/search?query=${query}`);
}

const kakaoPayload = {
  documents: [
    {
      address_name: "충북 제천시 청전동 111",
      x: "128.1909",
      y: "37.1326",
      address: { address_name: "충북 제천시 청전동 111", region_2depth_name: "제천시" },
      road_address: {
        address_name: "충북 제천시 내토로 295",
        region_2depth_name: "제천시",
      },
    },
  ],
};

beforeEach(() => {
  vi.stubEnv("KAKAO_REST_API_KEY", "test-key");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("GET /api/address/search", () => {
  it("검색어가 없으면 빈 결과를 반환한다", async () => {
    const response = await GET(request(""));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ documents: [] });
  });

  it("검색어가 2자 미만이면 Kakao를 호출하지 않는다", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const response = await GET(request("서"));
    expect(fetchSpy).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({ documents: [] });
  });

  it("Kakao 응답을 앱 도메인 형태로 변환해 반환한다", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(kakaoPayload), { status: 200 }),
    );
    const response = await GET(request("내토로"));
    await expect(response.json()).resolves.toEqual({
      documents: [
        {
          roadAddress: "충북 제천시 내토로 295",
          jibunAddress: "충북 제천시 청전동 111",
          regionSigungu: "제천시",
          lat: 37.1326,
          lng: 128.1909,
        },
      ],
    });
  });

  it("Authorization 헤더에 KakaoAK 키를 담아 호출한다", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify(kakaoPayload), { status: 200 }));
    await GET(request("내토로"));
    const [, init] = fetchSpy.mock.calls[0];
    expect((init?.headers as Record<string, string>).Authorization).toBe(
      "KakaoAK test-key",
    );
  });

  it("API 키가 없으면 503과 빈 결과를 반환하고 throw하지 않는다", async () => {
    vi.stubEnv("KAKAO_REST_API_KEY", "");
    const response = await GET(request("내토로"));
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ documents: [] });
  });

  it("Kakao가 오류를 반환하면 502와 빈 결과를 반환한다", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("rate limited", { status: 429 }),
    );
    const response = await GET(request("내토로"));
    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({ documents: [] });
  });

  it("네트워크 오류가 나도 502와 빈 결과를 반환한다", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"));
    const response = await GET(request("내토로"));
    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({ documents: [] });
  });
});
```

- [ ] **Step 6: 테스트 실패 확인**

Run: `npm run test`
Expected: FAIL — `Failed to resolve import "./route"`

- [ ] **Step 7: Route Handler 구현**

`app/api/address/search/route.ts`:

```ts
import { type KakaoAddressDocument, mapKakaoDocument } from "@/lib/address/normalize";

const KAKAO_ENDPOINT = "https://dapi.kakao.com/v2/local/search/address.json";
const MIN_QUERY_LENGTH = 2;
const RESULT_SIZE = 10;

/**
 * Kakao Local API 주소 검색 프록시.
 *
 * REST 키를 브라우저에 노출하지 않기 위해 서버에서 대신 호출한다.
 * 키가 없거나 Kakao가 실패해도 throw하지 않고 빈 결과를 반환한다 —
 * 환경변수 없이도 빌드·기본 화면이 동작해야 한다는 AGENTS.md 요구사항 때문이다.
 */
export async function GET(request: Request): Promise<Response> {
  const query = new URL(request.url).searchParams.get("query")?.trim() ?? "";

  if (query.length < MIN_QUERY_LENGTH) {
    return Response.json({ documents: [] });
  }

  const apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey) {
    return Response.json(
      {
        documents: [],
        message: "주소 검색이 준비 중입니다. 잠시 후 다시 시도해 주세요.",
      },
      { status: 503 },
    );
  }

  const url = `${KAKAO_ENDPOINT}?query=${encodeURIComponent(query)}&size=${RESULT_SIZE}`;

  try {
    const response = await fetch(url, {
      headers: { Authorization: `KakaoAK ${apiKey}` },
      // 같은 검색어는 1시간 동안 캐시한다. 주소 데이터는 자주 바뀌지 않는다.
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return Response.json(
        {
          documents: [],
          message: "주소를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
        },
        { status: 502 },
      );
    }

    const payload = (await response.json()) as { documents?: KakaoAddressDocument[] };
    const documents = (payload.documents ?? [])
      .map(mapKakaoDocument)
      .filter((item) => item !== null);

    return Response.json({ documents });
  } catch {
    return Response.json(
      {
        documents: [],
        message: "주소를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
      },
      { status: 502 },
    );
  }
}
```

- [ ] **Step 8: 테스트 통과 확인**

Run: `npm run test`
Expected: PASS — Route Handler 테스트 7건 통과

- [ ] **Step 9: lint·typecheck 확인**

Run: `npm run lint && npm run typecheck`
Expected: 오류 없음

- [ ] **Step 10: 커밋**

```bash
git add lib/address/normalize.ts lib/address/normalize.test.ts app/api/address/search/route.ts app/api/address/search/route.test.ts
git commit -m "feat: Kakao Local API 주소 검색 프록시 Route Handler 추가"
```

---

## Task 7: AddressSearchInput 컴포넌트

**Files:**
- Create: `components/address/address-search-input.tsx`
- Test: `components/address/address-search-input.test.tsx`

**Interfaces:**
- Consumes: `AddressSuggestion` (Task 6)
- Produces: `<AddressSearchInput value={AddressSuggestion | null} onSelect={(s: AddressSuggestion) => void} label={string} />`

- [ ] **Step 1: 실패하는 테스트 작성**

`components/address/address-search-input.test.tsx`:

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AddressSearchInput } from "./address-search-input";

const suggestion = {
  roadAddress: "충북 제천시 내토로 295",
  jibunAddress: "충북 제천시 청전동 111",
  regionSigungu: "제천시",
  lat: 37.1326,
  lng: 128.1909,
};

function mockSearchResponse(documents: unknown[]) {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ documents }), { status: 200 }),
  );
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("AddressSearchInput", () => {
  it("입력 즉시 요청하지 않고 debounce 후에 한 번만 요청한다", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ documents: [] }), { status: 200 }),
    );
    render(<AddressSearchInput value={null} onSelect={vi.fn()} label="주소" />);

    await user.type(screen.getByLabelText("주소"), "내토로");
    expect(fetchSpy).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(300);
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
  });

  it("검색 결과를 옵션으로 보여준다", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    mockSearchResponse([suggestion]);
    render(<AddressSearchInput value={null} onSelect={vi.fn()} label="주소" />);

    await user.type(screen.getByLabelText("주소"), "내토로");
    await vi.advanceTimersByTimeAsync(300);

    expect(await screen.findByRole("option", { name: /내토로 295/ })).toBeInTheDocument();
  });

  it("결과 개수를 보조기술에 알린다", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    mockSearchResponse([suggestion]);
    render(<AddressSearchInput value={null} onSelect={vi.fn()} label="주소" />);

    await user.type(screen.getByLabelText("주소"), "내토로");
    await vi.advanceTimersByTimeAsync(300);

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("검색 결과 1건"),
    );
  });

  it("결과를 클릭하면 onSelect를 호출한다", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onSelect = vi.fn();
    mockSearchResponse([suggestion]);
    render(<AddressSearchInput value={null} onSelect={onSelect} label="주소" />);

    await user.type(screen.getByLabelText("주소"), "내토로");
    await vi.advanceTimersByTimeAsync(300);
    await user.click(await screen.findByRole("option", { name: /내토로 295/ }));

    expect(onSelect).toHaveBeenCalledWith(suggestion);
  });

  it("방향키와 Enter로 결과를 선택할 수 있다", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onSelect = vi.fn();
    mockSearchResponse([suggestion]);
    render(<AddressSearchInput value={null} onSelect={onSelect} label="주소" />);

    const input = screen.getByLabelText("주소");
    await user.type(input, "내토로");
    await vi.advanceTimersByTimeAsync(300);
    await screen.findByRole("option", { name: /내토로 295/ });

    await user.keyboard("{ArrowDown}{Enter}");
    expect(onSelect).toHaveBeenCalledWith(suggestion);
  });

  it("Escape를 누르면 목록을 닫는다", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    mockSearchResponse([suggestion]);
    render(<AddressSearchInput value={null} onSelect={vi.fn()} label="주소" />);

    const input = screen.getByLabelText("주소");
    await user.type(input, "내토로");
    await vi.advanceTimersByTimeAsync(300);
    await screen.findByRole("option", { name: /내토로 295/ });

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("option")).not.toBeInTheDocument());
  });

  it("combobox 접근성 속성을 갖는다", () => {
    render(<AddressSearchInput value={null} onSelect={vi.fn()} label="주소" />);
    const input = screen.getByLabelText("주소");
    expect(input).toHaveAttribute("role", "combobox");
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(input).toHaveAttribute("aria-autocomplete", "list");
  });

  it("이미 선택된 주소가 있으면 입력창에 표시한다", () => {
    render(<AddressSearchInput value={suggestion} onSelect={vi.fn()} label="주소" />);
    expect(screen.getByLabelText("주소")).toHaveValue("충북 제천시 내토로 295");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm run test`
Expected: FAIL — `Failed to resolve import "./address-search-input"`

- [ ] **Step 3: 컴포넌트 구현**

`components/address/address-search-input.tsx`:

```tsx
"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { AddressSuggestion } from "@/lib/address/normalize";

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

type Props = {
  value: AddressSuggestion | null;
  onSelect: (suggestion: AddressSuggestion) => void;
  label: string;
};

export function AddressSearchInput({ value, onSelect, label }: Props) {
  const [query, setQuery] = useState(value?.roadAddress ?? "");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const inputId = useId();
  const listboxId = useId();
  // 사용자가 방금 목록에서 고른 값은 다시 검색하지 않는다.
  const skipNextSearch = useRef(false);

  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setIsOpen(false);
      setMessage("");
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/address/search?query=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal },
        );
        const payload = (await response.json()) as {
          documents?: AddressSuggestion[];
          message?: string;
        };
        const documents = payload.documents ?? [];
        setSuggestions(documents);
        setActiveIndex(-1);
        setIsOpen(documents.length > 0);
        setMessage(
          payload.message ??
            (documents.length > 0
              ? `검색 결과 ${documents.length}건`
              : "검색 결과가 없습니다."),
        );
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        setSuggestions([]);
        setIsOpen(false);
        setMessage("주소를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  function choose(suggestion: AddressSuggestion) {
    skipNextSearch.current = true;
    setQuery(suggestion.roadAddress);
    setSuggestions([]);
    setIsOpen(false);
    setActiveIndex(-1);
    setMessage("");
    onSelect(suggestion);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (!isOpen || suggestions.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) =>
        current <= 0 ? suggestions.length - 1 : current - 1,
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      const index = activeIndex === -1 ? 0 : activeIndex;
      const picked = suggestions[index];
      if (picked) choose(picked);
    }
  }

  return (
    <div className="relative">
      <label
        htmlFor={inputId}
        className="block text-sm font-extrabold text-[#33453e]"
      >
        {label}
      </label>
      <input
        id={inputId}
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={
          activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
        }
        autoComplete="off"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="도로명 또는 지번을 입력하세요"
        className="mt-2 min-h-14 w-full rounded-2xl border border-[#dfe5e1] px-4 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d]"
      />

      <p role="status" aria-live="polite" className="mt-2 text-sm text-[#6c7873]">
        {message}
      </p>

      {isOpen ? (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={label}
          className="absolute z-10 mt-1 w-full overflow-hidden rounded-2xl border border-[#dfe5e1] bg-white shadow-lg"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={`${suggestion.roadAddress}-${suggestion.lat}-${suggestion.lng}`}
              id={`${listboxId}-option-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              // biome-ignore lint: listbox 옵션은 마우스 클릭도 지원해야 한다.
              onMouseDown={(event) => {
                event.preventDefault();
                choose(suggestion);
              }}
              className={`cursor-pointer px-4 py-3 text-left text-sm ${
                index === activeIndex ? "bg-[#e9f3ef]" : "bg-white"
              }`}
            >
              <span className="block font-extrabold text-[#33453e]">
                {suggestion.roadAddress}
              </span>
              <span className="block text-[#6c7873]">{suggestion.jibunAddress}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm run test`
Expected: PASS — AddressSearchInput 테스트 8건 통과

- [ ] **Step 5: lint·typecheck 확인**

Run: `npm run lint && npm run typecheck`
Expected: 오류 없음. `biome-ignore` 주석이 eslint에서 문제되면 해당 줄을 삭제한다 (이 레포는 eslint를 쓴다).

- [ ] **Step 6: 커밋**

```bash
git add components/address/address-search-input.tsx components/address/address-search-input.test.tsx
git commit -m "feat: 주소 자동완성 combobox 컴포넌트 추가"
```

---

## Task 8: 온보딩 저장 Server Action

**Files:**
- Create: `features/onboarding/actions.ts`
- Test: `features/onboarding/actions.test.ts`

**Interfaces:**
- Consumes: `onboardingSubmissionSchema` (Task 3), `lib/supabase/server`의 `createClient`, `database.types.ts`
- Produces:
  - `type SaveOnboardingState = { status: "idle" } | { status: "success" } | { status: "error"; message: string; fieldErrors?: Record<string, string> }`
  - `saveOnboarding(prev: SaveOnboardingState, formData: FormData): Promise<SaveOnboardingState>`

- [ ] **Step 1: 실패하는 테스트 작성**

`features/onboarding/actions.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const upsertProfiles = vi.fn();
const upsertVisaProfile = vi.fn();
const getUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser },
    from: (table: string) => ({
      upsert: table === "profiles" ? upsertProfiles : upsertVisaProfile,
    }),
  }),
}));

const { saveOnboarding } = await import("./actions");

const validPayload = {
  locale: "ko",
  gender: "unspecified",
  birthdate: "1998-04-12",
  nationality: "VN",
  currentVisaCode: "E-9",
  addressRoad: "충북 제천시 내토로 295",
  addressJibun: "충북 제천시 청전동 111",
  regionSigungu: "제천시",
  lat: 37.1326,
  lng: 128.1909,
  koreanLevelType: "TOPIK",
  koreanLevelValue: 3,
  targetVisaCode: "E-7-4R",
  e9E10H2ResidenceYears: 3,
};

function formDataOf(payload: unknown) {
  const formData = new FormData();
  formData.set("payload", JSON.stringify(payload));
  return formData;
}

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  upsertProfiles.mockResolvedValue({ error: null });
  upsertVisaProfile.mockResolvedValue({ error: null });
});

describe("saveOnboarding", () => {
  it("로그인하지 않았으면 저장하지 않고 오류를 반환한다", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    const result = await saveOnboarding({ status: "idle" }, formDataOf(validPayload));
    expect(result.status).toBe("error");
    expect(upsertProfiles).not.toHaveBeenCalled();
    expect(upsertVisaProfile).not.toHaveBeenCalled();
  });

  it("검증에 실패한 값은 저장하지 않는다", async () => {
    const result = await saveOnboarding(
      { status: "idle" },
      formDataOf({ ...validPayload, birthdate: "2999-01-01" }),
    );
    expect(result.status).toBe("error");
    expect(upsertVisaProfile).not.toHaveBeenCalled();
  });

  it("JSON이 깨져 있으면 오류를 반환한다", async () => {
    const formData = new FormData();
    formData.set("payload", "{not-json");
    const result = await saveOnboarding({ status: "idle" }, formData);
    expect(result.status).toBe("error");
  });

  it("profiles에 신원 정보를 저장한다", async () => {
    await saveOnboarding({ status: "idle" }, formDataOf(validPayload));
    expect(upsertProfiles).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        locale: "ko",
        gender: "unspecified",
        birthdate: "1998-04-12",
        nationality: "VN",
      }),
      { onConflict: "user_id" },
    );
  });

  it("판정 필드는 컬럼에, 비자 전용 필드는 visa_details에 저장한다", async () => {
    await saveOnboarding({ status: "idle" }, formDataOf(validPayload));
    expect(upsertVisaProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        current_visa_code: "E-9",
        target_visa_code: "E-7-4R",
        korean_level_type: "TOPIK",
        korean_level_value: 3,
        region_sigungu: "제천시",
        visa_details: { e9E10H2ResidenceYears: 3 },
      }),
      { onConflict: "user_id" },
    );
  });

  it("F-2-R 학력은 visa_details가 아니라 education_level 컬럼에 저장한다", async () => {
    await saveOnboarding(
      { status: "idle" },
      formDataOf({
        ...validPayload,
        targetVisaCode: "F-2-R",
        e9E10H2ResidenceYears: undefined,
        educationLevel: "ASSOCIATE_OR_ABOVE",
      }),
    );
    const [row] = upsertVisaProfile.mock.calls[0];
    expect(row.education_level).toBe("ASSOCIATE_OR_ABOVE");
    expect(row.visa_details).toEqual({});
  });

  it("D-2 재학 정보는 visa_details에 저장한다", async () => {
    await saveOnboarding(
      { status: "idle" },
      formDataOf({
        ...validPayload,
        targetVisaCode: "D-2",
        e9E10H2ResidenceYears: undefined,
        universityName: "충북대학교",
        departmentName: "융합소프트웨어학과",
        academicStatus: "BACHELOR_3_4",
        programStartDate: "2024-03-02",
      }),
    );
    const [row] = upsertVisaProfile.mock.calls[0];
    expect(row.visa_details).toEqual({
      universityName: "충북대학교",
      departmentName: "융합소프트웨어학과",
      academicStatus: "BACHELOR_3_4",
      programStartDate: "2024-03-02",
    });
  });

  it("저장에 성공하면 success를 반환한다", async () => {
    const result = await saveOnboarding({ status: "idle" }, formDataOf(validPayload));
    expect(result.status).toBe("success");
  });

  it("DB 오류가 나면 error를 반환한다", async () => {
    upsertVisaProfile.mockResolvedValue({ error: { message: "boom" } });
    const result = await saveOnboarding({ status: "idle" }, formDataOf(validPayload));
    expect(result.status).toBe("error");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm run test`
Expected: FAIL — `Failed to resolve import "./actions"`

- [ ] **Step 3: Server Action 구현**

`features/onboarding/actions.ts`:

```ts
"use server";

import type {
  ProfileInsert,
  UserVisaProfileInsert,
  VisaDetails,
} from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { type OnboardingSubmission, onboardingSubmissionSchema } from "./schema";

export type SaveOnboardingState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };

/** 제출값에서 `visa_details` JSONB에 들어갈 부분만 뽑는다 (스펙 §3.2). */
function toVisaDetails(submission: OnboardingSubmission): VisaDetails {
  switch (submission.targetVisaCode) {
    case "E-7-4R":
      return { e9E10H2ResidenceYears: submission.e9E10H2ResidenceYears };
    case "F-4-R":
      return { migrationType: submission.migrationType };
    case "D-2":
      return {
        universityName: submission.universityName,
        departmentName: submission.departmentName,
        academicStatus: submission.academicStatus,
        programStartDate: submission.programStartDate,
      };
    // F-2-R의 educationLevel은 typed column으로 간다.
    case "F-2-R":
      return {};
  }
}

/**
 * 온보딩 답변을 저장한다.
 *
 * Next.js 문서 요구사항에 따라 이 함수 안에서 인증과 입력 검증을 모두 다시 수행한다.
 * 클라이언트 검증만 신뢰하면 조작된 payload가 그대로 DB에 들어간다.
 */
export async function saveOnboarding(
  _prev: SaveOnboardingState,
  formData: FormData,
): Promise<SaveOnboardingState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { status: "error", message: "로그인 후 다시 시도해 주세요." };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("payload") ?? ""));
  } catch {
    return { status: "error", message: "입력값을 읽지 못했습니다." };
  }

  const parsed = onboardingSubmissionSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return {
      status: "error",
      message: "입력값을 다시 확인해 주세요.",
      fieldErrors,
    };
  }

  const submission = parsed.data;

  const profileRow: ProfileInsert = {
    user_id: user.id,
    locale: submission.locale,
    gender: submission.gender,
    birthdate: submission.birthdate,
    nationality: submission.nationality,
  };

  const visaProfileRow: UserVisaProfileInsert = {
    user_id: user.id,
    current_visa_code: submission.currentVisaCode,
    target_visa_code: submission.targetVisaCode,
    korean_level_type: submission.koreanLevelType,
    korean_level_value: submission.koreanLevelValue,
    address_road: submission.addressRoad,
    address_jibun: submission.addressJibun,
    region_sigungu: submission.regionSigungu,
    lat: submission.lat,
    lng: submission.lng,
    // 3단계("내 정보 입력하기")에서 채워지는 필드. 온보딩에서는 수집하지 않는다.
    annual_income_krw: null,
    employment_months: null,
    education_level:
      submission.targetVisaCode === "F-2-R" ? submission.educationLevel : null,
    visa_details: toVisaDetails(submission),
  };

  const profileResult = await supabase
    .from("profiles")
    .upsert(profileRow, { onConflict: "user_id" });
  if (profileResult.error) {
    return { status: "error", message: "저장에 실패했습니다. 다시 시도해 주세요." };
  }

  const visaProfileResult = await supabase
    .from("user_visa_profile")
    .upsert(visaProfileRow, { onConflict: "user_id" });
  if (visaProfileResult.error) {
    return { status: "error", message: "저장에 실패했습니다. 다시 시도해 주세요." };
  }

  return { status: "success" };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm run test`
Expected: PASS — Server Action 테스트 9건 통과

- [ ] **Step 5: lint·typecheck 확인**

Run: `npm run lint && npm run typecheck`
Expected: 오류 없음

- [ ] **Step 6: 커밋**

```bash
git add features/onboarding/actions.ts features/onboarding/actions.test.ts
git commit -m "feat: 온보딩 저장 Server Action 추가 (인증·zod 서버 재검증 포함)"
```

---

## Task 9: 스텝 UI 컴포넌트

**Files:**
- Create: `features/onboarding/steps/choice-step.tsx`
- Create: `features/onboarding/steps/birthdate-step.tsx`
- Create: `features/onboarding/steps/korean-level-step.tsx`
- Create: `features/onboarding/steps/address-step.tsx`
- Create: `features/onboarding/steps/d2-detail-step.tsx`
- Test: `features/onboarding/steps/choice-step.test.tsx`
- Test: `features/onboarding/steps/address-step.test.tsx`

**Interfaces:**
- Consumes: `AddressSearchInput` (Task 7), `isPopulationDeclineRegion` (Task 2)
- Produces:
  - `<ChoiceStep options={{id,label}[]} value={string|null} onChange={(id)=>void} legend={string} />`
  - `<BirthdateStep value={string} onChange={(v)=>void} error={string|undefined} />`
  - `<KoreanLevelStep type value onChange error />`
  - `<AddressStep value onSelect />`
  - `<D2DetailStep values onChange errors />`

- [ ] **Step 1: ChoiceStep 실패 테스트 작성**

`features/onboarding/steps/choice-step.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ChoiceStep } from "./choice-step";

const options = [
  { id: "VN", label: "베트남" },
  { id: "UZ", label: "우즈베키스탄" },
];

describe("ChoiceStep", () => {
  it("선택지를 모두 렌더링한다", () => {
    render(
      <ChoiceStep options={options} value={null} onChange={vi.fn()} legend="국적" />,
    );
    expect(screen.getByRole("button", { name: "베트남" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "우즈베키스탄" })).toBeInTheDocument();
  });

  it("선택된 항목만 aria-pressed가 true다", () => {
    render(
      <ChoiceStep options={options} value="VN" onChange={vi.fn()} legend="국적" />,
    );
    expect(screen.getByRole("button", { name: "베트남" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "우즈베키스탄" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("클릭하면 선택한 id로 onChange를 호출한다", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ChoiceStep options={options} value={null} onChange={onChange} legend="국적" />,
    );
    await user.click(screen.getByRole("button", { name: "우즈베키스탄" }));
    expect(onChange).toHaveBeenCalledWith("UZ");
  });

  it("그룹에 접근 가능한 이름을 부여한다", () => {
    render(
      <ChoiceStep options={options} value={null} onChange={vi.fn()} legend="국적" />,
    );
    expect(screen.getByRole("group", { name: "국적" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm run test`
Expected: FAIL — `Failed to resolve import "./choice-step"`

- [ ] **Step 3: ChoiceStep 구현**

`features/onboarding/steps/choice-step.tsx`:

```tsx
"use client";

import { Icon } from "@/components/ui/icon";

export type ChoiceOption = { id: string; label: string; description?: string };

type Props = {
  options: ChoiceOption[];
  value: string | null;
  onChange: (id: string) => void;
  legend: string;
};

export function ChoiceStep({ options, value, onChange, legend }: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-2" role="group" aria-label={legend}>
      {options.map((option) => {
        const active = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.id)}
            className={`flex min-h-14 items-center justify-between rounded-2xl border px-4 text-left text-base font-extrabold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d] ${
              active
                ? "border-[#2d6d5d] bg-[#e9f3ef] text-[#1f584a]"
                : "border-[#dfe5e1] bg-white text-[#33453e] hover:border-[#9bb9ac] hover:bg-[#f7faf8]"
            }`}
          >
            <span>
              {option.label}
              {option.description ? (
                <span className="mt-1 block text-sm font-semibold text-[#6c7873]">
                  {option.description}
                </span>
              ) : null}
            </span>
            <span
              aria-hidden="true"
              className={`grid size-6 shrink-0 place-items-center rounded-full border ${
                active
                  ? "border-[#2d6d5d] bg-[#2d6d5d] text-white"
                  : "border-[#cbd5cf] text-transparent"
              }`}
            >
              <Icon name="check" className="size-3.5" />
            </span>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm run test`
Expected: PASS — ChoiceStep 테스트 4건 통과

- [ ] **Step 5: AddressStep 실패 테스트 작성**

`features/onboarding/steps/address-step.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AddressStep } from "./address-step";

const inDecline = {
  roadAddress: "충북 제천시 내토로 295",
  jibunAddress: "충북 제천시 청전동 111",
  regionSigungu: "제천시",
  lat: 37.1326,
  lng: 128.1909,
};

const outsideDecline = { ...inDecline, regionSigungu: "청주시" };

describe("AddressStep", () => {
  it("주소를 아직 고르지 않았으면 안내를 표시하지 않는다", () => {
    render(<AddressStep value={null} onSelect={vi.fn()} />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("인구감소지역이면 대상 지역임을 알린다", () => {
    render(<AddressStep value={inDecline} onSelect={vi.fn()} />);
    expect(screen.getByText(/지역특화형 비자 대상 지역/)).toBeInTheDocument();
  });

  it("인구감소지역이 아니면 경고를 표시한다", () => {
    render(<AddressStep value={outsideDecline} onSelect={vi.fn()} />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      /지역특화형 비자\(F-2-R·E-7-4R·F-4-R\) 대상 지역이 아닙니다/,
    );
  });

  it("경고에도 참고용 안내임을 함께 표시한다", () => {
    render(<AddressStep value={outsideDecline} onSelect={vi.fn()} />);
    expect(screen.getByRole("alert")).toHaveTextContent(/참고용/);
  });
});
```

- [ ] **Step 6: 테스트 실패 확인**

Run: `npm run test`
Expected: FAIL — `Failed to resolve import "./address-step"`

- [ ] **Step 7: 나머지 스텝 컴포넌트 구현**

`features/onboarding/steps/address-step.tsx`:

```tsx
"use client";

import { AddressSearchInput } from "@/components/address/address-search-input";
import type { AddressSuggestion } from "@/lib/address/normalize";
import { isPopulationDeclineRegion } from "../constants";

type Props = {
  value: AddressSuggestion | null;
  onSelect: (suggestion: AddressSuggestion) => void;
};

export function AddressStep({ value, onSelect }: Props) {
  const eligible = value !== null && isPopulationDeclineRegion(value.regionSigungu);

  return (
    <div className="grid gap-4">
      <AddressSearchInput
        value={value}
        onSelect={onSelect}
        label="거주(희망) 주소"
      />

      {value === null ? null : eligible ? (
        <p className="rounded-xl bg-[#e9f3ef] px-4 py-3 text-sm font-semibold leading-6 text-[#1f584a]">
          {value.regionSigungu}는 지역특화형 비자 대상 지역입니다.
        </p>
      ) : (
        <p
          role="alert"
          className="rounded-xl bg-[#fff7ed] px-4 py-3 text-sm font-semibold leading-6 text-[#9a5b1d]"
        >
          {value.regionSigungu}는 지역특화형 비자(F-2-R·E-7-4R·F-4-R) 대상 지역이
          아닙니다. 참고용 안내이며 최종 판정은 관할 출입국·외국인관서에서 확인해
          주세요.
        </p>
      )}
    </div>
  );
}
```

`features/onboarding/steps/birthdate-step.tsx`:

```tsx
"use client";

import { useId } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  error?: string;
};

export function BirthdateStep({ value, onChange, error }: Props) {
  const inputId = useId();
  const errorId = useId();

  return (
    <div>
      <label htmlFor={inputId} className="block text-sm font-extrabold text-[#33453e]">
        생년월일
      </label>
      <input
        id={inputId}
        type="date"
        value={value}
        max={new Date().toISOString().slice(0, 10)}
        aria-invalid={error !== undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 min-h-14 w-full rounded-2xl border border-[#dfe5e1] px-4 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d]"
      />
      {error ? (
        <p id={errorId} role="alert" className="mt-2 text-sm font-semibold text-[#9f4038]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
```

`features/onboarding/steps/korean-level-step.tsx`:

```tsx
"use client";

import { useId } from "react";
import { ChoiceStep } from "./choice-step";

const TYPE_OPTIONS = [
  { id: "TOPIK", label: "TOPIK", description: "한국어능력시험 급수" },
  { id: "KIIP", label: "사회통합프로그램", description: "이수 단계" },
  { id: "NONE", label: "아직 없어요" },
];

type Props = {
  type: string | null;
  value: number | null;
  onChange: (next: { type: string; value: number | null }) => void;
  error?: string;
};

export function KoreanLevelStep({ type, value, onChange, error }: Props) {
  const selectId = useId();
  const errorId = useId();

  return (
    <div className="grid gap-5">
      <ChoiceStep
        options={TYPE_OPTIONS}
        value={type}
        onChange={(id) => onChange({ type: id, value: id === "NONE" ? null : value })}
        legend="한국어능력 유형"
      />

      {type !== null && type !== "NONE" ? (
        <div>
          <label
            htmlFor={selectId}
            className="block text-sm font-extrabold text-[#33453e]"
          >
            {type === "TOPIK" ? "TOPIK 급수" : "사회통합프로그램 단계"}
          </label>
          <select
            id={selectId}
            value={value ?? ""}
            aria-invalid={error !== undefined}
            aria-describedby={error ? errorId : undefined}
            onChange={(event) =>
              onChange({
                type,
                value: event.target.value === "" ? null : Number(event.target.value),
              })
            }
            className="mt-2 min-h-14 w-full rounded-2xl border border-[#dfe5e1] px-4 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d]"
          >
            <option value="">선택해 주세요</option>
            {[1, 2, 3, 4, 5, 6].map((level) => (
              <option key={level} value={level}>
                {level}
                {type === "TOPIK" ? "급" : "단계"}
              </option>
            ))}
          </select>
          {error ? (
            <p
              id={errorId}
              role="alert"
              className="mt-2 text-sm font-semibold text-[#9f4038]"
            >
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
```

`features/onboarding/steps/d2-detail-step.tsx`:

```tsx
"use client";

import { useId } from "react";

const ACADEMIC_STATUS_OPTIONS = [
  { value: "LANGUAGE_COURSE", label: "어학연수" },
  { value: "ASSOCIATE", label: "전문학사" },
  { value: "BACHELOR_1_2", label: "학사 1~2학년" },
  { value: "BACHELOR_3_4", label: "학사 3~4학년" },
  { value: "GRADUATE", label: "석사·박사" },
];

export type D2Values = {
  universityName: string;
  departmentName: string;
  academicStatus: string;
  programStartDate: string;
};

type Props = {
  values: D2Values;
  onChange: (next: D2Values) => void;
  errors: Partial<Record<keyof D2Values, string>>;
};

export function D2DetailStep({ values, onChange, errors }: Props) {
  const universityId = useId();
  const departmentId = useId();
  const statusId = useId();
  const startDateId = useId();

  const fieldClass =
    "mt-2 min-h-14 w-full rounded-2xl border border-[#dfe5e1] px-4 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d]";
  const labelClass = "block text-sm font-extrabold text-[#33453e]";
  const errorClass = "mt-2 text-sm font-semibold text-[#9f4038]";

  return (
    <div className="grid gap-5">
      <div>
        <label htmlFor={universityId} className={labelClass}>
          재학 중인 대학
        </label>
        <input
          id={universityId}
          value={values.universityName}
          aria-invalid={errors.universityName !== undefined}
          onChange={(event) =>
            onChange({ ...values, universityName: event.target.value })
          }
          className={fieldClass}
        />
        {errors.universityName ? (
          <p role="alert" className={errorClass}>
            {errors.universityName}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor={departmentId} className={labelClass}>
          학과
        </label>
        <input
          id={departmentId}
          value={values.departmentName}
          aria-invalid={errors.departmentName !== undefined}
          onChange={(event) =>
            onChange({ ...values, departmentName: event.target.value })
          }
          className={fieldClass}
        />
        {errors.departmentName ? (
          <p role="alert" className={errorClass}>
            {errors.departmentName}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor={statusId} className={labelClass}>
          현재 과정
        </label>
        <select
          id={statusId}
          value={values.academicStatus}
          aria-invalid={errors.academicStatus !== undefined}
          onChange={(event) =>
            onChange({ ...values, academicStatus: event.target.value })
          }
          className={fieldClass}
        >
          <option value="">선택해 주세요</option>
          {ACADEMIC_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {errors.academicStatus ? (
          <p role="alert" className={errorClass}>
            {errors.academicStatus}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor={startDateId} className={labelClass}>
          입학(또는 어학연수 시작)일
        </label>
        <input
          id={startDateId}
          type="date"
          value={values.programStartDate}
          max={new Date().toISOString().slice(0, 10)}
          aria-invalid={errors.programStartDate !== undefined}
          onChange={(event) =>
            onChange({ ...values, programStartDate: event.target.value })
          }
          className={fieldClass}
        />
        {errors.programStartDate ? (
          <p role="alert" className={errorClass}>
            {errors.programStartDate}
          </p>
        ) : null}
      </div>
    </div>
  );
}
```

- [ ] **Step 8: 테스트 통과 확인**

Run: `npm run test`
Expected: PASS — ChoiceStep 4건 + AddressStep 4건 통과

- [ ] **Step 9: lint·typecheck 확인**

Run: `npm run lint && npm run typecheck`
Expected: 오류 없음

- [ ] **Step 10: 커밋**

```bash
git add features/onboarding/steps
git commit -m "feat: 온보딩 스텝 UI 컴포넌트 추가"
```

---

## Task 10: 온보딩 폼 컨테이너 (URL 스텝 + 스텝별 검증)

**Files:**
- Modify: `features/onboarding/onboarding-form.tsx` (전면 재작성)
- Test: `features/onboarding/onboarding-form.test.tsx`

**Interfaces:**
- Consumes: Task 2~9의 모든 산출물
- Produces: `<OnboardingForm />` (기존 export 이름 유지 — `app/[locale]/onboarding/page.tsx`가 그대로 동작해야 한다)

- [ ] **Step 1: 실패하는 테스트 작성**

`features/onboarding/onboarding-form.test.tsx`:

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const replace = vi.fn();
const push = vi.fn();
let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParams,
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ replace, push }),
  usePathname: () => "/onboarding",
}));

vi.mock("./actions", () => ({
  saveOnboarding: vi.fn(async () => ({ status: "success" as const })),
}));

const { OnboardingForm } = await import("./onboarding-form");

beforeEach(() => {
  vi.clearAllMocks();
  searchParams = new URLSearchParams();
  window.sessionStorage.clear();
});

describe("OnboardingForm", () => {
  it("첫 진입 시 언어 선택 스텝을 보여준다", () => {
    render(<OnboardingForm />);
    expect(
      screen.getByRole("heading", { name: /어떤 언어가 편한가요/ }),
    ).toBeInTheDocument();
  });

  it("진행률을 표시한다", () => {
    render(<OnboardingForm />);
    expect(screen.getByText("1 / 8")).toBeInTheDocument();
  });

  it("URL의 step 파라미터에 해당하는 스텝을 보여준다", () => {
    searchParams = new URLSearchParams("step=gender");
    render(<OnboardingForm />);
    expect(screen.getByRole("heading", { name: /성별/ })).toBeInTheDocument();
  });

  it("모르는 step 값이면 첫 스텝으로 되돌린다", () => {
    searchParams = new URLSearchParams("step=nonsense");
    render(<OnboardingForm />);
    expect(
      screen.getByRole("heading", { name: /어떤 언어가 편한가요/ }),
    ).toBeInTheDocument();
  });

  it("선택하지 않으면 다음 버튼이 비활성화된다", () => {
    render(<OnboardingForm />);
    expect(screen.getByRole("button", { name: /다음/ })).toBeDisabled();
  });

  it("선택 후 다음을 누르면 URL 스텝을 갱신한다", async () => {
    const user = userEvent.setup();
    render(<OnboardingForm />);

    await user.click(screen.getByRole("button", { name: "한국어" }));
    await user.click(screen.getByRole("button", { name: /다음/ }));

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith(
        expect.stringContaining("step=nationality"),
      ),
    );
  });

  it("첫 스텝에서는 이전 버튼이 비활성화된다", () => {
    render(<OnboardingForm />);
    expect(screen.getByRole("button", { name: /이전/ })).toBeDisabled();
  });

  it("답변을 sessionStorage에 보존한다", async () => {
    const user = userEvent.setup();
    render(<OnboardingForm />);

    await user.click(screen.getByRole("button", { name: "한국어" }));

    await waitFor(() => {
      const saved = window.sessionStorage.getItem("visa-bugi-onboarding");
      expect(saved).toContain("ko");
    });
  });

  it("목표비자 스텝에서 현재 체류자격 기반 추천만 보여준다", async () => {
    searchParams = new URLSearchParams("step=targetVisa");
    window.sessionStorage.setItem(
      "visa-bugi-onboarding",
      JSON.stringify({ version: 2, values: { currentVisaCode: "E-9" } }),
    );
    render(<OnboardingForm />);

    expect(await screen.findByRole("button", { name: /E-7-4R/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^F-4-R/ })).not.toBeInTheDocument();
  });

  it("자동 판정이 아니라 참고용임을 고지한다", () => {
    render(<OnboardingForm />);
    expect(screen.getByText(/참고용/)).toBeInTheDocument();
  });

  it("미래 생년월일은 그 스텝에서 바로 막고 다음으로 넘기지 않는다", async () => {
    const user = userEvent.setup();
    searchParams = new URLSearchParams("step=birthdate");
    render(<OnboardingForm />);

    const input = screen.getByLabelText("생년월일");
    // `max` 속성이 있어도 프로그래matic 입력은 통과하므로 검증이 필요하다.
    await user.clear(input);
    await user.type(input, "2999-01-01");
    await user.click(screen.getByRole("button", { name: /다음/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /미래 날짜는 입력할 수 없습니다/,
    );
    expect(push).not.toHaveBeenCalled();
  });

  it("유효한 생년월일이면 다음 스텝으로 넘어간다", async () => {
    const user = userEvent.setup();
    searchParams = new URLSearchParams("step=birthdate");
    render(<OnboardingForm />);

    await user.clear(screen.getByLabelText("생년월일"));
    await user.type(screen.getByLabelText("생년월일"), "1998-04-12");
    await user.click(screen.getByRole("button", { name: /다음/ }));

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith(expect.stringContaining("step=currentVisa")),
    );
  });

  it("한국어능력 유형만 고르고 급수를 비우면 다음으로 넘기지 않는다", async () => {
    const user = userEvent.setup();
    searchParams = new URLSearchParams("step=koreanLevel");
    render(<OnboardingForm />);

    await user.click(screen.getByRole("button", { name: /TOPIK/ }));
    // 급수를 고르지 않은 상태
    expect(screen.getByRole("button", { name: /다음/ })).toBeDisabled();
    expect(push).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm run test`
Expected: FAIL — 기존 `onboarding-form.tsx`는 다른 구조라 대부분 실패

- [ ] **Step 3: 폼 컨테이너 재작성**

`features/onboarding/onboarding-form.tsx` 전체를 다음으로 교체한다:

```tsx
"use client";

import { useActionState, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { usePathname, useRouter } from "@/i18n/navigation";
import { localeNames, routing } from "@/i18n/routing";
import type { AddressSuggestion } from "@/lib/address/normalize";
import { saveOnboarding, type SaveOnboardingState } from "./actions";
import { CURRENT_VISA_OPTIONS, TARGET_VISA_CODES, type TargetVisaCode } from "./constants";
import {
  koreanLevelPairSchema,
  onboardingSubmissionSchema,
  pastDateSchema,
} from "./schema";
import { COMMON_STEP_IDS, getStepIndex, getStepSequence, type StepId } from "./steps";
import { AddressStep } from "./steps/address-step";
import { BirthdateStep } from "./steps/birthdate-step";
import { ChoiceStep } from "./steps/choice-step";
import { D2DetailStep } from "./steps/d2-detail-step";
import { KoreanLevelStep } from "./steps/korean-level-step";
import { recommendTargetVisas } from "./visa-recommendation";

const STORAGE_KEY = "visa-bugi-onboarding";
const STORAGE_VERSION = 2;

type FormValues = {
  locale: string | null;
  nationality: string | null;
  gender: string | null;
  birthdate: string;
  currentVisaCode: string | null;
  address: AddressSuggestion | null;
  koreanLevelType: string | null;
  koreanLevelValue: number | null;
  targetVisaCode: TargetVisaCode | null;
  educationLevel: string | null;
  e9E10H2ResidenceYears: number | null;
  migrationType: string | null;
  universityName: string;
  departmentName: string;
  academicStatus: string;
  programStartDate: string;
};

const EMPTY_VALUES: FormValues = {
  locale: null,
  nationality: null,
  gender: null,
  birthdate: "",
  currentVisaCode: null,
  address: null,
  koreanLevelType: null,
  koreanLevelValue: null,
  targetVisaCode: null,
  educationLevel: null,
  e9E10H2ResidenceYears: null,
  migrationType: null,
  universityName: "",
  departmentName: "",
  academicStatus: "",
  programStartDate: "",
};

const STEP_TITLES: Record<StepId, string> = {
  locale: "어떤 언어가 편한가요?",
  nationality: "국적을 선택해 주세요",
  gender: "성별을 선택해 주세요",
  birthdate: "생년월일이 어떻게 되나요?",
  currentVisa: "지금 가지고 계신 체류자격은 무엇인가요?",
  address: "어디에 살고 계신가요?",
  koreanLevel: "한국어능력 자격이 있으신가요?",
  targetVisa: "어떤 체류자격을 준비하고 계신가요?",
  f2rDetail: "국내 전문학사 이상 학위가 있으신가요?",
  e74rDetail: "최근 10년 내 E-9·E-10·H-2로 몇 년 체류하셨나요?",
  f4rDetail: "다음 중 어떤 상황에 가까우신가요?",
  d2Detail: "재학 정보를 알려주세요",
};

const STEP_DESCRIPTIONS: Record<StepId, string> = {
  locale: "화면에 표시할 언어를 선택해 주세요.",
  nationality: "맞춤 안내를 준비하는 데 사용합니다.",
  gender: "선택하지 않아도 다음 단계로 넘어갈 수 있습니다.",
  birthdate: "나이 요건 확인에 사용합니다.",
  currentVisa: "이 답변으로 준비 가능한 체류자격을 좁혀서 보여드립니다.",
  address: "지역특화형 비자는 인구감소지역 거주(희망)가 조건입니다.",
  koreanLevel: "TOPIK 급수나 사회통합프로그램 단계를 선택해 주세요.",
  targetVisa: "현재 체류자격을 기준으로 준비 가능한 자격만 보여드립니다.",
  f2rDetail: "학위 또는 생활임금 요건 중 하나를 충족하면 됩니다.",
  e74rDetail: "대략적인 기간이면 충분합니다.",
  f4rDetail: "이주 유형에 따라 필요한 서류가 달라집니다.",
  d2Detail: "광역형 비자 대상 학과인지 확인하는 데 사용합니다.",
};

const GENDER_OPTIONS = [
  { id: "female", label: "여성" },
  { id: "male", label: "남성" },
  { id: "unspecified", label: "선택하지 않음" },
];

const NATIONALITY_OPTIONS = [
  { id: "VN", label: "베트남" },
  { id: "UZ", label: "우즈베키스탄" },
  { id: "NP", label: "네팔" },
  { id: "KH", label: "캄보디아" },
  { id: "CN", label: "중국" },
  { id: "OT", label: "기타" },
];

const CURRENT_VISA_LABELS: Record<string, string> = {
  "D-2": "D-2 (유학)",
  "D-10": "D-10 (구직)",
  "E-9": "E-9 (비전문취업)",
  "E-10": "E-10 (선원취업)",
  "H-2": "H-2 (방문취업)",
  "F-4": "F-4 (재외동포)",
  OTHER: "다른 체류자격",
  UNKNOWN: "잘 모르겠어요",
};

const TARGET_VISA_LABELS: Record<TargetVisaCode, string> = {
  "F-2-R": "F-2-R (지역특화 우수인재)",
  "E-7-4R": "E-7-4R (지역특화 숙련기능인력)",
  "F-4-R": "F-4-R (지역특화 재외동포)",
  "D-2": "D-2 (충북 광역형 유학)",
};

const EDUCATION_OPTIONS = [
  { id: "ASSOCIATE_OR_ABOVE", label: "전문학사 이상 있음" },
  { id: "BELOW_ASSOCIATE", label: "없음" },
];

const RESIDENCE_YEAR_OPTIONS = [
  { id: "1", label: "1년 미만" },
  { id: "2", label: "2년 이상" },
  { id: "3", label: "3년 이상" },
  { id: "4", label: "4년 이상" },
];

const MIGRATION_TYPE_OPTIONS = [
  { id: "EXISTING_RESIDENT", label: "기존 거주자", description: "이미 인구감소지역에 2년 이상 거주" },
  { id: "DOMESTIC_TRANSFER", label: "국내 전입자", description: "국내 다른 지역에서 가족과 함께 이주" },
  { id: "OVERSEAS_TRANSFER", label: "해외 전입자", description: "해외에서 가족과 함께 이주" },
];

export function OnboardingForm() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [stepError, setStepError] = useState("");
  const [state, formAction, isPending] = useActionState<
    SaveOnboardingState,
    FormData
  >(saveOnboarding, { status: "idle" });

  // 새로고침·뒤로가기에도 답변이 남도록 sessionStorage에서 복원한다.
  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as { version?: number; values?: Partial<FormValues> };
      if (parsed.version !== STORAGE_VERSION || !parsed.values) return;
      setValues((current) => ({ ...current, ...parsed.values }));
    } catch {
      // 저장소를 못 읽어도 온보딩은 진행할 수 있어야 한다.
    }
  }, []);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: STORAGE_VERSION, values }),
      );
    } catch {
      // 저장 실패는 치명적이지 않다. 사용자는 계속 진행할 수 있다.
    }
  }, [values]);

  const sequence = useMemo(
    () => getStepSequence(values.targetVisaCode),
    [values.targetVisaCode],
  );
  const stepIndex = getStepIndex(sequence, searchParams.get("step") ?? "");
  const currentStep = sequence[stepIndex];
  const isLastStep = stepIndex === sequence.length - 1;
  const totalSteps = sequence.length;

  const goToStep = useCallback(
    (index: number) => {
      const next = sequence[index];
      if (!next) return;
      const params = new URLSearchParams(searchParams.toString());
      params.set("step", next);
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams, sequence],
  );

  function update<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setStepError("");
    setValues((current) => ({ ...current, [key]: value }));
  }

  /** 현재 스텝의 필드가 채워졌는지만 확인한다. 전체 검증은 제출 시 zod가 한다. */
  const isStepComplete = useMemo(() => {
    switch (currentStep) {
      case "locale":
        return values.locale !== null;
      case "nationality":
        return values.nationality !== null;
      case "gender":
        return values.gender !== null;
      case "birthdate":
        return values.birthdate !== "";
      case "currentVisa":
        return values.currentVisaCode !== null;
      case "address":
        return values.address !== null;
      case "koreanLevel":
        return (
          values.koreanLevelType === "NONE" ||
          (values.koreanLevelType !== null && values.koreanLevelValue !== null)
        );
      case "targetVisa":
        return values.targetVisaCode !== null;
      case "f2rDetail":
        return values.educationLevel !== null;
      case "e74rDetail":
        return values.e9E10H2ResidenceYears !== null;
      case "f4rDetail":
        return values.migrationType !== null;
      case "d2Detail":
        return (
          values.universityName.trim() !== "" &&
          values.departmentName.trim() !== "" &&
          values.academicStatus !== "" &&
          values.programStartDate !== ""
        );
      default:
        return false;
    }
  }, [currentStep, values]);

  const submissionPayload = useMemo(() => {
    const base = {
      locale: values.locale,
      gender: values.gender,
      birthdate: values.birthdate,
      nationality: values.nationality,
      currentVisaCode: values.currentVisaCode,
      addressRoad: values.address?.roadAddress,
      addressJibun: values.address?.jibunAddress,
      regionSigungu: values.address?.regionSigungu,
      lat: values.address?.lat,
      lng: values.address?.lng,
      koreanLevelType: values.koreanLevelType,
      koreanLevelValue: values.koreanLevelValue,
      targetVisaCode: values.targetVisaCode,
    };
    switch (values.targetVisaCode) {
      case "F-2-R":
        return { ...base, educationLevel: values.educationLevel };
      case "E-7-4R":
        return { ...base, e9E10H2ResidenceYears: values.e9E10H2ResidenceYears };
      case "F-4-R":
        return { ...base, migrationType: values.migrationType };
      case "D-2":
        return {
          ...base,
          universityName: values.universityName,
          departmentName: values.departmentName,
          academicStatus: values.academicStatus,
          programStartDate: values.programStartDate,
        };
      default:
        return base;
    }
  }, [values]);

  /**
   * 다음 스텝으로 넘어가기 전에 **현재 스텝의 필드만** 검증한다 (스펙 §8).
   * 전체 검증은 제출 시 zod가, 서버 재검증은 Server Action이 한 번 더 한다.
   * 값이 채워졌는지만 보는 `isStepComplete`와 달리 값의 유효성까지 본다.
   */
  function validateCurrentStep(): string | null {
    if (currentStep === "birthdate") {
      const result = pastDateSchema.safeParse(values.birthdate);
      return result.success ? null : (result.error.issues[0]?.message ?? null);
    }
    if (currentStep === "koreanLevel") {
      const result = koreanLevelPairSchema.safeParse({
        koreanLevelType: values.koreanLevelType,
        koreanLevelValue: values.koreanLevelValue,
      });
      return result.success ? null : (result.error.issues[0]?.message ?? null);
    }
    if (currentStep === "d2Detail") {
      const result = pastDateSchema.safeParse(values.programStartDate);
      return result.success ? null : (result.error.issues[0]?.message ?? null);
    }
    // 나머지 스텝은 고정 선택지라 값이 있으면 곧 유효하다.
    return null;
  }

  function handleNext() {
    if (!isStepComplete) return;
    const error = validateCurrentStep();
    if (error !== null) {
      setStepError(error);
      return;
    }
    setStepError("");
    goToStep(stepIndex + 1);
  }

  const targetVisaOptions = useMemo(() => {
    const recommended = values.currentVisaCode
      ? recommendTargetVisas(
          values.currentVisaCode as (typeof CURRENT_VISA_OPTIONS)[number],
        )
      : [...TARGET_VISA_CODES];
    return recommended.map((code) => ({ id: code, label: TARGET_VISA_LABELS[code] }));
  }, [values.currentVisaCode]);

  const canSubmit =
    isLastStep &&
    isStepComplete &&
    onboardingSubmissionSchema.safeParse(submissionPayload).success;

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-stretch">
      <aside className="rounded-[28px] bg-[#173f36] p-6 text-white sm:p-8 lg:flex lg:flex-col lg:justify-between lg:p-10">
        <div>
          <span className="inline-flex min-h-8 items-center rounded-full bg-white/12 px-3 text-xs font-bold text-[#d9eee5]">
            간단 설정 · 약 2분
          </span>
          <h1 className="mt-5 text-3xl font-black leading-tight tracking-[-0.05em] sm:text-4xl">
            나에게 맞는 안내를 준비할게요
          </h1>
          <p className="mt-4 text-sm leading-6 text-[#d1dfda] sm:text-base sm:leading-7">
            로그인 전에는 선택 결과를 현재 브라우저 세션 동안만 보관합니다. GPS 좌표와
            문서 이미지는 저장하지 않습니다.
          </p>
        </div>
        <div className="mt-8 rounded-2xl bg-white/10 p-4 text-sm leading-6 text-[#e1ede8]">
          <div className="flex items-center gap-2 font-extrabold text-white">
            <Icon name="shield" className="size-5" aria-hidden="true" />
            개인정보 최소 수집
          </div>
          <p className="mt-2">
            여기서 안내하는 내용은 <strong>참고용</strong>이며, 최종 자격 판정은 관할
            출입국·외국인관서에서 확인해야 합니다.
          </p>
        </div>
      </aside>

      <section
        className="flex min-h-[480px] flex-col rounded-[28px] border border-[#e0e7e2] bg-white p-5 shadow-[0_12px_36px_rgba(52,76,65,0.07)] sm:p-8 lg:p-10"
        aria-labelledby="question-title"
      >
        <div>
          <div className="flex items-center justify-between gap-4 text-xs font-extrabold text-[#6e7a75]">
            <span>
              {stepIndex + 1} / {totalSteps}
            </span>
            <span>{Math.round(((stepIndex + 1) / totalSteps) * 100)}%</span>
          </div>
          <div
            className="mt-2 h-2 overflow-hidden rounded-full bg-[#e8edea]"
            aria-hidden="true"
          >
            <div
              className="h-full rounded-full bg-[#2d6d5d] transition-[width]"
              style={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        <div className="mt-8">
          <p className="text-xs font-extrabold tracking-[0.08em] text-[#2d6d5d]">
            질문 {stepIndex + 1}
          </p>
          <h2
            id="question-title"
            tabIndex={-1}
            className="mt-2 text-2xl font-black leading-tight tracking-[-0.04em] focus-visible:rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2d6d5d] sm:text-3xl"
          >
            {STEP_TITLES[currentStep]}
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#6c7873] sm:text-base">
            {STEP_DESCRIPTIONS[currentStep]}
          </p>
        </div>

        <div className="mt-6">
          {currentStep === "locale" ? (
            <ChoiceStep
              legend={STEP_TITLES.locale}
              value={values.locale}
              onChange={(id) => update("locale", id)}
              options={routing.locales.map((code) => ({
                id: code,
                label: localeNames[code],
              }))}
            />
          ) : null}

          {currentStep === "nationality" ? (
            <ChoiceStep
              legend={STEP_TITLES.nationality}
              value={values.nationality}
              onChange={(id) => update("nationality", id)}
              options={NATIONALITY_OPTIONS}
            />
          ) : null}

          {currentStep === "gender" ? (
            <ChoiceStep
              legend={STEP_TITLES.gender}
              value={values.gender}
              onChange={(id) => update("gender", id)}
              options={GENDER_OPTIONS}
            />
          ) : null}

          {currentStep === "birthdate" ? (
            <BirthdateStep
              value={values.birthdate}
              onChange={(value) => update("birthdate", value)}
              error={stepError || undefined}
            />
          ) : null}

          {currentStep === "currentVisa" ? (
            <ChoiceStep
              legend={STEP_TITLES.currentVisa}
              value={values.currentVisaCode}
              onChange={(id) => {
                update("currentVisaCode", id);
                // 현재 체류자격이 바뀌면 이전에 고른 목표비자를 초기화한다.
                setValues((current) => ({ ...current, targetVisaCode: null }));
              }}
              options={CURRENT_VISA_OPTIONS.map((code) => ({
                id: code,
                label: CURRENT_VISA_LABELS[code],
              }))}
            />
          ) : null}

          {currentStep === "address" ? (
            <AddressStep
              value={values.address}
              onSelect={(suggestion) => update("address", suggestion)}
            />
          ) : null}

          {currentStep === "koreanLevel" ? (
            <KoreanLevelStep
              type={values.koreanLevelType}
              value={values.koreanLevelValue}
              onChange={(next) => {
                setStepError("");
                setValues((current) => ({
                  ...current,
                  koreanLevelType: next.type,
                  koreanLevelValue: next.value,
                }));
              }}
              error={stepError || undefined}
            />
          ) : null}

          {currentStep === "targetVisa" ? (
            <ChoiceStep
              legend={STEP_TITLES.targetVisa}
              value={values.targetVisaCode}
              onChange={(id) => update("targetVisaCode", id as TargetVisaCode)}
              options={targetVisaOptions}
            />
          ) : null}

          {currentStep === "f2rDetail" ? (
            <ChoiceStep
              legend={STEP_TITLES.f2rDetail}
              value={values.educationLevel}
              onChange={(id) => update("educationLevel", id)}
              options={EDUCATION_OPTIONS}
            />
          ) : null}

          {currentStep === "e74rDetail" ? (
            <ChoiceStep
              legend={STEP_TITLES.e74rDetail}
              value={
                values.e9E10H2ResidenceYears === null
                  ? null
                  : String(values.e9E10H2ResidenceYears)
              }
              onChange={(id) => update("e9E10H2ResidenceYears", Number(id))}
              options={RESIDENCE_YEAR_OPTIONS}
            />
          ) : null}

          {currentStep === "f4rDetail" ? (
            <ChoiceStep
              legend={STEP_TITLES.f4rDetail}
              value={values.migrationType}
              onChange={(id) => update("migrationType", id)}
              options={MIGRATION_TYPE_OPTIONS}
            />
          ) : null}

          {currentStep === "d2Detail" ? (
            <D2DetailStep
              values={{
                universityName: values.universityName,
                departmentName: values.departmentName,
                academicStatus: values.academicStatus,
                programStartDate: values.programStartDate,
              }}
              onChange={(next) =>
                setValues((current) => ({ ...current, ...next }))
              }
              errors={{}}
            />
          ) : null}
        </div>

        {stepError && currentStep !== "birthdate" && currentStep !== "koreanLevel" ? (
          <p
            role="alert"
            className="mt-5 rounded-xl bg-[#fff0ed] px-4 py-3 text-sm font-semibold leading-6 text-[#9f4038]"
          >
            {stepError}
          </p>
        ) : null}

        {state.status === "error" ? (
          <p
            role="alert"
            className="mt-5 rounded-xl bg-[#fff0ed] px-4 py-3 text-sm font-semibold leading-6 text-[#9f4038]"
          >
            {state.message}
          </p>
        ) : null}

        {state.status === "success" ? (
          <p
            role="status"
            className="mt-5 rounded-xl bg-[#e9f3ef] px-4 py-3 text-sm font-semibold leading-6 text-[#1f584a]"
          >
            설정이 저장되었습니다.
          </p>
        ) : null}

        <div className="mt-auto flex gap-3 pt-8">
          <button
            type="button"
            onClick={() => goToStep(stepIndex - 1)}
            disabled={stepIndex === 0}
            className="inline-flex min-h-12 items-center justify-center gap-1 rounded-2xl border border-[#dce3df] px-4 text-sm font-extrabold text-[#52615b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Icon name="chevron-left" className="size-4" aria-hidden="true" />
            이전
          </button>

          {isLastStep ? (
            <form action={formAction} className="flex-1">
              <input
                type="hidden"
                name="payload"
                value={JSON.stringify(submissionPayload)}
              />
              <button
                type="submit"
                disabled={!canSubmit || isPending}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#2d6d5d] px-5 text-sm font-extrabold text-white shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d] disabled:cursor-not-allowed disabled:bg-[#c7d1cc]"
              >
                {isPending ? "저장하는 중..." : "설정 완료"}
                <Icon name="check" className="size-4" aria-hidden="true" />
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              disabled={!isStepComplete}
              className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#2d6d5d] px-5 text-sm font-extrabold text-white shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d] disabled:cursor-not-allowed disabled:bg-[#c7d1cc]"
            >
              다음
              <Icon name="arrow-right" className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm run test`
Expected: PASS — OnboardingForm 테스트 13건 통과

일부 테스트가 `useActionState` 관련 오류로 실패하면, 테스트 파일 상단에 `vi.mock("react", ...)` 대신 실제 React 19의 `useActionState`를 그대로 쓰되 `saveOnboarding` 모킹만 유지한다 (이미 그렇게 작성되어 있다).

`stepError`는 `birthdate`·`koreanLevel` 스텝에서 각 스텝 컴포넌트의 `error` prop으로 전달되고, 그 외 스텝에서는 폼 하단 `role="alert"` 블록에 표시된다. "미래 생년월일" 테스트는 `BirthdateStep` 내부의 `role="alert"`를 찾는다.

- [ ] **Step 5: 페이지가 여전히 동작하는지 확인**

`app/[locale]/onboarding/page.tsx`는 `OnboardingForm`을 그대로 import 하므로 수정이 필요 없다. `useSearchParams`를 쓰는 클라이언트 컴포넌트는 Suspense 경계가 필요할 수 있으므로 페이지를 다음으로 교체한다:

```tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import { OnboardingForm } from "@/features/onboarding/onboarding-form";

export const metadata: Metadata = { title: "내 정보 설정" };

export default function OnboardingPage() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-[#6c7873]">불러오는 중...</p>}>
      <OnboardingForm />
    </Suspense>
  );
}
```

- [ ] **Step 6: lint·typecheck·build 확인**

Run: `npm run lint && npm run typecheck && npm run build`
Expected: 오류 없음

`useSearchParams` 관련 프리렌더 오류가 나면 Step 5의 Suspense 경계가 제대로 적용됐는지 확인한다.

- [ ] **Step 7: 커밋**

```bash
git add features/onboarding/onboarding-form.tsx features/onboarding/onboarding-form.test.tsx "app/[locale]/onboarding/page.tsx"
git commit -m "feat: 온보딩 폼을 URL 기반 퍼널로 재작성"
```

---

## Task 11: i18n 메시지 연결 + 최종 통합 검증

**Files:**
- Modify: `messages/ko.json`
- Modify: `messages/zh.json`, `messages/vi.json`, `messages/uz.json`, `messages/ne.json`, `messages/km.json`
- Modify: `features/onboarding/onboarding-form.tsx` (하드코딩 문구 → `useTranslations`)

**Interfaces:**
- Consumes: Task 10의 `OnboardingForm`
- Produces: `Onboarding` 네임스페이스 메시지

- [ ] **Step 1: ko.json에 Onboarding 네임스페이스 추가**

`messages/ko.json`의 최상위 객체에 다음 키를 추가한다 (기존 키는 유지):

```json
  "Onboarding": {
    "badge": "간단 설정 · 약 2분",
    "heroTitle": "나에게 맞는 안내를 준비할게요",
    "heroDescription": "로그인 전에는 선택 결과를 현재 브라우저 세션 동안만 보관합니다. GPS 좌표와 문서 이미지는 저장하지 않습니다.",
    "privacyTitle": "개인정보 최소 수집",
    "privacyNotice": "여기서 안내하는 내용은 참고용이며, 최종 자격 판정은 관할 출입국·외국인관서에서 확인해야 합니다.",
    "questionLabel": "질문 {index}",
    "previous": "이전",
    "next": "다음",
    "submit": "설정 완료",
    "submitting": "저장하는 중...",
    "saveSuccess": "설정이 저장되었습니다.",
    "addressLabel": "거주(희망) 주소",
    "addressPlaceholder": "도로명 또는 지번을 입력하세요",
    "addressEligible": "{region}는 지역특화형 비자 대상 지역입니다.",
    "addressNotEligible": "{region}는 지역특화형 비자(F-2-R·E-7-4R·F-4-R) 대상 지역이 아닙니다. 참고용 안내이며 최종 판정은 관할 출입국·외국인관서에서 확인해 주세요.",
    "searchResultCount": "검색 결과 {count}건",
    "searchNoResult": "검색 결과가 없습니다.",
    "searchError": "주소를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
    "loginRequired": "로그인 후 다시 시도해 주세요."
  }
```

- [ ] **Step 2: 나머지 5개 언어에 동일 키 복사**

`ko.json`의 `Onboarding` 블록을 `zh.json`, `vi.json`, `uz.json`, `ne.json`, `km.json`에 동일하게 복사한다. 기존 i18n 계획의 fallback 전략(번역 전에는 `ko` 원문 복사본 유지)을 따른다.

- [ ] **Step 3: 폼에서 하드코딩 문구를 번역 키로 교체**

`features/onboarding/onboarding-form.tsx`에 다음을 추가한다:

```tsx
import { useTranslations } from "next-intl";
```

컴포넌트 본문 최상단에 추가:

```tsx
  const t = useTranslations("Onboarding");
```

그리고 aside/버튼의 하드코딩 문구를 교체한다. 예:

```tsx
  {/* 변경 전 */}
  간단 설정 · 약 2분
  {/* 변경 후 */}
  {t("badge")}
```

```tsx
  {/* 변경 전 */}
  질문 {stepIndex + 1}
  {/* 변경 후 */}
  {t("questionLabel", { index: stepIndex + 1 })}
```

```tsx
  {/* 변경 전 */}
  {isPending ? "저장하는 중..." : "설정 완료"}
  {/* 변경 후 */}
  {isPending ? t("submitting") : t("submit")}
```

`이전`/`다음`/`설정이 저장되었습니다.`/hero 문구도 같은 방식으로 교체한다. 스텝 제목(`STEP_TITLES`)과 설명(`STEP_DESCRIPTIONS`)은 이번 태스크 범위 밖으로 두고 후속 번역 작업에서 다룬다 — 키가 12개씩이라 별도 PR로 나누는 편이 리뷰하기 쉽다.

- [ ] **Step 4: 테스트 갱신**

`onboarding-form.test.tsx` 상단에 next-intl 모킹을 추가한다:

```tsx
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) => {
    if (key === "questionLabel") return `질문 ${values?.index}`;
    const map: Record<string, string> = {
      badge: "간단 설정 · 약 2분",
      heroTitle: "나에게 맞는 안내를 준비할게요",
      heroDescription: "로그인 전에는 선택 결과를 현재 브라우저 세션 동안만 보관합니다.",
      privacyTitle: "개인정보 최소 수집",
      privacyNotice: "여기서 안내하는 내용은 참고용이며, 최종 자격 판정은 관할 출입국·외국인관서에서 확인해야 합니다.",
      previous: "이전",
      next: "다음",
      submit: "설정 완료",
      submitting: "저장하는 중...",
      saveSuccess: "설정이 저장되었습니다.",
    };
    return map[key] ?? key;
  },
}));
```

- [ ] **Step 5: 전체 테스트 통과 확인**

Run: `npm run test`
Expected: PASS — 전체 테스트 통과

- [ ] **Step 6: 전체 검증 루프 실행**

Run: `npm run lint && npm run typecheck && npm run test && npm run build`
Expected: 4개 명령 모두 오류 없음

- [ ] **Step 7: 브라우저 수동 확인**

Run: `npm run dev`

확인 항목:
1. `http://localhost:3000/ko/onboarding` 접속 → 언어 스텝이 보인다
2. 선택 후 다음 → URL이 `?step=nationality`로 바뀐다
3. 브라우저 뒤로가기 → 이전 스텝으로 돌아간다
4. 새로고침 → 답변이 유지된다
5. 주소 스텝에서 "내토로" 입력 → (Kakao 키가 있으면) 결과가 뜨고, 키가 없으면 안내 메시지가 뜨며 화면이 깨지지 않는다
6. 현재 체류자격을 `E-9`로 고르면 목표비자 스텝에 `E-7-4R`만 보인다
7. 키보드만으로 전체 퍼널을 통과할 수 있다 (Tab / Enter / 방향키)

- [ ] **Step 8: 커밋**

```bash
git add messages features/onboarding/onboarding-form.tsx features/onboarding/onboarding-form.test.tsx
git commit -m "feat: 온보딩 UI 문구를 next-intl 메시지로 연결"
```

---

## 후속 계획 (이 문서 범위 밖)

1. **3단계 "내 정보 입력하기"** — 스펙 §2.4의 서류검증 필드, 목표비자별 화면
2. **민감정보 처리** — 스펙 §6: E-7-4R 감점 계산(원본 미저장), F-4-R 결격사유(Y/N만 저장), 자동판정 고지
3. **요건 충족률(%) 계산** — visa-data의 `visa_requirement_criteria`/`scoring_items` 연동. F-2-R·D-2는 visa-data 추출 완료 후
4. **스텝 제목·설명 12종 다국어 번역** — 이번엔 UI 프레임 문구만 번역했다
5. **인증 흐름** — 현재 Server Action은 로그인된 사용자를 전제한다. 로그인/가입 화면과 sessionStorage → DB flush 트리거 연결 필요
6. **온보딩 이탈률 분석** — URL 스텝이 이미 준비되어 있으므로 분석 도구만 연결하면 된다

## Self-Review 결과

**스펙 커버리지:**

| 스펙 § | 대응 태스크 |
|---|---|
| §1 레포 경계 | Task 5 (스키마를 web 레포에 생성) |
| §2.1 공통 필드 | Task 3 (`commonAnswersSchema`), Task 10 (UI) |
| §2.2 추천 매핑 | Task 2 |
| §2.3 비자별 2단계 | Task 3 (`visaDetailSchema`), Task 4, Task 9, Task 10 |
| §2.4 3단계 | **범위 밖** — 후속 계획 1 |
| §3 하이브리드 스키마 | Task 5 |
| §4 Server Action / Route Handler | Task 6 (Route Handler), Task 8 (Server Action) |
| §5 URL 퍼널 | Task 4, Task 10 |
| §6 민감정보 | **범위 밖** — 후속 계획 2. 온보딩 1·2단계에는 민감정보 필드가 없음을 확인함 |
| §7 Kakao 주소 | Task 6, Task 7, Task 9 |
| §8 zod + RHF | Task 3 (zod 스키마), Task 10 (`validateCurrentStep`으로 스텝별 검증). **react-hook-form은 미도입** — 아래 편차 참조 |
| §9 폼 리라이트 | Task 10 |
| §11 테스트 계획 | Task 1~11 각 태스크의 테스트 |

**타입 일관성 확인:** `TargetVisaCode`(Task 2) → `schema.ts`(Task 3) → `steps.ts`(Task 4) → `database.types.ts`(Task 5) → `actions.ts`(Task 8) → `onboarding-form.tsx`(Task 10)에서 동일 이름·동일 값 사용. `AddressSuggestion`(Task 6) → `AddressSearchInput`(Task 7) → `AddressStep`(Task 9) → 폼(Task 10) 일관. `pastDateSchema`·`koreanLevelPairSchema`(Task 3) → `validateCurrentStep`(Task 10) 재사용.

**자체 검토에서 고친 결함 2건:**

1. **미사용 의존성** — 최초 작성 시 Task 3에서 `react-hook-form`·`@hookform/resolvers`를 설치하지만 어떤 태스크에서도 쓰지 않았다. 설치 목록에서 제거했다.
2. **스텝별 검증 누락** — 최초 작성한 `handleNext`는 마지막 스텝 분기가 죽은 코드였고(마지막 스텝은 별도 form submit 버튼이 처리), 그 결과 `stepError`를 설정하는 경로가 없어 "미래 생년월일" 같은 오류가 마지막 단계에 가서야 드러났다. 스펙 §8의 "다음 스텝 이동 전 현재 스텝 필드만 검증"과 어긋난다. `validateCurrentStep()`을 추가하고 회귀 테스트 3건을 붙였다.

**알려진 편차 (스펙 §8):** `react-hook-form`을 도입하지 않는다. 스텝당 입력 필드가 최대 4개(D-2)라 RHF의 폼 상태 관리 이점이 없고, 미사용 의존성을 남기지 않기 위함이다. 스텝별 검증은 zod 스키마 조각(`pastDateSchema`, `koreanLevelPairSchema`)을 직접 호출해 구현했으므로 §8이 요구한 검증 동작 자체는 충족한다. 필드가 10개 이상인 3단계 "내 정보 입력하기"에서 RHF 도입을 재검토한다.

**검증 한계 (정직한 고지):** Task 5의 SQL은 실행 중인 Supabase 인스턴스 없이는 실제로 적용해볼 수 없다. Task 8의 Server Action 테스트는 Supabase 클라이언트를 모킹하므로 **RLS 정책이 실제로 동작하는지는 검증하지 못한다**. RLS는 스테이징 환경에 마이그레이션을 적용한 뒤 다른 사용자 세션으로 타인의 행을 읽으려 시도해 별도로 확인해야 한다.
