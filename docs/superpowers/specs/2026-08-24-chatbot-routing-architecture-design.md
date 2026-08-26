# 비자부기 챗봇 라우팅 아키텍처 설계

- 작성일: 2026-08-24
- 상태: 설계 확정 (아키텍처 리뷰 보고서의 결정 사항 반영)
- 관련 브랜치: `taeeunni/feat-rag-hybrid-chatbot`
- 근거 조사: 아키텍처 리뷰 아티팩트 "비자부기 챗봇 아키텍처 리뷰" (2026-08-24, 판정: Adopt with Changes)

## 1. 목적과 판정

RDB(Supabase에 적재된 visa-data 정규화 테이블)를 Source of Truth로 두고, 사용자 질문을
지원 범위로 분류해 **DB 기반 답변**과 **외부 기관 안내**를 분리하는 명시적 라우팅 챗봇을 만든다.

핵심 원칙: **LLM은 "무엇을 물었는가"를 결정하고, "무엇을 답할 것인가"는 DB가 결정한다.**

- 문서 청킹 RAG·Vector DB·멀티에이전트·에이전트 프레임워크는 도입하지 않는다.
- 분류(자연어 이해)는 LLM이, 분류 이후의 모든 실행(쿼리·템플릿·조인)은 결정론적 코드가 담당한다.
- 우선순위: Correctness > Reliability > Observability > Maintainability > Latency/Cost > Sophistication.

## 2. MVP 범위

**포함**

- 정규화 테이블 기반 질의응답: `visa_requirements`, `visa_requirement_criteria`,
  `visa_process_stages`, `document_requirements`, `visa_quota_status`
- 위험 신호 감지 및 `risk_routing_table` 기반 escalation (선제 개입)
- `agency_contacts` 기반 스코프 내 기관 안내
- 다국어 응답(사용자 언어 생성 + 한국어 원문 병기)
- 멀티턴 대화(세션 내 이력 전달), 2층 로깅

**제외 (인터페이스만 예약)**

- `search_admin_guide` tool: `admin_guide_corpus`가 아직 미구축이므로 1차에서 구현하지 않는다.
  tool 목록에 자리만 설계해 두고, 코퍼스 데이터가 visa-data 검수를 거쳐 Supabase에 적재된 뒤
  Supabase 내부 검색(FTS → 필요 시 pgvector)으로 추가한다. 별도 Vector DB 인프라(FAISS 등)는 쓰지 않는다.
- escalation 메시지 검증 번역 테이블(`risk_routing_message_i18n` 류): i18n 전략 확정 후 별도 작업.

## 3. 요청 처리 흐름 (3-Stage)

```
사용자 질문 (다국어)
  │
  ▼
Stage 1 — 상시 위험·범위 스크리닝 (경량 LLM, 매 턴 무조건 1회)
  · 구조화 출력(고정 enum): risk_category | user_type | region | visa_code | in_scope 여부
  · 위험 카테고리 감지 시 → risk_routing_table 결정론 조회
      - resolution_type=EXTERNAL → external_* 필드 그대로 안내
      - resolution_type=IN_DOMAIN → region × target_agency_category로 agency_contacts 조인
      - escalation_message_template 기반 응답 (LLM은 번역·톤 조정만)
  │ (위험 아님)
  ▼
Stage 2 — 응답 LLM + typed tools (Vercel AI SDK v6, AI Gateway)
  · get_visa_requirements(visa_code)
  · get_requirement_criteria(visa_code)        — 판정 로직(AND/OR, value_numeric/operator)은 SQL/코드가 수행
  · get_process_stages(visa_code, notice_round?)
  · get_document_requirements(stage_id)
  · get_quota_status(visa_code)
  · find_agency(region, category_major?, category_minor?, target_audience?)
  · [예약] search_admin_guide(query)
  각 tool = 파라미터화된 Supabase 쿼리. 자유 SQL 금지. valid_from/valid_to 필터 내장.
  │
  ▼
Stage 3 — Grounded 응답 생성
  · 반환 행만 근거로 생성, source_document·last_verified_at 인용
  · 빈 결과 → "보유 정보 없음" 선언 + find_agency로 스코프 내 기관 안내
  · 그래도 해당 없음 → 정직한 범위 밖 선언 + 범용 접점 1곳
```

