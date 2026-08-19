@AGENTS.md

# Claude 작업 메모

작업을 시작할 때 먼저 `AGENTS.md`를 읽고, 그 지침을 이 파일보다 우선 적용합니다.

특히 다음을 지킵니다.

- `visa-data`와 `visa-bugi-web`의 책임 범위를 섞지 않습니다.
- 개인정보·API 키·Supabase service role key를 커밋하지 않습니다.
- 기능을 추가한 뒤 lint, typecheck, build를 실행합니다.
- 작업 결과에는 변경 파일, 검증 결과, 후속 작업을 간단히 남깁니다.
