# 온보딩 질문 + User 스키마 설계

- 작성일: 2026-08-24
- 스코프 비자: F-2-R(지역특화 우수인재), E-7-4R(지역특화 숙련기능인력), F-4-R(지역특화 재외동포), D-2(유학, 광역형 포함)
- 근거 자료: `2026년 외국인정책지원사업내용 리플렛(웹용).pdf`(p.2-5, 7-8, 13), `visa-data/extraction/B_E-7-4R/*.csv`, `visa-data/extraction/D_visa_requirements/*.csv`, `visa-data/extraction/C_D-2-common/*.csv`
- 검증 환경: Next.js 16.3.1, React 19.2.8, @supabase/ssr 0.12.4, @supabase/supabase-js 2.112.3

## 1. 레포 경계 결정

`visa-data`는 마스터 데이터(비자 요건표·채점표·기관 연락처 — 모든 사용자에게 동일한 참조 데이터)만 소유한다. User 스키마(개인정보, 온보딩 답변, 진행상황)는 유저별 트랜잭션 데이터이므로 마스터 데이터가 아니다 — **user 스키마 정의와 Supabase 마이그레이션은 `visa-bugi-web`이 소유**한다.

두 레포는 코드가 아니라 값 집합으로만 연결된다: `target_visa_code` 같은 필드는 `visa-data`의 `visa_requirements.csv`에 있는 `visa_code` 값과 일치해야 하지만, `visa-data` 레포 안에 user 스키마 파일을 두지 않는다.

**현재 visa-data 진행 상태(2026-08-24 기준)**: F-2-R·D-2는 아직 전용 `extraction/` 폴더에 `visa_requirements`/`visa_requirement_criteria` 레벨의 구조화 데이터가 없다(D-2는 `C_D-2-common/`에 여러 비자가 공유하는 참조표만 존재). 따라서 F-2-R·D-2의 결정론적 자격판정 로직은 이 문서의 필드 설계와 별개로, visa-data 쪽 추출이 완료된 뒤 연결한다. 이 문서의 필드는 리플렛 원문 사실에 근거해 정의했다.

## 2. 질문 배치 원칙

1단계(온보딩, 로그인 화면 없이 진행) → 2단계(온보딩, 목표비자별 1~2문항) → 3단계("내 정보 입력하기", 서류검증이 필요한 나머지 전부).

**인증 방식(2026-08-24 결정):** 사용자에게 로그인 화면을 보여주지 않는다. 온보딩 진입 시 Supabase 익명 로그인(`signInAnonymously`)으로 조용히 세션을 발급하고, 답변은 이 익명 계정의 `user_id`로 즉시 저장한다. 탭을 닫아도, 같은 브라우저로 재방문해도 데이터가 유지된다. 사용자가 나중에 이메일·소셜 로그인으로 전환하면 Supabase의 계정 승격(link identity) 기능으로 같은 `user_id`가 그대로 유지되며 데이터 이관이 필요 없다. 이 결정으로 §10의 5번 항목(과거 sessionStorage-only 결정)을 대체한다.

원칙: **2개 이상의 비자에서 재사용되는 자격요건 + 기본 유저 정보만 온보딩**, 단일 비자에만 쓰이거나 서류 확인이 필요한 항목은 온보딩 밖으로 미룬다. 근거: progressive profiling 연구상 폼 필드 1개 추가마다 완료율이 3~5%씩 감소한다.

### 2.1 공통 필드 (1단계 — 모든 목표비자)

