@../CLAUDE.md

# Claude Code project configuration

이 디렉터리의 `agents/`, `commands/`, `rules/`, `skills/`는 팀이 함께 사용하는
Claude Code 보조 설정입니다. 작업 전에 루트 `AGENTS.md`와 `CLAUDE.md`의 지침을
확인하고, 이 프로젝트의 범위를 넘어 `visa-data`를 임의로 수정하지 않습니다.

- 코드 변경 전 현재 브랜치와 변경 범위를 확인합니다.
- 비자 요건·기관 정보는 공식 출처와 데이터 계약을 확인합니다.
- 작업 완료 후 `npm run lint`, `npm run typecheck`, `npm run build`를 실행합니다.
- 개인 권한·MCP·실험 설정은 `.claude/settings.local.json`에만 두고 커밋하지 않습니다.
