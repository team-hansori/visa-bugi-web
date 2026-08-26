# OCR 결과 저장

## 저장 범위

`user_document_reviews`에는 메인 화면의 진행률과 다음 할 일을 계산하는 데 필요한 최소 상태만 저장한다.

- 문서 요건 ID(검수된 Supabase v2 문서일 때만)
- 문서 제목, 비자 코드, OCR 템플릿 키
- 항목별 `complete` / `review` / `missing` / `manual` / `optional` 상태
- 항목별 OCR 신뢰도
- 상태별 개수, 사진 품질, 경고 코드, 갱신 시각

다음 정보는 저장하지 않는다.

- 업로드한 사진 또는 HWPX 원본
- 파일명과 Storage 경로
- OCR로 읽은 이름, 주소, 식별번호 등의 실제 값(`rawValue`)

클라이언트는 저장 API를 호출하기 전에 `rawValue`를 제거하고, 서버도 허용한 상태 필드만 다시 검증해 저장한다.

## 테이블 계약

테이블명은 `public.user_document_reviews`이며 사용자와 문서별로 한 행만 유지한다.
같은 문서를 다시 저장하면 `(user_id, document_key)` 충돌을 기준으로 최신 결과를
upsert한다.

| 컬럼 | 형식 | 용도 |
| --- | --- | --- |
| `review_id` | `uuid` PK | 저장 결과 ID |
| `user_id` | `uuid` FK → `auth.users.id` | 익명 또는 로그인 사용자 |
| `document_key` | `text` | 사용자 안에서 동일 문서를 식별하는 키 |
| `document_requirement_id` | `uuid` nullable FK | 공통 스키마 v2 문서 요건 ID |
| `template_key` | `text` | OCR 필드 템플릿 키 |
| `visa_code` | `text` | `COMMON`, `F-2-R` 등의 비자 코드 |
| `document_title` | `text` | 화면과 다음 할 일에 표시할 문서명 |
| `source_kind` | `text` | `image` 또는 `hwpx` |
| `review_status` | `text` | `READY`, `NEEDS_REVIEW`, `INCOMPLETE` |
| `page_number` | `integer` nullable | 분석한 페이지 번호 |
| `image_quality` | `text` | `clear`, `blurred`, `cropped`, `glare`, `unknown` |
| `complete_count` | `integer` | 인식 완료 개수 |
| `review_count` | `integer` | 재확인 필요 개수 |
| `missing_count` | `integer` | 미작성 개수 |
| `manual_count` | `integer` | 직접 확인·작성 개수 |
| `field_statuses` | `jsonb` array | 개인정보를 제외한 항목별 상태 |
| `warning_codes` | `jsonb` array | 문서 불일치·사진 품질 등의 경고 코드 |
| `created_at` | `timestamptz` | 최초 저장 시각 |
| `updated_at` | `timestamptz` | 마지막 저장 시각 |

`field_statuses`에는 다음 형태만 저장한다.

```json
[
  {
    "fieldIdentifier": "full_name",
    "status": "complete",
    "confidence": 0.97,
    "required": true
  },
  {
    "fieldIdentifier": "signature",
    "status": "manual",
    "confidence": 0,
    "required": true
  }
]
```

`rawValue`, 이름, 주소, 식별번호, 파일명, 원본 파일 경로는 이 행에 포함하지 않는다.
현재 저장 API와 DB 제약조건은 `required: true`이면서 `status: "missing"`인 항목이
하나라도 있으면 저장을 거절한다. 서명처럼 OCR이 읽지 않는 `manual` 필수 항목은
사용자가 원본에서 직접 확인해야 하므로 저장 차단 대상에서 제외한다.

`review_status`는 다음과 같이 계산한다.

- 미작성 항목이 있으면 `INCOMPLETE`
- 재확인 또는 직접 확인 항목이 있으면 `NEEDS_REVIEW`
- 나머지는 `READY`

현재 UI/API에서는 필수 미작성 결과의 저장을 막으므로 새로 저장되는 행은 일반적으로
`READY` 또는 `NEEDS_REVIEW`가 된다. `INCOMPLETE`는 기존 데이터와 향후 정책 변경을
고려해 스키마에 유지한다.

## Supabase 적용

1. 공통 스키마 v2의 `document_requirements` 테이블을 먼저 적용한다.
2. `supabase/migrations/20260826000000_ocr_review_results.sql`을 적용한다.
3. Supabase Dashboard의 Authentication 설정에서 Anonymous sign-ins를 활성화한다.
4. Vercel Preview/Production에 `NEXT_PUBLIC_SUPABASE_URL`과 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`를 설정한다.

온보딩 PR #16이 사용하는 익명 사용자와 같은 `auth.users.id`를 사용한다. RLS는 모든 읽기·쓰기·삭제를 `auth.uid() = user_id`인 행으로 제한한다.

## 화면 동작

- 실제 OCR 결과에서만 `이 결과 저장` 버튼을 활성화한다.
- 필수 미작성 항목이 있으면 저장 버튼을 비활성화하고 API와 DB에서도 저장을 거절한다.
- 같은 사용자가 같은 문서를 다시 저장하면 최신 결과로 갱신한다.
- 메인 화면은 저장된 결과가 있으면 데모 68% 대신 항목 상태 기반 작성 진행률과 최대 3개의 다음 할 일을 표시한다.
- Supabase가 없거나 저장 테이블이 적용되지 않은 환경에서는 기존 데모 화면을 유지한다.
