<div align="center">
  <img src="public/brand/app-icon/bugi-app-icon-192.png" alt="비자부기 앱 아이콘" width="128" height="128" />
  <br />
  <img src="public/brand/wordmark/visa-bugi-wordmark.svg" alt="비자부기" width="352" />
  <p>외국인 주민의 체류자격 요건과 행정 절차를 함께 관리하는 충북살이 웹앱</p>
  <p>
    <img src="https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs" alt="Next.js 16" />
    <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=000000" alt="React 19" />
    <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript 5" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS 4" />
    <img src="https://img.shields.io/badge/Supabase-2-3FCF8E?logo=supabase&logoColor=white" alt="Supabase 2" />
    <img src="https://img.shields.io/badge/Vercel-Deploy-000000?logo=vercel" alt="Vercel" />
  </p>
</div>

충청북도 외국인 주민이 자신의 체류자격 요건과 행정 절차를 이해하고,
준비할 서류·일정·지원기관을 추적할 수 있도록 돕는 웹앱입니다.

13회 전국 ICT융합 공모전 출품작(team-hansori)의 웹 애플리케이션 저장소입니다.
비자·기관 마스터 데이터는 [`visa-data`](https://github.com/team-hansori/visa-data)에서
원문 근거와 함께 구조화·검수하며, 이 저장소는 검수된 데이터를 Supabase를 통해
조회해 사용자 화면과 기능으로 제공합니다.

---

## 목차

- [주요 기능](#주요-기능)
- [빠른 시작](#빠른-시작)
  - [저장소 클론](#1-저장소-클론)
  - [개발 환경 준비](#2-개발-환경-준비)
- [기술 스택](#기술-스택)
- [디렉터리 구조](#디렉터리-구조)
- [저장소 역할과 데이터 흐름](#저장소-역할과-데이터-흐름)
- [개발 명령어](#개발-명령어)
- [기본 작업 흐름](#기본-작업-흐름)
- [Vercel 배포](#vercel-배포)
- [변경 이력](#변경-이력)

---

## 주요 기능

- 비자 요건과 진행 단계 확인
- 개인 일정과 마감일 관리
- 주변 행정·교육·노동 지원기관 안내
- 한국어·중국어·베트남어·우즈베크어·네팔어·크메르어 UI
- 문서 OCR 연계를 위한 업로드 화면
- Supabase 기반 인증·사용자 진행 상황 저장을 위한 클라이언트·서버 유틸리티

일부 기능은 현재 MVP용 화면 또는 데모 단계이며, 아직 연결되지 않은 동작은
완료된 기능처럼 안내하지 않습니다.

---

## 빠른 시작

### 1. 저장소 클론

```bash
git clone https://github.com/team-hansori/visa-bugi-web.git
cd visa-bugi-web
```

### 2. 개발 환경 준비

Node.js 22 이상을 설치한 뒤 의존성과 로컬 환경변수를 준비합니다.

```bash
npm install
cp .env.example .env.local
npm run dev
```

개발 서버는 [http://localhost:3000](http://localhost:3000)에서 확인할 수 있고,
서비스 상태는 `/api/health`에서 확인할 수 있습니다.

Supabase 기능을 사용할 때는 `.env.local`에 다음 값을 입력합니다.

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

두 값은 브라우저에 공개 가능한 프로젝트 설정입니다. Supabase service role key,
OCR·LLM API key 같은 비밀값은 `NEXT_PUBLIC_` 변수나 클라이언트 코드에 넣지 않습니다.
환경변수가 없어도 정적 화면과 기본 빌드는 동작해야 합니다.

---

## 기술 스택

| 영역 | 기술 | 용도 |
| --- | --- | --- |
| 프레임워크 | Next.js 16 App Router, React 19 | 서버·클라이언트 렌더링과 라우팅 |
| 언어 | TypeScript 5 | 정적 타입 기반 애플리케이션 개발 |
| 스타일 | Tailwind CSS 4 | 반응형 UI와 디자인 시스템 |
| 다국어 | `next-intl` 4 | locale 라우팅과 번역 메시지 관리 |
| 데이터·인증 | Supabase JS 2, Supabase SSR | 데이터 조회, 인증, 사용자 진행 상황 저장 |
| 배포 | Vercel | 웹앱 배포와 API/Cron 실행 |
| 품질 검사 | ESLint 9, TypeScript | 코드 규칙과 타입 오류 검사 |

---

## 디렉터리 구조

```text
visa-bugi-web/
├── app/                    # App Router 페이지, 레이아웃, API
│   ├── [locale]/           # 언어별 사용자 화면
│   └── api/health/         # 서비스 상태 확인 API
├── components/             # 공통 레이아웃과 UI 컴포넌트
├── features/               # 캘린더, 지도, OCR, 내 정보 등 기능 단위 코드
├── i18n/                   # locale 라우팅과 요청 설정
├── lib/supabase/           # 브라우저·서버용 Supabase 클라이언트
├── messages/               # 언어별 번역 메시지
├── public/                 # 브랜드 이미지와 정적 파일
├── docs/                   # 기능 설계와 구현 계획
├── .env.example            # 공개 가능한 환경변수 예시
└── package.json            # 의존성과 개발 명령어
```

---

## 저장소 역할과 데이터 흐름

| 저장소 | 책임 |
| --- | --- |
| [`visa-data`](https://github.com/team-hansori/visa-data) | 공고문·심사표·서식 추출, 근거표 작성, 공통 스키마 검수, SQL/Supabase 적재 |
| `visa-bugi-web` | 사용자 화면, API/OCR 연계, 캘린더, 지도, 인증, 검수된 마스터 데이터 조회 |

데이터는 아래 흐름으로 전달합니다.

```text
공식 문서 → visa-data 추출·근거 기록 → 리뷰·검수 → Supabase 적재 → visa-bugi-web 조회
```

- 원본 PDF와 검수 전 CSV를 이 저장소에 복사하지 않습니다.
- 웹앱에서 비자·기관 마스터 데이터를 임의로 수정하지 않습니다.
- 스키마나 Supabase 테이블 변경 전에는 `visa-data` 팀과 데이터 계약을 확인합니다.
- 공식 요건에 근거한 계산은 결정론적 규칙으로 처리하고 LLM 응답을 최종 판정으로
  사용하지 않습니다.
- 데이터의 `valid_from`·`valid_to`는 유효기간이며, 사용자 일정은 `tracked_items`의
  일정 필드로 별도 관리합니다.
- 기준일과 offset이 확정되지 않은 상대 일정은 날짜를 추정해 자동 생성하지 않습니다.
- 기관 전화번호·주소·운영시간은 출처와 확인일을 함께 관리합니다.

---

## 개발 명령어

```bash
npm run dev       # 개발 서버 실행
npm run lint      # ESLint 검사
npm run typecheck # TypeScript 타입 검사
npm run build     # 프로덕션 빌드
npm run start     # 빌드된 앱 실행
```

변경 후 최소한 아래 검사를 모두 통과시킵니다.

```bash
npm run lint
npm run typecheck
npm run build
```

---

## 기본 작업 흐름

1. 기능 또는 수정 범위를 설명하는 Issue를 만듭니다.
2. `main`이 아닌 기능 브랜치에서 작업합니다.
3. 사용자 입력은 화면·API 경계에서 검증하고 설명 가능한 오류를 반환합니다.
4. 서버 전용 로직과 비밀값은 `app/api` 또는 서버 전용 모듈에 둡니다.
5. lint, typecheck, build를 실행한 뒤 PR을 엽니다.
6. PR에 변경 내용, 검증 명령어와 결과, 남은 작업을 기록합니다.

사용자가 누를 수 있는 버튼에는 실제 동작을 연결합니다. 구현 전인 기능은 비활성화하거나
`준비 중` 상태를 명확히 표시하고, 장식용 이미지와 아이콘은 보조기술에 불필요하게
읽히지 않도록 처리합니다.

---

## Vercel 배포

이 저장소를 Vercel 프로젝트에 연결하고 `.env.example`에 정의된 값을 Vercel의
프로젝트 환경변수로 등록합니다. 배포 환경의 비밀키는 Vercel 환경변수로만 관리하고
저장소에 커밋하지 않습니다.

---

## 변경 이력

변경 이력은 [`CHANGELOG.md`](CHANGELOG.md)에서 확인할 수 있습니다.