| 필드 | 질문 예시 | 근거 |
|---|---|---|
| `locale` | 어떤 언어가 편한가요? | 기존 데모 |
| `gender` | 성별을 선택해 주세요(선택) | 자격판정엔 미사용, 제품 결정으로 유지 |
| `birthdate` | 생년월일이 어떻게 되나요? | E-7-4R 점수제 나이구간(19~40+세, `scoring_items.csv` SCORE-031~034) |
| `nationality` | 국적을 선택해 주세요 | F-4-R 대상=외국국적동포(p.3), i18n |
| `current_visa_code` | 지금 가지고 계신 체류자격이 무엇인가요? | F-2-R 자격변경 제한목록(p.3), E-7-4R 본인요건①(p.3-4), F-4-R 대상 정의(p.3) |
| `address_*`, `region_sigungu`, `lat`/`lng` | 주소를 검색해 주세요(Kakao Local API) | 3개 지역특화형 비자 공통 사업대상="인구감소지역 거주(희망)"(p.3), D-2 광역형 대학 소재지 매칭 |
| `korean_level_type`, `korean_level_value` | 한국어능력 시험(TOPIK)이나 사회통합프로그램 단계가 있으신가요? | F-2-R(4급, p.3), E-7-4R(2급+점수제, p.3), D-2 30시간 특례(3급, p.7) |

### 2.2 현재 체류자격 → 목표비자 추천 매핑

| 현재 체류자격 | 추천 목표비자 |
|---|---|
| D-2, D-10 | F-2-R |
| E-9, E-10, H-2 | E-7-4R |
| 외국국적동포(F-4 등) | F-4-R |
| 그 외 / 잘 모르겠음 | 4개 모두 노출 |

근거: 리플렛 p.11 채용장려금 사업이 "D-2/D-10 유학생·구직자 → F-2-R 전환"을 명시. E-7-4R 본인요건①은 E-9/E-10/H-2 이력을 전제(p.3). F-4-R 대상은 외국국적동포(p.3).

### 2.3 비자별 온보딩 추가 필드 (2단계, 목표비자 선택 후 1~2문항)

| 목표비자 | 필드 | 질문 예시 | 근거 |
|---|---|---|---|
| F-2-R | `education_level` | 국내 전문학사 이상 학위가 있으신가요? | 요건①: 학위 또는 생활임금 중 택1(p.3) |
| E-7-4R | `e9_e10_h2_residence_years` | 최근 10년 내 E-9·E-10·H-2로 체류한 기간이 대략 몇 년인가요? | 본인요건①(p.3), 지역형(2년)/전국형(4년, 비수도권 특례 3년) 구분 근거 |
| F-4-R | `migration_type` | 다음 중 본인 상황에 가장 가까운 것은? (기존 거주자 / 국내 전입자 / 해외 전입자) | `visa_requirement_criteria.csv` G1 조건군(기존거주자/국내전입자/해외전입자, OR) |
| D-2 | `university_name`, `department_name`, `academic_status`, `program_start_date` | 재학 중인 대학·학과·과정(학년)·입국일이 어떻게 되나요? | 광역형 대상 대학·학과 목록(p.8), 시간제취업 학년구간표(p.13) |

`academic_status` enum: `LANGUAGE_COURSE`(어학연수) / `ASSOCIATE`(전문학사) / `BACHELOR_1_2` / `BACHELOR_3_4` / `GRADUATE`(석박사) — 리플렛 p.13 표와 1:1 매핑.

### 2.4 "내 정보 입력하기" (3단계, 서류검증 필요)

| 목표비자 | 필드 |
|---|---|
| F-2-R | `annual_income_krw`, `employment_months`, `employer_name`, `has_dependent_family`, `spouse_employment_plan`, `child_school_plan` |
| E-7-4R | `annual_income_krw`, `employment_months`, `employer_name`, `employer_industry`(뿌리산업/농림축산어업/일반제조업/건설업/내항여객운송), `recommendation_type`(중앙부처/광역지자체/없음), `has_employer_recommendation`, `current_job_tenure_years`, `population_decline_area_tenure_years`, `has_certificate_or_degree`, `has_driver_license`, **`penalty_total`(§6 참조 — 감점 총점만 저장)** |
| F-4-R | `has_accompanying_family`, `children_ages`, `children_school_status`, `residence_obligation_start_date`, **`is_disqualified`(§6 참조 — Y/N만 저장)** |
| D-2 | `parttime_work_intent`, `parttime_desired_industry`, `financial_capacity_method`, `graduation_expected_date`, `post_graduation_target_visa_interest`, `university_parttime_confirmation_status` |

