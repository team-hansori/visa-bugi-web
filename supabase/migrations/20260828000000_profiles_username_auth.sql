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
