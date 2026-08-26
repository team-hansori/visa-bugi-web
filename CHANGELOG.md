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

### 🚜 Refactor

- LocaleSwitcher를 공용 컴포넌트로 분리

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