Stage 1을 tool 선택에 맡기지 않고 별도 상시 호출로 두는 이유: 위험 감지는 visa-data
reference/README.md가 명시한 "선제 개입" 정책이므로, 응답 LLM의 tool 선택 재량에 맡기면
recall을 보장할 수도 측정할 수도 없다. 고정 분류 호출이어야 출시 게이트로 관리된다.

## 4. 기관 라우팅: 폴백 사다리

위에서 아래로 첫 매칭에서 정지한다.

1. **위험 신호 + `risk_routing_table` 행 존재** → escalation 템플릿.
   `risk_routing_table`은 스코프 *밖* 위험 상황(노동청·근로복지공단·다누리콜센터 등
   범용 공공기관 소관) 전용 오버라이드다.
2. **RDB로 답변 가능** → Stage 2 tool 조회 + grounded 생성.
3. **답변 불가하지만 스코프 내 기관 소관** → `find_agency`로 `agency_contacts`
   (97행, category_major: FOREIGN_EMPLOYMENT_SUPPORT / FOREIGN_RESIDENT_SETTLEMENT /
   STUDENT_WORK_STUDY_LINKAGE) 조회. `is_user_facing=true` 행만 노출. 유학생 문의도 여기서 커버.
4. **어디에도 없음** → 정직한 "범위 밖" 선언 + 범용 접점 1곳 안내.
   범용 접점은 `agency_contacts`의 해당 지역 `FOREIGN_SUPPORT_CENTER` 행, 없으면 광역
   단위(충청북도) 행을 사용한다. 테이블에 없는 기관·연락처를 만들어내지 않는다.

**확정 정책 — 미검증 user_type의 위험 신호** (2026-08-24): 위험 카테고리는 감지됐지만
해당 user_type으로 검증된 risk 행이 없는 경우(예: 유학생의 임금체불 호소), 같은
keyword_category의 행을 재사용하되 검증 한계를 응답에 명시한다
(예: "이 안내는 이주노동자 기준으로 확인된 정보입니다"). 병행으로 visa-data 팀에
해당 user_type 행 검증·추가를 요청한다.

## 5. 데이터 계약 (코드가 강제해야 하는 시맨틱)

- **Verbatim 원칙**: 전화번호·기관명·URL·주소·수치·날짜는 테이블 값 문자열 그대로 출력한다.
  LLM이 생성·변형하지 않는다. (근거: 임금체불=1350 vs 고용센터=043-230-6700 구분이
  notes에 문서화된 함정) 다국어 응답에서도 한국어 원문을 병기한다.
- `valid_from`/`valid_to`: 모든 조회에 현재 시점 유효성 필터를 내장한다.
- `external_region_scope`: NULL(관할 미확인)과 `NATIONWIDE`(전국 확인됨)를 구분한다.
  NULL을 "지역 제한 없음"으로 해석하지 않는다.
- 자격 판정: `visa_requirement_criteria`의 불리언 로직(그룹 없는 행 AND + 같은
  condition_group 내 OR)은 결정론적으로 평가한다. LLM 응답을 최종 판정으로 쓰지 않는다
  (AGENTS.md 원칙). MVP에서는 판정 자동화보다 조건 조회·설명이 우선이며, 판정 기능을 넣을
  경우 반드시 코드 평가로 한다.
- 마스터 데이터는 조회만 한다. 웹 레포에서 임의 수정하지 않는다.

## 6. 다국어 정책

- 응답은 UI locale(또는 사용자 입력 언어)로 LLM이 생성한다.
- 기관명·연락처·주소·URL은 한국어 원문 verbatim + 번역 병기
  (예: "고용노동부 고객상담센터 (Ministry of Employment and Labor call center), ☎ 1350").
- escalation 템플릿은 한국어 원문을 의미 보존 번역하되, 수치·연락처는 그대로 둔다.
  검증 번역 테이블이 생기면 그것으로 대체한다.

## 7. 안전 경계

- **DB에 없는 정보**: LLM 자체 지식으로 보충하지 않는다. 시스템 프롬프트 정책 +
  응답은 반환 행 근거로만 + 빈 결과 시 명시적 "정보 없음" 경로.
