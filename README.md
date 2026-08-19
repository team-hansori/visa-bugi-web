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

## Vercel 배포

이 레포를 Vercel 프로젝트에 연결하고 `.env.example`의 환경변수를 Vercel
프로젝트 환경변수에 등록하면 배포할 수 있습니다.
