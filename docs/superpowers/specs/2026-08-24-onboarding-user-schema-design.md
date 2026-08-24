# 온보딩 질문 + User 스키마 설계

- 작성일: 2026-08-24
- 스코프 비자: F-2-R(지역특화 우수인재), E-7-4R(지역특화 숙련기능인력), F-4-R(지역특화 재외동포), D-2(유학, 광역형 포함)
- 근거 자료: `2026년 외국인정책지원사업내용 리플렛(웹용).pdf`(p.2-4, 7-8, 13), `visa-data/extraction/B_E-7-4R/*.csv`, `visa-data/extraction/D_visa_requirements/*.csv`, `visa-data/extraction/C_D-2-common/*.csv`

## 1. 레포 경계 결정

`visa-data`는 마스터 데이터(비자 요건표·채점표·기관 연락처 — 모든 사용자에게 동일한 참조 데이터)만 소유한다. User 스키마(개인정보, 온보딩 답변, 진행상황)는 유저별 트랜잭션 데이터이므로 마스터 데이터가 아니다 — **user 스키마 정의와 Supabase 마이그레이션은 `visa-bugi-web`이 소유**한다.

두 레포는 코드가 아니라 값 집합으로만 연결된다: `target_visa_code` 같은 필드는 `visa-data`의 `visa_requirements.csv`에 있는 `visa_code` 값과 일치해야 하지만, `visa-data` 레포 안에 user 스키마 파일을 두지 않는다.

**현재 visa-data 진행 상태(2026-08-24 기준)**: F-2-R·D-2는 아직 전용 `extraction/` 폴더에 `visa_requirements`/`visa_requirement_criteria` 레벨의 구조화 데이터가 없다(D-2는 `C_D-2-common/`에 여러 비자가 공유하는 참조표만 존재). 따라서 F-2-R·D-2의 결정론적 자격판정 로직은 이 문서의 필드 설계와 별개로, visa-data 쪽 추출이 완료된 뒤 연결한다. 이 문서의 필드는 리플렛 원문 사실에 근거해 정의했다.

## 2. 질문 배치 원칙

1단계(온보딩, 로그인 불필요) → 2단계(온보딩, 목표비자별 1~2문항) → 3단계(로그인 후 "내 정보 입력하기", 서류검증이 필요한 나머지 전부). 원칙: **2개 이상의 비자에서 재사용되는 자격요건 + 기본 유저 정보만 온보딩**, 단일 비자에만 쓰이거나 서류 확인이 필요한 항목은 온보딩 밖으로 미룬다.

### 2.1 공통 필드 (1단계 — 모든 목표비자)

| 필드 | 질문 예시 | 근거 |
|---|---|---|
| `locale` | 어떤 언어가 편한가요? | 기존 데모 |
| `gender` | 성별을 선택해 주세요(선택) | 자격판정엔 미사용, 제품 결정으로 유지 |
| `birthdate` | 생년월일이 어떻게 되나요? | E-7-4R 점수제 나이구간(19~40+세, `scoring_items.csv` SCORE-031~034) |
| `nationality` | 국적을 선택해 주세요 | F-4-R 대상=외국국적동포(p.3), i18n |
| `current_visa_code` | 지금 가지고 계신 체류자격이 무엇인가요? | F-2-R 자격변경 제한목록(p.3), E-7-4R·E-7-4 본인요건①(p.3-4), F-4-R 대상 정의(p.3) |
| `address` (도로명/지번/lat/lng) | 주소를 검색해 주세요(Kakao Local API) | 3개 지역특화형 비자 공통 사업대상="인구감소지역 거주(희망)"(p.3), D-2 광역형 대학 소재지 매칭 |
| `korean_level_type`, `korean_level_value` | 한국어능력 시험(TOPIK)이나 사회통합프로그램 단계가 있으신가요? | F-2-R(4급, p.3), E-7-4R·E-7-4(2급+점수제, p.3-4), D-2 30시간 특례(3급, p.7) |

### 2.2 현재 체류자격 → 목표비자 추천 매핑

| 현재 체류자격 | 추천 목표비자 |
|---|---|
| D-2, D-10 | F-2-R |
| E-9, E-10, H-2 | E-7-4R |
| 외국국적동포(F-4 등) | F-4-R |
| 그 외 / 잘 모르겠음 | 4개 모두 노출 |

근거: `visa-data/extraction/D_visa_requirements` p.11 채용장려금 사업이 "D-2/D-10 유학생·구직자 → F-2-R 전환"을 명시. E-7-4R 본인요건①은 E-9/E-10/H-2 이력을 전제(p.3-4). F-4-R 대상은 외국국적동포(p.3).