## 3. Supabase 스키마 — 하이브리드(typed columns + JSONB)

### 3.1 설계 근거

초안에서 검토했던 EAV(`visa_specific_answers(user_id, field_key, field_value)`) 구조는 **폐기**한다. EAV는 PostgreSQL 커뮤니티에서 널리 문서화된 안티패턴으로, 필드 하나를 읽을 때마다 self-join이 발생해 미인덱스 쿼리에서 JSONB 대비 수십 배 느리다. 대시보드의 요건 충족률(%)은 사용자가 화면을 열 때마다 판정 필드 10개 이상을 동시에 읽으므로, EAV에서는 매번 join 10회 이상이 발생한다.

2026년 합의된 대안은 **하이브리드 모델**이다: 자주 조회·필터되는 핵심 속성은 typed column으로, 희귀하거나 가변적인 속성만 JSONB 컬럼에 담고 GIN 인덱스를 건다. 나중에 JSONB 키의 조회 빈도가 높아지면 [generated column](https://richyen.com/postgres/2026/05/11/generated_columns_jsonb.html)으로 승격시켜 스키마 마이그레이션 없이 컬럼처럼 인덱싱할 수 있다 — EAV로 얻으려 했던 유연성이 그대로 확보된다.

컬럼/JSONB 배치 기준:
- **typed column** — 2개 이상의 비자에서 재사용되거나, 범위 비교(`>=`)가 필요하거나, 판정 시 매번 읽는 필드
- **JSONB(`visa_details`)** — 단일 비자 전용이거나 값 존재 여부만 확인하는 필드

### 3.2 테이블

```sql
-- 계정당 1행. 온보딩 진입 시 발급되는 익명 세션의 user_id로 즉시 생성된다.
create table profiles (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  locale      text not null,
  gender      text,                 -- 'male' | 'female' | 'unspecified' (선택 입력)
  birthdate   date,
  nationality text,                 -- ISO 3166-1 alpha-2
  created_at  timestamptz not null default now()
);

-- 계정당 1행. 판정에 쓰이는 값은 typed, 비자 전용 값은 visa_details JSONB.
create table user_visa_profile (
  user_id uuid primary key references auth.users(id) on delete cascade,

  -- 목표/현재 비자
  current_visa_code text,
  target_visa_code  text,           -- 'F-2-R' | 'E-7-4R' | 'F-4-R' | 'D-2'

  -- 공통 판정 필드 (2개 이상 비자에서 재사용)
  korean_level_type  text,          -- 'TOPIK' | 'KIIP' | 'NONE'
  korean_level_value smallint,      -- 급수/단계 숫자 (범위 비교용)
  address_road   text,
  address_jibun  text,
  region_sigungu text,              -- '제천시' 등 — 인구감소지역 판정
  lat double precision,
  lng double precision,
  annual_income_krw integer,        -- F-2-R 생활임금(30,539,916), E-7-4R 2,600만원
  employment_months smallint,       -- F-2-R 12개월, E-7-4R 24개월 계약
  education_level   text,           -- F-2-R 요건①, E-7-4R 가점

  -- 비자 전용·희귀 필드
  visa_details jsonb not null default '{}'::jsonb,

  updated_at timestamptz not null default now()
);

create index on user_visa_profile (region_sigungu);
create index on user_visa_profile (target_visa_code);
create index on user_visa_profile using gin (visa_details jsonb_path_ops);
```

`visa_details`에 들어가는 값 예시:
- F-4-R: `{"migration_type": "EXISTING_RESIDENT", "has_accompanying_family": true, "is_disqualified": false}`
- D-2: `{"university_name": "충북대학교", "department_name": "융합소프트웨어학과", "academic_status": "BACHELOR_3_4", "program_start_date": "2025-03-02"}`
- E-7-4R: `{"e9_e10_h2_residence_years": 3, "employer_industry": "ROOT", "recommendation_type": "PROVINCIAL", "penalty_total": 5}`

### 3.3 RLS

세 테이블 모두 RLS를 켜고 `auth.uid() = user_id` 정책을 건다. Supabase RLS는 default-deny이므로 정책을 켜고 아무것도 추가하지 않으면 0행이 반환된다.

`SUPABASE_SERVICE_ROLE_KEY`는 RLS를 우회하므로 클라이언트 코드에 절대 노출하지 않는다(`NEXT_PUBLIC_` 금지). 온보딩 플로우에는 service role이 필요 없다 — 사용자 본인 데이터만 쓰므로 세션 기반 anon 키 + RLS로 충분하다.

## 4. 데이터 흐름 — Server Action + Route Handler

Next.js 16 공식 가이드(`node_modules/next/dist/docs/01-app/02-guides/forms.md`)와 커뮤니티 BP 기준: **사람이 UI에서 트리거하는 mutation은 Server Action, 기계가 호출하거나 캐시 가능한 GET은 Route Handler**.

| 대상 | 방식 | 이유 |
|---|---|---|
| 온보딩 답변 저장 | **Server Action** + `useActionState` | 사람이 트리거하는 mutation. JS 비활성 시에도 form POST로 동작(progressive enhancement) |
| Kakao 주소 검색 | **Route Handler** `app/api/address/search/route.ts` | 외부 API 프록시, 캐시 가능한 GET, REST 키 은닉 |

Next.js 문서의 경고를 그대로 따른다:

> Always verify authentication and authorization **inside each Server Action**, even if the form is only rendered on an authenticated page.

즉 Server Action 내부에서 (1) 세션 확인, (2) zod 재검증을 반드시 수행한다. 클라이언트 검증만 신뢰하면 조작된 payload가 그대로 DB에 들어간다.

## 5. 온보딩 퍼널 — 토스 퍼널 패턴, 라이브러리 미도입

온보딩은 목표비자에 따라 2단계 질문이 갈리는 **분기 퍼널**이다. 토스가 공개한 [퍼널 패턴](https://toss.tech/article/use-funnel-1)이 정확히 이 문제를 다룬다("페이지 흐름이 흩어져 있어 가입 플로우 파악에 여러 파일을 넘나들어야 한다").

다만 **`@use-funnel` 라이브러리는 도입하지 않는다.** npm 레지스트리 확인 결과(2026-08-24):
- `@use-funnel/next` = **0.0.23** (pre-1.0), 최종 수정 2026-04-09
- peerDependencies = `next: ">=12", react: ">=16.8"` — React 19 / Next 16 명시 없음
- 공식 문서·GitHub README에 App Router(`next/navigation`) 지원이 명확히 서술돼 있지 않음(`@use-funnel/next`는 역사적으로 Pages Router의 `next/router` 기반)

공모전 일정이 있는 프로젝트에서 pre-1.0 + App Router 지원 불확실 라이브러리는 리스크가 크다. **패턴만 채택하고 URL searchParam으로 자체 구현**한다:

```
/{locale}/onboarding?step=visa&target=E-7-4R
```

URL 기반의 이점:
- 뒤로가기·새로고침·링크 공유가 그대로 동작
- 이탈 지점이 URL에 남아 **퍼널 이탈률 분석이 가능** — 온보딩의 핵심 KPI이며 `useState`로는 측정 불가
- 의존성 0개

## 6. 민감정보 처리 — 결과만 저장, 원본 폐기

### 6.1 대상 확인

`visa-data` 전수 검색 결과, 감점·결격 성격의 항목은 두 비자에만 존재한다.

| 비자 | 항목 | 성격 | 출처 |
|---|---|---|---|
| **E-7-4R** | 벌금 300만원 미만의 형 / 체납으로 체류허가 제한 / 출입국관리법 위반 행정처분 | 범죄경력·행정처분 이력 | `extraction/B_E-7-4R/scoring_items.csv` SCORE-0511~0533 |
| **F-4-R** | "결핵, 마약중독 등 공중위생에 직접적 위해를 끼칠 우려" 결격사유 | **건강정보** | `extraction/D_visa_requirements/visa_requirement_criteria.csv` |
| F-2-R | 없음 | — | — |
| D-2 | 없음 | — | — |

점수표(`scoring_items.csv`)는 `extraction/B_E-7-4R/`에만 존재하며, 리플렛 p.3도 E-7-4R 칸에만 "※ E-7-4 점수제 적용"을 명시한다.

E-7-4R 감점 구조: 기본항목 300점(소득 120 + 한국어 120 + 나이 60) + 가점 − 감점 ≥ 200점. 감점은 항목별 상한(벌금 20 / 체납 15 / 출입국 15), 전체 합산 상한 50점, 신청일 기준 10년 이내 건만 적용.

### 6.2 법적 근거

- 개인정보보호법 제23조는 **건강**에 관한 정보를 민감정보로 **명시적으로 열거**한다 → F-4-R 결격사유가 직접 해당.
- 범죄경력에 관한 정보도 민감정보로 분류될 소지가 크다 → E-7-4R 감점 항목.
- **2026년 9월 11일 시행** 개정법(법률 제21445호, 2026-03-10 공포)은 **자동화된 결정 과정에서 민감정보를 처리할 경우 그 목적과 처리 항목을 구체적으로 공개할 의무**를 부과한다. 본 서비스의 요건 충족률(%) 자동 계산은 자동화된 결정에 해당할 소지가 있다.
- 외국인등록번호는 고유식별정보이므로 **어떤 경우에도 수집하지 않는다**. OCR 화면에서도 마스킹 대상으로 명시한다.

> 이 항목은 공개 법령 정보에 근거한 개발자 관점의 리스크 지적이다. 실제 서비스 런칭 전에는 법무 검토를 받는다.

### 6.3 처리 방식

두 항목 모두 **판정에 필요한 것은 결과값 하나뿐**이므로, 원본 이력을 서버에 저장하지 않는다.

```
E-7-4R:  사용자 입력("벌금 1회, 체납 0회, 위반 0회")
         → 클라이언트에서 감점 계산(−5)
         → visa_details.penalty_total = 5 만 저장
         → 원본 횟수는 폐기

F-4-R:   사용자 입력(결격사유 해당 여부)
         → visa_details.is_disqualified = false 만 저장
         → 어떤 사유인지는 수집·저장하지 않음
```

**§4의 서버 재검증 원칙과의 관계**: 감점 원본 횟수는 서버에 전송되지 않으므로 서버가 감점 계산을 재현할 수 없다. 이는 의도된 트레이드오프다 — Server Action은 `penalty_total`에 대해 **범위 검증만** 수행한다(0~50 정수, 항목별 상한 합계 이내). 조작 시 영향이 신고자 본인의 참고용 점수 표시에 한정되고 공식 판정에는 쓰이지 않으므로(§6.3 자동판정 고지) 허용 가능한 위험으로 판단한다. 다른 모든 필드는 §4대로 서버에서 zod 전체 재검증을 수행한다.

**질문 문구 설계**: F-4-R 결격사유는 "결핵이 있으신가요?"처럼 병명을 특정해 묻지 않는다. "아래 결격사유 중 해당하는 항목이 있나요? (예 / 아니오)" 형태로 묻고, 상세 사유는 안내 텍스트로만 보여준다 — 그러면 서비스는 해당 여부만 알 뿐 개인의 병명을 알지 못한다.

**트레이드오프**: 원본 미저장 시 사용자가 재방문할 때 해당 항목을 다시 입력해야 한다. 공모전 단계에서는 안전성을 우선하고, 실서비스 전환 시 별도 동의 절차와 함께 재검토한다.

**자동판정 고지**: 요건 충족률 결과 화면에는 "참고용이며 최종 판정은 관할 출입국·외국인관서" 고지를 상시 노출한다. `AGENTS.md`의 "LLM 응답을 최종 판정으로 사용하지 않는다" 원칙과 같은 방향이다.

## 7. 주소 자동완성 (Kakao Local API)

- 서버: `app/api/address/search/route.ts`(Route Handler)에서 `GET /v2/local/search/address.json`을 프록시. 키는 서버 전용 환경변수 `KAKAO_REST_API_KEY`(`NEXT_PUBLIC_` 아님)로 관리.
- 클라이언트: `AddressSearchInput`이 입력값을 debounce(300ms)해 위 라우트를 호출하고 결과를 인라인 드롭다운으로 렌더링.
- 선택 시 도로명주소·지번주소·`region_sigungu`·위경도를 저장. 위경도는 이후 [지도 탭]의 "주변 기관 거리순 조회"에서 그대로 재사용한다(별도 지오코딩 불필요).
- 지도 SDK도 Kakao Maps로 통일하면 벤더 키 하나로 주소검색+지도핀을 모두 해결한다(브레인스토밍 원문의 "지도 SDK는 하나만 정해 사용" 원칙과 일치).
- 선택 후 `region_sigungu`가 인구감소지역(제천·보은·옥천·영동·괴산·단양)이 아니면 안내 메시지를 노출한다.

## 8. 폼 검증 — zod + react-hook-form

현재 `package.json`에 폼/검증 라이브러리가 없다. 2026 멀티스텝 폼 BP에 따라 도입한다:

- **스텝별 zod 스키마**를 정의하고 전체 스키마로 compose
- 다음 스텝 이동 전 **현재 스텝 필드만** 검증(전체 검증 아님)
- 동일 zod 스키마를 **Server Action에서 재사용**해 클라이언트 검증 우회를 차단
- 검증 타이밍: blur + submit, 실행 가능한 오류 메시지 제공

## 9. 온보딩 폼 리라이트 범위

`features/onboarding/onboarding-form.tsx`는 데모 초안이므로 재작성한다:

1. 질문 순서: locale → nationality → gender → birthdate → current_visa_code → address(Kakao 검색) → korean_level → (추천 기반) target_visa_code 선택 → 비자별 1~2문항(§2.3)
2. 스텝 상태는 URL searchParam(§5)
3. 저장: 온보딩 진입 시 익명 세션을 발급하고, 각 스텝 통과 직후 Server Action으로 `profiles` + `user_visa_profile`에 바로 반영한다(§2 인증 방식). 로그인 여부에 따른 분기가 없으므로 "설정 완료" 버튼이 로그인 미완료로 실패하는 경로 자체가 없다.
4. 접근성: 기존 `questionHeadingRef` 포커스 이동, `aria-pressed` 패턴 유지. `AddressSearchInput` 드롭다운은 키보드 탐색 가능해야 하고 결과 개수를 `aria-live`로 알린다. 진행률 표시("3 / 8")는 유지 — 이탈률 감소 효과가 확인된 패턴이다.

## 10. 후속 조치 / 알려진 제약

1. 기존 데모의 지역 선택지(청주시/충주시/진천군/음성군)는 실제 지역특화형 비자 대상 인구감소지역(제천·보은·옥천·영동·괴산·단양)과 다르다 — 주소 자동완성 전환으로 해소되며, §7의 지역 검증 안내로 보완한다.
2. F-2-R은 리플렛 문의처 표(p.5) 기준 옥천군에만 담당부서가 있고 나머지 5개 인구감소지역은 "-"로 비어 있다. 지역별 신청 가능 비자가 다를 수 있으므로 추천서 발급 로직 설계 시 반영한다(이 스펙 범위 밖).
3. F-2-R·D-2의 결정론적 자격판정은 visa-data 구조화 데이터가 아직 없어 이번 스코프에서는 필드 수집까지만 다루고, 충족률(%) 계산은 visa-data 확장 이후로 미룬다.
4. E-7-4(전국형, K-point)는 이번 스코프 밖이지만 `e9_e10_h2_residence_years`가 지역형(2년)/전국형(4년) 구분 근거를 담고 있어 나중에 추가해도 스키마 변경이 필요 없다.
5. **(결정 변경, 2026-08-24)** 당초 온보딩은 sessionStorage만 쓰고 로그인 완료 시점에 DB로 flush하는 방식으로 설계했으나, 이러면 탭을 닫는 순간 데이터가 사라져 "로그인 없이도 서비스를 계속 이용"할 수 없다는 문제가 있었다. Supabase 익명 로그인(`signInAnonymously`)으로 대체한다 — §2의 "인증 방식" 참조. 익명 계정은 정식 로그인과 동일하게 `auth.users`에 실제 행을 가지므로 §3의 RLS 정책·Server Action은 변경 없이 그대로 재사용된다.
6. 익명 계정이 방치되면 `auth.users`에 누적된다("orphan user"). 이번 스코프에서는 정리 정책을 다루지 않고 후속 과제로 남긴다. 실제 이메일·소셜 로그인 화면과 "익명 → 정식 계정 전환" 플로우도 이번 스코프 밖이다(마이페이지 설계 시 다룬다). Supabase 대시보드에서 Anonymous sign-ins를 활성화하는 설정 작업이 별도로 필요하다.

## 11. 테스트 계획

- `current_visa_code → target_visa_code` 추천 매핑: 순수 함수로 분리해 단위 테스트(§2.2의 4개 케이스 + 미해당 케이스)
- E-7-4R 감점 계산: 순수 함수 단위 테스트(항목별 상한 20/15/15, 전체 상한 50 경계값 포함)
- zod 스키마: 스텝별 유효/무효 입력 테스트, Server Action 재검증 경로 테스트
- 온보딩 저장 플로우: Supabase 클라이언트 모킹 후 `profiles`/`user_visa_profile` upsert 통합 테스트, RLS 정책 검증
- `AddressSearchInput`: Kakao 응답 모킹 + debounce 동작, 키보드 탐색 접근성 확인
- **민감정보 미저장 검증**: E-7-4R 원본 횟수·F-4-R 결격 사유가 DB payload에 포함되지 않음을 명시적으로 assert
- 변경 후 `npm run lint`, `npm run typecheck`, `npm run build` 실행(AGENTS.md 규칙) + 브라우저에서 온보딩 전체 흐름 수동 확인

## 12. 참고 자료

- [Entity-attribute-value (EAV) design in PostgreSQL - don't do it!](https://www.cybertec-postgresql.com/en/entity-attribute-value-eav-design-in-postgresql-dont-do-it/)
- [PostgreSQL JSONB vs. EAV](https://www.razsamuel.com/postgresql-jsonb-vs-eav-dynamic-data/)
- [Making JSONB More Queryable with Generated Columns](https://richyen.com/postgres/2026/05/11/generated_columns_jsonb.html)
- [Server Actions vs Route Handlers: When to Use Each in Next.js](https://makerkit.dev/blog/tutorials/server-actions-vs-route-handlers)
- [@use-funnel 개발기 #1 (토스 기술블로그)](https://toss.tech/article/use-funnel-1)
- [Row Level Security in Supabase: Complete Guide for Next.js with @supabase/ssr (2026)](https://blog.starmorph.com/blog/row-level-security-supabase-tables-nextjs)
- [React Hook Form + Zod Complete Guide (2026)](https://stacknotice.com/blog/react-hook-form-zod-guide-2026)
- [개인정보 보호법 제23조 민감정보 처리 제한](https://www.law.go.kr/lsLawLinkInfo.do?chrClsCd=010202&lsJoLnkSeq=1000575255)
- [2026년 개정 개인정보 보호법 안내](https://datalaw.kr/guides/pipa-2026-amendment/)
- [Kakao Local REST API 문서](https://developers.kakao.com/docs/latest/ko/local/dev-guide)
