-- 홈의 비자별 잔여 인원 캐러셀이 검수된 공통 스키마 v2를 읽을 수 있게 한다.
-- RLS의 public read 정책은 공통 스키마 v2 마이그레이션에서 이미 적용되어 있다.

grant usage on schema public to anon, authenticated;
grant select on public.visa_quota_policies to anon, authenticated;
grant select on public.visa_quota_snapshots to anon, authenticated;
