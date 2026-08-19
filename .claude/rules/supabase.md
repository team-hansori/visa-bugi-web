---
paths:
  - "lib/supabase/**/*.{ts,tsx}"
  - "app/api/**/*.{ts,tsx}"
  - "app/**/*.{ts,tsx}"
---

# Supabase rules

- 브라우저에는 `NEXT_PUBLIC_SUPABASE_URL`과 공개 anon key만 노출할 수 있습니다.
- service role key와 관리자 작업은 서버 전용 코드에서만 사용합니다.
- 사용자 입력은 API 경계에서 검증하고, RLS 정책을 우회하는 코드를 클라이언트에 두지 않습니다.
- 마스터 비자 데이터는 임의 수정하지 않고 `visa-data` 검수·적재 흐름과 데이터 계약을 확인합니다.
- 인증·저장 기능을 추가할 때 개인정보 보존 범위와 삭제 경로를 함께 기록합니다.
