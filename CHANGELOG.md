## [unreleased]

### 🚀 Features

- Initialize visa-bugi web app
- 모바일 우선 반응형 앱 레이아웃 구현 (#2)
- Next-intl 라우팅·네비게이션·요청 설정 추가
- 메시지 ko.json 작성 및 5개 언어 fallback 복사본 생성
- Locale 감지·리다이렉트 proxy 추가
- App 라우트를 [locale] 세그먼트 아래로 재구성
- 랜딩 페이지에 next-intl 번역 연결
- AppShell에 locale 네비게이션과 언어 선택 UI 연결
- 헤더 브랜드 워드마크·앱 아이콘 자산 적용 (#17)
- Mail·settings 아이콘 추가
- 내비게이션에 MY 탭 추가
- MY 허브 화면 추가
- 설정 화면 추가
- 문의하기 화면 추가
- 이용약관 화면 추가
- 개인정보처리방침 화면 추가
- 헤더 타이틀 전환 및 설정 화면 목업 반영
- MY 페이지를 설정 화면과 통합, 목업 스타일 그룹 카드로 재구성
- MY 탭 라벨을 설정으로, 헤더는 홈에서만 워드마크 표시
- 하단 탭바 라벨을 언어별로 실제 번역
- MY·설정·문의·약관·개인정보처리방침 화면을 5개 언어로 번역
- [UI] 페이지 헤더의 중복 소개 문구 정리 (#24)
- 이용약관·개인정보처리방침 초안 및 MY 모달 노출 추가
- 챗봇 도메인 타입과 마스터 데이터 쿼리 계층 추가
- Risk_routing_table 기반 결정론 위험 라우팅 로직 추가
- Stage 1 위험·범위 스크리닝 추가 (경량 LLM 구조화 출력 + 보수적 폴백)
- 응답 시스템 프롬프트와 typed tools 6종 추가
- 연락처 verbatim 위반 검사 유틸 추가
- 채팅 2층 저장 구조 추가 (삭제 가능한 대화 저장소 + 비식별 턴 로그)
- 폴백 사다리 오케스트레이터 추가 (escalation → 답변 → out_of_scope → 정적 폴백)
- 챗봇 API 라우트 추가 (POST /api/chat, DELETE /api/chat/session)
- 챗 상담 페이지·내비게이션·다국어 키 추가
- Integrate chat and OCR foundations
- 온보딩 프로필 세션스토리지 리더 추가
- 인증 상태 mock 훅 추가
- 비자 절차 mock 데이터와 getDefaultChecklist 추가
- 기준일+offset 날짜 계산 함수 추가
- 실제 월 이동을 지원하는 공용 캘린더 그리드 추가
- 온보딩 프로필/수동 선택 기반 목표 비자 훅 추가
- 게스트 비자 절차 체크리스트 캘린더 뷰 추가
- 기준일 계산+개인 일정 등록 폼을 포함한 로그인 캘린더 뷰 추가
- 캘린더 페이지를 인증 상태로 분기하도록 연결
- 프로젝트 지원 비자 유형 추가
- 캘린더 비자 유형 다중 선택 지원
- 다국어 비자 선택 드롭다운 추가
- 캘린더 일정 검색 모드 추가
- 캘린더 검색 결과와 전체 비자 기본값 개선
- 비자 선택 색상과 초기화 기능 추가
- Add region center and marker offset geo helper
- Add Kakao Maps SDK wrapper component
- Render agency map demo with real Kakao Maps SDK
- Add real agency query module with distance sorting
- Replace demo agencies with real Supabase data in map component
- 비자 상수와 현재 체류자격 기반 목표비자 추천 함수 추가
- 온보딩 zod 스키마 추가 (스텝 검증·서버 재검증 공용)
- 온보딩 스텝 시퀀스와 목표비자별 분기 로직 추가
- 온보딩 user 스키마 마이그레이션과 DB 타입 추가
- Kakao Local API 주소 검색 프록시 Route Handler 추가
- 주소 자동완성 combobox 컴포넌트 추가
- 익명 세션 보장 유틸 + 온보딩 저장 Server Action 추가
- 온보딩 스텝 UI 컴포넌트 추가
- 온보딩 폼을 URL 기반 퍼널로 재작성
- 온보딩 UI 문구를 next-intl 메시지로 연결
- 한국어능력 질문을 TOPIK·사회통합프로그램 중복 선택 가능하도록 변경
- 온보딩 진입 전 로그인/비로그인 시작 화면 추가
- 온보딩 화면 전체를 next-intl 번역 가능하도록 연결
- 온보딩 5개 언어(중국어·베트남어·우즈베크어·네팔어·크메르어) 초역 추가
- A11y.backToHome 번역 키 추가
- 온보딩용 MinimalShell 컴포넌트 추가
- Route group으로 앱 셸(AppShell)과 온보딩 최소 셸(MinimalShell) 분리
- 온보딩 진입 화면에 약관 동의 링크 추가, t.rich() 테스트 목 지원
- 온보딩을 마쳐야 홈으로 넘어가도록 진입 라우팅 변경 (데모용)
- Add floating chat launcher
- 신청서 촬영 및 첨부 UI 개선

### 🐛 Bug Fixes

- Use explicit root layout children type
- Address initial web app review feedback
- 코드 리뷰 지적 사항 반영
- 추가 코드 리뷰 피드백 반영
- 온보딩 포커스 표시 개선
- 폼 검증과 위치 상태 경쟁 조건 개선
- 온보딩 폼 라우터를 locale-aware 네비게이션으로 교체
- 최종 리뷰 반영 — 온보딩 언어 질문 연동, 404 경계 추가, 접근성 개선
- App/not-found.tsx 홈 링크가 locale-aware Link 아님 (#8)
- 헤더 워드마크 크기를 네비게이션 라인에 맞춤
- 한글 라벨의 과도한 자간(letter-spacing) 제거
- MY 허브 카드 그리드가 360px 이하에서 넘치는 문제 수정
- 설정 아이콘을 톱니바퀴 모양으로 교체, 헤더 버튼 원형 배경 제거
- 존재하지 않는 경로가 500 대신 404를 반환하도록 수정
- 헤더 설정 아이콘을 언어 선택 드롭다운으로 되돌림
- 언어 선택 드롭다운 크기 축소 및 지구본 대신 국기 표시
- 서류 사진 선택 섹션의 1단계 라벨 제거
- 캘린더 선택 일정 카드의 선택한 날짜 라벨 제거
- 홈 대시보드 카드의 전체 요건 충족률·비자 여정·다음 할 일·주변 기관 라벨 제거
- CodeRabbit 리뷰 반영 — 개정일 표시·번역 오류 수정
- 코드 리뷰 반영 — 지역/비자유형 매칭, verbatim 정규식, deprecated API
- 코드 리뷰 반영 — verbatim 위반 응답 치환, 근거 행 ID 로깅, 폴백 결정론화
- 최종 리뷰 반영 — 삭제 실패 처리, 관할 혼동 게이트 케이스 추가
- *(chat)* Add request rate limiting
- *(chat)* Preserve session on deletion failure
- *(chat)* Prevent duplicate message sends
- *(chat)* Make session creation concurrency-safe
- *(chat)* Bound AI gateway request time
- *(chat)* Use Seoul date for validity filters
- *(chat)* Prefer matching risk user type
- *(chat)* Harden screening failure fallback
- *(chat)* Scope short contact number detection
- *(i18n)* Localize chat metadata and labels
- Harden OCR upload and result validation
- 캘린더 SSR 하이드레이션 불일치 및 로그인/게스트 뷰 마감일 불일치 수정
- 비자 선택 영역을 캘린더 위에 유지
- 캘린더 선택 바 글씨 크기 통일
- CodeRabbit 캘린더 리뷰 반영
- 모바일 내비게이션 6개 탭 한 줄 정렬
- Remove invalid ARIA role override on map agency list
- Fix map marker rendering, container sizing, and missing-key state
- Guard missing Supabase env, fix loading/error/empty state precedence
- Clear stale agency results/GPS fix on refetch and failed geolocation
- 주소 검색 실패 시 온보딩이 완전히 막히던 문제 수정
- Kakao 주소검색 프록시의 응답 캐시 제거
- 온보딩 동의 문구를 준비 중 상태에 맞게 수정하고 테스트 목/주석 보강
- 테스트 목의 MessageTree 타입이 배열 값을 허용하도록 확장
- 캘린더 목표 비자를 온보딩 스키마(user_visa_profile)에서 읽도록 변경
- Search all pilot regions when using real GPS location
- 다국어 미지원 + 모바일 기관 상세정보 숨김 버그 (#39)
- 온보딩 뒤로가기가 홈으로 튕기는 문제 수정 + 웰컴 화면을 전체화면 단일 카드로 변경
- 온보딩 질문 스텝에서도 초록색 히어로 카드 제거
- Use transparent chatbot launcher asset
- 온보딩 스키마 마이그레이션의 RLS 정책 생성을 재실행 가능하게 수정
- 온보딩 스키마에 authenticated 역할 GRANT 추가
- 온보딩 뒤로가기를 히스토리 대신 stepIndex 기준으로 결정론적으로 처리 + 상단 진행바 UI
- Remove chatbot icon container styling

### 💼 Other

- Main 변경사항 반영 및 캘린더 충돌 해결
- 최신 main 반영 및 다국어 충돌 해결

### 🚜 Refactor

- LocaleSwitcher를 공용 컴포넌트로 분리
- Google 로그인 클릭 핸들러를 handleGoogleLogin으로 분리 (연동 지점 명시)

### 📚 Documentation

- CHANGELOG 자동 업데이트 [skip ci]
- Add shared coding agent instructions
- CHANGELOG 자동 업데이트 [skip ci]
- CHANGELOG 자동 업데이트 [skip ci]
- I18n next-intl 라우팅 인프라 구축 계획 추가
- CHANGELOG 자동 업데이트 [skip ci]
- CHANGELOG 자동 업데이트 [skip ci]
- CHANGELOG 자동 업데이트 [skip ci]
- CHANGELOG 자동 업데이트 [skip ci]
- CHANGELOG 자동 업데이트 [skip ci]
- CHANGELOG 자동 업데이트 [skip ci]
- CHANGELOG 자동 업데이트 [skip ci]
- CHANGELOG 자동 업데이트 [skip ci]
- MY 탭·설정·정책 화면 설계 스펙 추가
- MY 탭·설정·정책 화면 구현 계획 추가
- CHANGELOG 자동 업데이트 [skip ci]
- CHANGELOG 자동 업데이트 [skip ci]
- CHANGELOG 자동 업데이트 [skip ci]
- CHANGELOG 자동 업데이트 [skip ci]
- 웹 프로젝트 README 정리
- CHANGELOG 자동 업데이트 [skip ci]
- README에 브랜드와 기술 스택 추가
- CHANGELOG 자동 업데이트 [skip ci]
- README 목차 추가
- CHANGELOG 자동 업데이트 [skip ci]
- README에 팀 소개 추가
- CHANGELOG 자동 업데이트 [skip ci]
- README 개발 서버 안내 제거
- CHANGELOG 자동 업데이트 [skip ci]
- 챗봇 라우팅 아키텍처 설계 spec 작성
- 챗봇 MVP 구현 계획 작성 (11개 태스크, TDD)
- Role spoofing 완화·잔여 리스크 계획 문서에 기록
- README에서 이전 서비스명 제거
- 캘린더 게스트 기본 일정/로그인 개인 일정 설계 스펙 추가
- 후속 이슈 링크(#20, #21) 스펙에 반영
- 비자 스키마 결합도 낮추는 어댑터 계층 설계 추가
- 캘린더 게스트/로그인 분리 구현 계획 추가
- CHANGELOG 자동 업데이트 [skip ci]
- CHANGELOG 자동 업데이트 [skip ci]
- CHANGELOG 자동 업데이트 [skip ci]
- Add implementation plans for map SDK integration and real agency data
- 온보딩 질문 + user 스키마 설계 스펙 추가
- 온보딩 스펙을 2026 BP 검증 결과로 개정
- 온보딩 퍼널·user 스키마 구현 계획 추가
- 온보딩 저장 방식을 sessionStorage에서 익명 로그인으로 변경
- 계획서에 익명 세션 보장 태스크 반영, 스펙 문구 정밀화
- 온보딩 진입 화면 개편 + 앱 셸 분리 설계 스펙 추가
- 온보딩 진입 화면 개편 + 앱 셸 분리 구현 계획 추가
- CHANGELOG 자동 업데이트 [skip ci]
- CHANGELOG 자동 업데이트 [skip ci]
- CHANGELOG 자동 업데이트 [skip ci]
- CHANGELOG 자동 업데이트 [skip ci]
- CHANGELOG 자동 업데이트 [skip ci]
- CHANGELOG 자동 업데이트 [skip ci]
- CHANGELOG 자동 업데이트 [skip ci]
- CHANGELOG 자동 업데이트 [skip ci]
- CHANGELOG 자동 업데이트 [skip ci]
- CHANGELOG 자동 업데이트 [skip ci]
- CHANGELOG 자동 업데이트 [skip ci]
- CHANGELOG 자동 업데이트 [skip ci]
- CHANGELOG 자동 업데이트 [skip ci]

### 🎨 Styling

- 비자 선택 칩 색상 톤 완화
- 캘린더와 내비게이션 UI 정리
- Shrink mobile filter/agency chip rows, soften selected chip color
- Shrink mobile chip rows further (11px text, 32px height)
- Make selected chip colors more transparent
- Restore chip color legibility, hide scrollbar track on chip rows

### 🧪 Testing

- Vitest 테스트 인프라 추가
- Golden set 평가 추가 (위험 미탐 0건·verbatim 위반 0건 게이트)
- *(chat)* Validate escalation templates for contacts
- *(chat)* Cover positive risk routing cases
- *(chat)* Strengthen routing and safety coverage
- 정책 locale별 메시지 계약 반영

### ⚙️ Miscellaneous Tasks

- Initialize web repository GitHub settings
- Add Claude Code project configuration
- Next-intl 설치 및 Next.js 플러그인 연결
- Add transparent Bugi brand assets
- Add final Bugi app logo
- Add transparent Visa Bugi wordmark
- Replace Visa Bugi wordmark PNGs with SVG
- Add app icon PNG assets
- Add transparent crawling Bugi poses
- Merge latest main before grounded OCR chat PR
- Remove dead demo marker-offset code from geo.ts
- Vitest 테스트 인프라 구축 및 CI 연결
