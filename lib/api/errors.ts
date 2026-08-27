export type ApiError = {
  error: { code: string; message: string; requestId: string };
};

/** 라우트 핸들러가 던지면 withApiRoute가 공통 오류 형태로 직렬화한다. */
export class ApiRouteError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiRouteError";
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
    const requestId =
      request.headers.get("x-request-id") ?? crypto.randomUUID();
    try {
      const response = await handler(request, { requestId });
      const headers = new Headers(response.headers);
      headers.set("x-request-id", requestId);
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
