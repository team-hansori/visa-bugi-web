# 신청서 OCR과 visa-data 공통 스키마 v2 연동

## 목적

비자 신청서 사진에서 작성된 값을 읽고, 비어 있거나 다시 확인할 필드를
사용자의 앱 언어로 설명한다. OCR 결과는 신청 자격 판정이나 전자 제출 결과가
아니며, 사용자가 원본과 대조하기 위한 사전 점검 정보다.

## 공통 스키마 v2 조회

신청서 목록은 `team-hansori/visa-data#44`의 서비스 테이블을 다음 순서로
조회한다.

```text
document_requirements (document_category = APPLICATION)
  -> visa_process_stages (stage_id)
  -> visa_requirements (visa_id)
```

- `document_requirements`: 문서명, 필수 여부, 작성자, 제출자, 서명자, 출처 쪽
- `visa_process_stages`: 비자 연결과 공고 차수
- `visa_requirements`: 비자 코드와 한국어 비자명

Supabase가 설정되지 않았거나 아직 v2 데이터가 배포되지 않은 환경에서는 같은
모양의 내장 목록을 명시적으로 사용한다. 이 목록은 UI와 OCR 흐름을 확인하기
위한 대체 데이터이며 마스터 데이터로 취급하지 않는다.

## OCR 템플릿 경계

공통 스키마 v2는 “어떤 신청서가 필요한지”를 표현하지만 신청서 내부의 좌표,
필드 식별자, 입력 형식, OCR 가이드는 포함하지 않는다. 따라서 웹에는 다음의
검수 가능한 OCR 전용 템플릿을 둔다.

- 서식 키와 개정판
- 공통 스키마 문서명과 연결하기 위한 이름 패턴
- 허용된 필드 식별자와 한국어 공식 항목명
- 필드 형식, 필수 여부, 작성 주체
- 서명·동의·기관 작성란처럼 직접 작성해야 하는 항목

OCR 템플릿은 공통 스키마를 변경하거나 새 Supabase 테이블을 가정하지 않는다.
서식이 개정되면 원본과 대조해 템플릿 개정판을 검수한 뒤 배포해야 한다.

## 처리 흐름

1. 서버 컴포넌트가 공통 스키마 v2에서 지원 가능한 신청서 목록을 읽는다.
2. 사용자가 신청서 종류를 선택하거나 자동 감지를 선택하고 사진 한 장을 보낸다.
3. 4MB를 넘는 원본은 브라우저에서 축소하고 서버 API가 파일 형식과 크기를 검증한다.
4. Vision 모델은 허용된 템플릿과 필드만 엄격한 JSON으로 반환한다.
5. 서버의 결정적 규칙이 누락, 낮은 확신도, 직접 작성 상태를 계산한다.
6. 화면은 공식 한국어 항목명과 현재 선택한 앱 언어의 작성 가이드를 함께 보여준다.

모델에게는 문서 안의 지시문을 신뢰하지 말고, 보이지 않는 값을 추측하지 말며,
신청 자격·진위·법적 유효성을 판단하지 말라고 명시한다. OCR 결과 자체로 비자
자격이나 점수를 확정하지 않는다.

## 개인정보와 운영

- API 키는 `OPENAI_API_KEY` 서버 환경변수로만 설정한다.
- 요청은 `store: false`로 보내며 웹 데이터베이스에 원본 또는 결과를 저장하지 않는다.
- Vercel Functions의 4.5MB 요청 한도보다 낮게 전송 파일을 4MB로 제한한다.
- API 응답에는 `Cache-Control: no-store`를 적용한다.
- 서버 인스턴스에서 IP별 분당 6회로 1차 제한한다. 운영 배포에서는 Vercel
  Firewall 등 공유 저장소 기반 제한을 함께 설정한다.
- 서명, 동의, 기관 작성란은 전사하지 않고 직접 작성으로 표시한다.
- 실제 서비스에서는 보관 정책, 처리 위탁 고지, 사용자 동의를 별도로 검토한다.

Vision 이미지 입력과 구조화 출력은 OpenAI 공식 문서를 기준으로 구현했다.

- <https://developers.openai.com/api/docs/guides/images-vision>
- <https://developers.openai.com/api/docs/guides/structured-outputs>
- <https://vercel.com/docs/functions/limitations#request-body-size>