### 2.3 비자별 온보딩 추가 필드 (2단계, 목표비자 선택 후 1~2문항)

| 목표비자 | 필드 | 질문 예시 | 근거 |
|---|---|---|---|
| F-2-R | `has_associate_degree_or_above` | 국내 전문학사 이상 학위가 있으신가요? | 요건①: 학위 또는 생활임금 중 택1(p.3) |
| E-7-4R | `e9_e10_h2_residence_years` | 최근 10년 내 E-9·E-10·H-2로 체류한 기간이 대략 몇 년인가요? | 본인요건①(p.3-4), 지역형(2년)/전국형(4년, 비수도권 특례 3년) 구분 근거 |
| F-4-R | `migration_type` | 다음 중 본인 상황에 가장 가까운 것은? (기존 거주자 / 국내 전입자 / 해외 전입자) | `visa_requirement_criteria.csv` G1 조건군(기존거주자/국내전입자/해외전입자, OR) |
| D-2 | `university_name`, `department_name`, `academic_status`, `program_start_date` | 재학 중인 대학·학과·과정(학년)·입국일이 어떻게 되나요? | 광역형 대상 대학·학과 목록(p.8), 시간제취업 학년구간표(p.13) |

`academic_status` enum: `LANGUAGE_COURSE`(어학연수) / `ASSOCIATE`(전문학사) / `BACHELOR_1_2` / `BACHELOR_3_4` / `GRADUATE`(석박사) — p.13 표와 1:1 매핑.

### 2.4 로그인 후 "내 정보 입력하기" (3단계, 서류검증 필요)

| 목표비자 | 필드 |
|---|---|
| F-2-R | `employer_name`, `annual_income_krw`, `employment_contract_months`, `has_dependent_family`, `spouse_employment_plan`, `child_school_plan` |
| E-7-4R | `employer_name`, `employer_industry`(부리산업/농림축산어업/일반제조업/건설업/내항여객운송), `annual_income_krw`, `employment_contract_years`, `recommendation_type`(중앙부처/광역지자체/없음), `employer_recommendation`, `current_job_tenure_years`, `population_decline_area_tenure_years`, `has_certificate_or_degree`, `has_driver_license`, `fine_count_under_3m`, `tax_delinquency_count`, `immigration_violation_count` |
| F-4-R | `has_accompanying_family`, `children_ages`, `children_school_status`, `residence_obligation_start_date` |
| D-2 | `parttime_work_intent`, `parttime_desired_industry`, `financial_capacity_method`, `graduation_expected_date`, `post_graduation_target_visa_interest`, `university_parttime_confirmation_status` |

## 3. Supabase 스키마

```sql
-- 계정당 1행, 로그인(회원가입) 완료 시점에만 생성. 그 전까지는 sessionStorage에만 보관.
create table profiles (
  user_id uuid primary key references auth.users(id),
  locale text not null,
  gender text,                    -- 'male' | 'female' | 'unspecified', 선택 입력
  birthdate date,
  nationality text,               -- ISO 3166-1 alpha-2
  created_at timestamptz not null default now()
);

-- 계정당 1행. 여러 비자 판정에서 재사용되는 값.
create table user_visa_profile (
  user_id uuid primary key references auth.users(id),
  current_visa_code text,
  target_visa_code text,          -- 'F-2-R' | 'E-7-4R' | 'F-4-R' | 'D-2'
  address_road text,
  address_jibun text,
  lat double precision,
  lng double precision,
  korean_level_type text,         -- 'TOPIK' | 'KIIP' | 'NONE'
  korean_level_value text,
  updated_at timestamptz not null default now()
);

-- 비자별 특화 답변(온보딩 2단계 + 로그인 후 3단계 전부). EAV 구조.
create table visa_specific_answers (
  user_id uuid references auth.users(id),
  target_visa_code text not null,
  field_key text not null,        -- 2.3/2.4 표의 필드명
  field_value jsonb not null,
  answer_stage text not null,     -- 'onboarding' | 'profile_detail'
  updated_at timestamptz not null default now(),
  primary key (user_id, target_visa_code, field_key)
);
```

`visa_specific_answers`를 컬럼 고정 테이블이 아닌 key-value로 둔 이유: 4개 비자가 서로 다른 필드셋을 쓰고, visa-data가 F-2-R·D-2 스키마를 계속 확장 중이라 필드가 늘어나는 것을 감안했다. 관계형 컬럼 대비 쿼리는 다소 복잡해지지만(비자별 필드 목록을 애플리케이션 레벨에서 관리), 스키마 마이그레이션 없이 필드 추가가 가능하다는 이득이 더 크다고 판단.

