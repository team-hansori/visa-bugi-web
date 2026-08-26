# 비자부기 웹

내 비자 요건과 다음 단계를 추적하는 충북살이 웹앱입니다.

현재는 Next.js App Router와 TypeScript를 기반으로 하며, Supabase 연동을 위한
클라이언트·서버 유틸리티를 포함합니다.

## 시작하기

Node.js 22 이상을 설치한 뒤 의존성을 설치합니다.

```bash
npm install
cp .env.example .env.local
npm run dev
```

개발 서버는 [http://localhost:3000](http://localhost:3000)에서 확인할 수 있습니다.

Supabase를 사용할 때는 `.env.local`에 다음 값을 입력합니다.

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

신청서 OCR을 실제 분석 모드로 사용할 때는 서버 전용 키를 추가합니다. 키가
없으면 `/ocr` 화면은 업로드·검수 흐름을 확인할 수 있는 명시적인 데모 결과를
표시합니다.

```env
OPENAI_API_KEY=your-server-only-key
OPENAI_OCR_MODEL=gpt-5.4-mini
OPENAI_CHAT_MODEL=gpt-5.4-mini
```

API 비용 없이 화면과 업로드 흐름을 테스트하려면 `OCR_MODE=demo`를 설정합니다.
이 값이 `demo`이면 `OPENAI_API_KEY`가 함께 설정되어 있어도 외부 OCR API를
호출하지 않습니다. Vercel에서는 Preview 환경에 이 값을 추가한 뒤 다시
배포하면 됩니다.

```env
OCR_MODE=demo
```

OCR 결과 화면의 질문 도우미는 같은 `OPENAI_API_KEY`를 사용합니다. 질문 기능만
끄고 싶다면 `CHAT_MODE=disabled`를 설정합니다. `OCR_MODE=demo`는 사진 분석
호출만 막으므로 질문 도우미까지 무료 테스트하려면 두 값을 함께 설정해야 합니다.

```env
OCR_MODE=demo
CHAT_MODE=disabled
```

`/api/health`에서 서비스 상태를 확인할 수 있습니다.

## 명령어

```bash
npm run dev       # 개발 서버
npm run lint      # ESLint
npm run typecheck # TypeScript 검사
npm run build     # 프로덕션 빌드
```

## 레포 역할

- `visa-data`: PDF 추출, 공통 스키마 CSV, SQLite 검수, Supabase 적재
- `visa-bugi-web`: 사용자 화면, OCR/API, 캘린더, 지도, Supabase 조회

비자·기관 마스터 데이터는 `visa-data`에서 검수한 뒤 Supabase에 적재하고,
웹앱은 Supabase를 통해 조회합니다.

## 신청서 OCR

`/ocr`에서는 통합신청서, F-2-R 추천서 발급 신청서, E-7-4 자체 심사표를
우선 지원합니다. 신청서 목록은 `visa-data` 공통 스키마 v2의
`document_requirements`, `visa_process_stages`, `visa_requirements`를 조회하고,
서식 내부 필드 정의는 검수된 웹 OCR 템플릿을 사용합니다.

- JPG, PNG, WebP 사진 한 장 분석(16MB 이하 원본을 기기에서 4MB 이하로 축소)
- HWPX 한 파일 첨부(16MB 이하, 서버에서 문서 텍스트를 추출한 뒤 분석)
- 사진 촬영과 파일 첨부를 분리하고, 사진 전송 전에 해상도·노출·대비·흐림을 기기에서 점검
- 앱에서 선택한 6개 언어로 항목별 작성 안내
- 문서명·항목명·작성 상태만 전달하는 OCR 전용 질문 도우미
- OCR 값의 확신도에 따른 확인 필요 상태 표시
- 서명, 동의, 기관 작성란은 자동 인식·자동 입력하지 않음
- 원본 사진과 분석 결과를 웹 데이터베이스에 저장하지 않음

스키마 연결 경계와 보안 원칙은
[`docs/ocr-schema-v2-integration.md`](docs/ocr-schema-v2-integration.md)에 정리되어
있습니다.

## Vercel 배포

이 레포를 Vercel 프로젝트에 연결하고 `.env.example`의 환경변수를 Vercel
프로젝트 환경변수에 등록하면 배포할 수 있습니다.
