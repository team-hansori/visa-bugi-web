-- 챗봇 2층 저장 구조 (스펙 §8)
-- 1층: 대화 저장소 — 사용자 소유, 삭제 가능 (발화 원문 포함)
-- 2층: 운영 메타데이터 로그 — 영구, 비식별 (발화 원문 미포함)
-- 세 테이블 모두 RLS enable + 정책 없음(deny-all): 서버 전용 admin 클라이언트로만 접근한다.
-- 인증 도입 후 chat_sessions.user_id 컬럼과 본인 접근 정책을 추가한다.

create table if not exists chat_sessions (
  id uuid primary key default gen_random_uuid(),
  anon_key text unique not null,          -- httpOnly 쿠키의 세션 식별자
  locale text,
  created_at timestamptz not null default now()
);

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references chat_sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  kind text,                              -- assistant 메시지의 ChatResponseKind
  created_at timestamptz not null default now()
);

create table if not exists chat_turn_logs (
  id uuid primary key default gen_random_uuid(),
  session_hash text not null,             -- sha256(anon_key): 세션 삭제와 무관하게 유지
  route text not null,                    -- answer | escalation | out_of_scope | error
  risk_category text,
  tool_calls jsonb not null default '[]',
  row_ids jsonb not null default '[]',
  model text,
  latency_ms integer,
  verbatim_violation_count integer not null default 0,
  created_at timestamptz not null default now()
);

alter table chat_sessions enable row level security;
alter table chat_messages enable row level security;
alter table chat_turn_logs enable row level security;

create index if not exists idx_chat_messages_session on chat_messages (session_id, created_at);
create index if not exists idx_chat_turn_logs_created on chat_turn_logs (created_at);
