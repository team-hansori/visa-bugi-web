-- OCR 검토 결과만 저장한다. 원본 사진/HWPX와 인식된 실제 값(raw value)은 저장하지 않는다.
-- user_id는 온보딩 PR #16의 익명 로그인/정식 로그인 세션과 동일하게 auth.users를 기준으로 한다.

create table if not exists public.user_document_reviews (
  review_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_key text not null,
  document_requirement_id uuid references public.document_requirements(document_requirement_id) on delete set null,
  template_key text not null,
  visa_code text not null,
  document_title text not null,
  source_kind text not null,
  review_status text not null,
  page_number integer,
  image_quality text not null,
  complete_count integer not null default 0,
  review_count integer not null default 0,
  missing_count integer not null default 0,
  manual_count integer not null default 0,
  field_statuses jsonb not null default '[]'::jsonb,
  warning_codes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint user_document_reviews_user_document_key_unique unique (user_id, document_key),
  constraint user_document_reviews_document_key_length check (char_length(document_key) between 1 and 300),
  constraint user_document_reviews_template_key_length check (char_length(template_key) between 1 and 120),
  constraint user_document_reviews_visa_code_length check (char_length(visa_code) between 1 and 30),
  constraint user_document_reviews_document_title_length check (char_length(document_title) between 1 and 200),
  constraint user_document_reviews_source_kind_check check (source_kind in ('image', 'hwpx')),
  constraint user_document_reviews_review_status_check check (review_status in ('READY', 'NEEDS_REVIEW', 'INCOMPLETE')),
  constraint user_document_reviews_image_quality_check check (image_quality in ('clear', 'blurred', 'cropped', 'glare', 'unknown')),
  constraint user_document_reviews_counts_nonnegative check (
    complete_count >= 0 and review_count >= 0 and missing_count >= 0 and manual_count >= 0
  ),
  constraint user_document_reviews_field_statuses_array check (jsonb_typeof(field_statuses) = 'array'),
  constraint user_document_reviews_no_required_missing check (
    not jsonb_path_exists(
      field_statuses,
      '$[*] ? (@.required == true && @.status == "missing")'
    )
  ),
  constraint user_document_reviews_warning_codes_array check (jsonb_typeof(warning_codes) = 'array')
);

create index if not exists user_document_reviews_user_updated_idx
  on public.user_document_reviews (user_id, updated_at desc);
create index if not exists user_document_reviews_requirement_idx
  on public.user_document_reviews (document_requirement_id)
  where document_requirement_id is not null;

alter table public.user_document_reviews enable row level security;

create policy user_document_reviews_select_own on public.user_document_reviews
  for select using ((select auth.uid()) = user_id);
create policy user_document_reviews_insert_own on public.user_document_reviews
  for insert with check ((select auth.uid()) = user_id);
create policy user_document_reviews_update_own on public.user_document_reviews
  for update using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy user_document_reviews_delete_own on public.user_document_reviews
  for delete using ((select auth.uid()) = user_id);
