-- 이미 OCR 결과 저장 테이블을 적용한 환경에서도 PDF 분석 상태를 저장할 수 있게 한다.

alter table public.user_document_reviews
  drop constraint if exists user_document_reviews_source_kind_check;

alter table public.user_document_reviews
  add constraint user_document_reviews_source_kind_check
  check (source_kind in ('image', 'pdf', 'hwpx'));

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.user_document_reviews to authenticated;
