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

## Supabase 적용

1. 공통 스키마 v2의 `document_requirements` 테이블을 먼저 적용한다.
2. `supabase/migrations/20260826000000_ocr_review_results.sql`을 적용한다.
3. Supabase Dashboard의 Authentication 설정에서 Anonymous sign-ins를 활성화한다.
4. Vercel Preview/Production에 `NEXT_PUBLIC_SUPABASE_URL`과 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`를 설정한다.

온보딩 PR #16이 사용하는 익명 사용자와 같은 `auth.users.id`를 사용한다. RLS는 모든 읽기·쓰기·삭제를 `auth.uid() = user_id`인 행으로 제한한다.

## 화면 동작

- 실제 OCR 결과에서만 `이 결과 저장` 버튼을 활성화한다.
- 같은 사용자가 같은 문서를 다시 저장하면 최신 결과로 갱신한다.
- 메인 화면은 저장된 결과가 있으면 데모 68% 대신 항목 상태 기반 작성 진행률과 최대 3개의 다음 할 일을 표시한다.
- Supabase가 없거나 저장 테이블이 적용되지 않은 환경에서는 기존 데모 화면을 유지한다.