- **Ambiguous**: 슬롯(visa_code·region·user_type) 부족 시 명확화 질문 1회. 추측 조회 금지.
- **Multi-intent**: 위험 카테고리가 항상 우선(선제 개입), 나머지는 순차 처리.
- **분류 저신뢰/실패**: 보수적으로 범위 밖 처리. 위험 판단 임계는 recall 우선
  (오탐은 기관 안내가 덧붙을 뿐, 미탐은 정책 실패).
- **프롬프트 인젝션**: 자유 SQL 없음, tool 파라미터 스키마 검증(zod), 사용자 텍스트를
  명령으로 취급하지 않는 시스템 프롬프트.
- **장애 폴백**: LLM/DB 장애 시 정적 안내 메시지 + 핵심 기관 연락처. 환경변수 없이도
  빌드·정적 화면이 동작해야 한다(AGENTS.md).

## 8. 로깅과 개인정보 (2층 구조)

1. **대화 저장소 — 사용자 소유, 삭제 가능**: `chat_sessions` / `chat_messages`.
   RLS로 본인만 접근. 개인화(이전 상담 맥락, 추적 중인 비자 연동)에 사용.
   사용자의 대화 삭제 → 발화 원문 즉시 하드 삭제(ON DELETE CASCADE). 회원 탈퇴 시 연쇄 삭제.
   삭제 버튼은 실제 동작을 연결한다.
2. **운영 메타데이터 로그 — 영구, 비식별**: 턴별 라우팅 결정·위험 카테고리·tool 호출·
   반환 행 ID·latency·모델/프롬프트 버전만 저장. **발화 원문 미포함.** 사용자 삭제와
   무관하게 지표·회귀 평가가 유지된다. 원문 기반 디버깅은 1층이 살아있는 동안만 가능
   — 사용자 삭제권의 대가로 수용한다.

## 9. 기술 스택

- Next.js App Router: `app/api/chat/route.ts` (서버 전용 — 키·프롬프트는 클라이언트에 노출 금지)
- Vercel AI SDK v6 + AI Gateway: `"provider/model"` 문자열. Stage 1은 경량 모델,
  Stage 2/3은 상위 모델. 스트리밍 응답(Node.js 런타임 기본).
- Supabase: 데이터 조회(파라미터화 쿼리), 대화 저장소(RLS), 운영 로그.
- UI: `app/[locale]/chat` 페이지 + `features/chat/` 컴포넌트 (기존 화면 패턴과 동일 배치).
- 프레임워크(LangChain/LangGraph 등)·별도 Vector DB 미사용.

## 10. 평가와 출시 게이트

**Golden test set** — 데이터가 이미 가진 함정을 그대로 케이스로 만든다:

- In-domain: 테이블별 대표 질문 + 다국어 변형
- Out-of-domain / 법률 자문 요구
- Ambiguous(visa_code·지역 미지정), Multi-intent(정보 요청+위험 호소 혼합)
- Adversarial: "네가 아는 대로 말해줘", 프롬프트 인젝션, hallucination 유도
- DB 정보 없음(미커버 비자유형·user_type)
- 유사-상이 기관: 청주 vs 충주 관할, 노동청 vs 고용센터, 완곡한 위험 표현
  ("월급이 몇 달째 안 들어와요")

**지표**: risk recall(최우선) · routing accuracy · groundedness(근거 없는 문장 비율) ·
refusal correctness · 연락처 verbatim 일치율(문자열 비교로 자동 검증) · latency/cost.

**출시 게이트** (성격상 0이어야 하는 것만 수치로 못박는다):

- golden set에서 위험 미탐 0건
- 연락처 verbatim 불일치 0건 (결정론 경로이므로 0이 아니면 구현 버그)
- 나머지 지표는 측정 후 베이스라인 설정 (근거 없는 목표치를 만들지 않는다)

평가 실행은 스크립트 기반으로 시작하고(golden set → API 호출 → 채점), CI에서 프롬프트
변경 시 회귀 실행한다.

## 11. 비범위·후속 작업

- `admin_guide_corpus` 구축(visa-data/chungbuk-sari 소관)과 `search_admin_guide` 구현
- 검증 번역 테이블 기반 escalation 다국어화
- 자격 자동 판정 UI(criteria 불리언 평가) — 챗봇과 별개 기능으로 검토
- risk_routing_table의 STUDENT 등 user_type 행 검증·추가 (visa-data 팀 요청)
- Supabase 적재 스키마 확정은 visa-data 팀과 데이터 계약 확인 후 진행 (AGENTS.md 원칙)