Row Level Security: 세 테이블 모두 `auth.uid() = user_id` 조건으로 본인만 읽기/쓰기 가능하도록 RLS 정책을 건다(AGENTS.md 개인정보 보호 원칙).

## 4. 주소 자동완성 (Kakao Local API)

- 서버: `app/api/address/search/route.ts`(Route Handler)에서 Kakao REST 키로 `GET /v2/local/search/address.json`을 프록시. 키는 서버 전용 환경변수(`KAKAO_REST_API_KEY`, `NEXT_PUBLIC_` 아님)로 관리해 클라이언트에 노출하지 않는다.
- 클라이언트: `AddressSearchInput` 컴포넌트가 입력값을 debounce(예: 300ms)해 위 라우트를 호출하고, 결과를 인라인 드롭다운으로 렌더링. 선택 시 도로명주소·지번주소·위경도를 `user_visa_profile`에 저장.
- 위경도는 이후 [지도 탭]의 "주변 기관 거리순 조회"에서 그대로 재사용한다(별도 지오코딩 불필요).
- 지도 SDK도 추후 Kakao Maps로 통일하면(브레인스토밍 원문의 "지도 SDK는 하나만 정해 사용" 원칙과 일치) 벤더 키 하나로 주소검색+지도핀을 모두 해결.

## 5. 온보딩 폼 리라이트 범위

`features/onboarding/onboarding-form.tsx`는 데모 초안이므로 아래 구조로 재작성한다:

1. 질문 순서: locale → nationality → gender → birthdate → current_visa_code → address(Kakao 검색) → korean_level → (current_visa_code 기반 추천 후) target_visa_code 선택 → 비자별 1~2문항(2.3)
2. 저장 시점: 로그인 여부와 무관하게 온보딩은 먼저 진행하되, 답변은 계정 생성/로그인이 확인되는 시점에 `profiles` + `user_visa_profile` + `visa_specific_answers`(stage='onboarding')로 flush한다. 그 전까지는 지금처럼 `sessionStorage`.
3. 접근성: 기존 `questionHeadingRef` 포커스 이동, `aria-pressed` 패턴 유지. `AddressSearchInput`의 드롭다운은 키보드 탐색 가능해야 하고 결과 개수를 `aria-live`로 알려야 한다.

## 6. 발견된 이슈 / 후속 조치

1. 기존 데모의 지역 선택지(청주시/충주시/진천군/음성군)는 실제 지역특화형 비자 대상 인구감소지역(제천·보은·옥천·영동·괴산·단양)과 다르다 — 주소 자동완성으로 전환하며 자연히 해소되지만, 온보딩 결과 화면에서 "선택한 주소가 인구감소지역이 아님"을 알려주는 검증 로직이 필요하다.
2. F-2-R은 옥천군에만 담당부서가 있고 나머지 5개 인구감소지역은 리플렛 문의처 표(p.5)에 "-"로 비어 있다 — 지역별로 신청 가능한 비자가 다를 수 있으므로, 주소 확정 후 "이 지역은 F-2-R 추천서 발급 부서가 없습니다" 같은 안내가 필요할 수 있다(구현 범위는 이 스펙 밖, 추천서 발급 로직 설계 시 반영).
3. F-2-R·D-2의 결정론적 자격판정은 visa-data 쪽 구조화 데이터가 아직 없어 이번 스코프에서는 온보딩 필드 수집까지만 다루고, 충족률(%) 계산 로직은 visa-data 확장 이후로 미룬다.
4. E-7-4(전국형, K-point)는 이번 스코프(F-2-R/E-7-4R/F-4-R/D-2) 밖이지만, `e9_e10_h2_residence_years` 필드가 지역형(2년)/전국형(4년) 구분 근거를 이미 담고 있어 나중에 추가해도 스키마 변경이 필요 없다.

## 7. 테스트 계획

- `current_visa_code → target_visa_code 추천` 매핑 함수: 순수 함수로 분리해 단위 테스트(표 2.2의 4개 케이스 + 미해당 케이스)
- 온보딩 저장 플로우: Supabase 클라이언트를 모킹해 `profiles`/`user_visa_profile`/`visa_specific_answers` insert 통합 테스트
- `AddressSearchInput`: Kakao 응답 모킹 + debounce 동작 테스트, 키보드 탐색 접근성 확인
- 변경 후 `npm run lint`, `npm run typecheck`, `npm run build` 실행(AGENTS.md 규칙), 브라우저에서 온보딩 전체 흐름 수동 확인
