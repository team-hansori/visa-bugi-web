---
name: visa-feature
description: Use when implementing or reviewing a visa requirement, process stage, score tracker, reminder, or official-agency routing feature in visa-bugi-web.
---

# Visa feature workflow

비자 관련 기능을 구현하거나 리뷰할 때 다음 순서를 따릅니다.

1. 어떤 비자 유형과 사용자 여정 단계(추적·준비·제출·판정)를 다루는지 먼저 적습니다.
2. 필요한 필드가 `visa-data`의 공통 스키마와 Supabase 계약에 이미 있는지 확인합니다.
3. `valid_from`·`valid_to`와 사용자 일정의 마감일을 구분합니다.
4. 조건·점수 계산은 공식 요건을 구조화한 결정론적 로직으로 처리하고, LLM은 입력 정리·설명 보조에만 사용합니다.
5. 결과 화면에는 적용 공고·출처·확인일과 “참고용이며 최종 판단은 담당 기관 확인” 안내를 표시합니다.
6. 신청·제출을 직접 완료하는 것처럼 표현하지 말고, 체크리스트와 공식 기관 연결로 책임 경계를 지킵니다.
7. 변경 후 `npm run lint`, `npm run typecheck`, `npm run build`를 실행합니다.

## 리뷰 체크리스트

- 공통 스키마에 없는 필드를 임의로 만들지 않았는가?
- 공식 출처가 없는 조건을 추정하지 않았는가?
- 상대 일정의 기준일과 offset이 명확한가?
- 위험 상황과 개인정보가 안전하게 처리되는가?
- 비자별 순위처럼 오해할 수 있는 표현을 사용하지 않았는가?
