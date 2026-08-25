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
  -- TOPIK·사회통합프로그램(KIIP)을 동시에 가진 사용자가 있을 수 있어
  -- 서로 독립된 컬럼으로 둔다(단일 유형 enum이 아님).
  topik_level    smallint,
  kiip_level     smallint,
  address_road   text,
  address_jibun  text,
  region_sigungu text,
  lat            double precision,
  lng            double precision,

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
  constraint user_visa_profile_topik_level_check
    check (topik_level is null or (topik_level between 1 and 6)),
  constraint user_visa_profile_kiip_level_check
    check (kiip_level is null or (kiip_level between 1 and 6))
);

create index if not exists user_visa_profile_region_sigungu_idx
  on public.user_visa_profile (region_sigungu);
create index if not exists user_visa_profile_target_visa_code_idx
  on public.user_visa_profile (target_visa_code);
create index if not exists user_visa_profile_visa_details_idx
  on public.user_visa_profile using gin (visa_details jsonb_path_ops);

-- RLS: 본인 행만 읽기·쓰기 가능. Supabase RLS는 default-deny다.
-- 익명 로그인 사용자도 auth.users에 실제 행을 가지므로 이 정책이 그대로 적용된다.
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
