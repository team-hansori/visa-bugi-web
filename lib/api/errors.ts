export type ApiError = {
  error: { code: string; message: string; requestId: string };
};

/** 라우트 핸들러가 던지면 withApiRoute가 공통 오류 형태로 직렬화한다. */
export class ApiRouteError extends Error {
  readonly cause?: unknown;

  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message);
    this.name = "ApiRouteError";
    this.cause = options?.cause;
  }
}

export function apiErrorResponse(
  status: number,
  code: string,
  message: string,
  requestId: string,
): Response {
  const body: ApiError = { error: { code, message, requestId } };
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", "x-request-id": requestId },
  });
}

// 클라이언트가 보낸 x-request-id는 로그·응답 헤더에 그대로 반향되므로
// 토큰 문자·길이만 허용한다(로그 포징·헤더 인젝션 표면 축소).
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{1,128}$/;

function resolveRequestId(request: Request): string {
  const inbound = request.headers.get("x-request-id");
  if (inbound && REQUEST_ID_PATTERN.test(inbound)) return inbound;
  return crypto.randomUUID();
}

// 공유(CDN) 캐시에 저장될 수 있는 응답에는 요청별 x-request-id를 붙이지 않는다.
// 캐시 히트 시 최초 요청의 id가 다른 클라이언트에 재전달되어 로그와 대응되지
// 않기 때문이다. no-store/private 응답에만 부착한다.
function isSharedCacheable(cacheControl: string | null): boolean {
  if (!cacheControl) return false;
  return (
    cacheControl.includes("public") &&
    !cacheControl.includes("no-store") &&
    !cacheControl.includes("private")
  );
}

type Handler = (
  request: Request,
  context: { requestId: string },
) => Promise<Response>;

/**
 * 요청 ID 부여 + 공통 오류 직렬화 + 서버 로깅.
 * Supabase·외부 API의 상세 오류는 requestId와 함께 서버 로그에만 남기고
 * 브라우저에는 안전한 코드·문구만 반환한다.
 */
export function withApiRoute(handler: Handler) {
  return async (request: Request): Promise<Response> => {
    const requestId = resolveRequestId(request);
    try {
      const response = await handler(request, { requestId });
      const headers = new Headers(response.headers);
      if (!isSharedCacheable(headers.get("Cache-Control"))) {
        headers.set("x-request-id", requestId);
      }
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch (cause) {
      if (cause instanceof ApiRouteError) {
        console.error("[api]", {
          requestId,
          code: cause.code,
          status: cause.status,
          message: cause.message,
          cause: cause.cause,
        });
        return apiErrorResponse(
          cause.status,
          cause.code,
          cause.message,
          requestId,
        );
      }
      console.error("[api]", { requestId, code: "INTERNAL", status: 500 }, cause);
      return apiErrorResponse(
        500,
        "INTERNAL",
        "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
        requestId,
      );
    }
  };
}
