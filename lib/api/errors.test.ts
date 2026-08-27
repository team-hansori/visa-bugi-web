import { describe, expect, it, vi } from "vitest";
import { ApiRouteError, withApiRoute } from "./errors";

describe("withApiRoute", () => {
  it("정상 핸들러 응답에 x-request-id를 붙인다", async () => {
    const wrapped = withApiRoute(async (_req, { requestId }) =>
      Response.json({ ok: true, requestId }),
    );
    const res = await wrapped(
      new Request("https://x/api/t", { headers: { "x-request-id": "req-1" } }),
    );
    expect(res.headers.get("x-request-id")).toBe("req-1");
    expect(await res.json()).toEqual({ ok: true, requestId: "req-1" });
  });

  it("요청에 x-request-id가 없으면 새로 생성한다", async () => {
    const wrapped = withApiRoute(async (_req, { requestId }) =>
      Response.json({ requestId }),
    );
    const res = await wrapped(new Request("https://x/api/t"));
    const body = (await res.json()) as { requestId: string };
    expect(body.requestId).toMatch(/[0-9a-f-]{36}/);
    expect(res.headers.get("x-request-id")).toBe(body.requestId);
  });

  it("형식에 맞지 않는 inbound x-request-id는 무시하고 새로 생성한다", async () => {
    const wrapped = withApiRoute(async (_req, { requestId }) =>
      Response.json({ requestId }),
    );
    const res = await wrapped(
      new Request("https://x/api/t", {
        headers: { "x-request-id": "bad id with spaces & symbols!" },
      }),
    );
    const body = (await res.json()) as { requestId: string };
    expect(body.requestId).not.toContain(" ");
    expect(body.requestId).toMatch(/^[A-Za-z0-9-]{10,}$/);
  });

  it("공개 캐시(public) 응답에는 요청별 x-request-id 헤더를 붙이지 않는다", async () => {
    const wrapped = withApiRoute(async () =>
      Response.json(
        { ok: true },
        { headers: { "Cache-Control": "public, max-age=60" } },
      ),
    );
    const res = await wrapped(
      new Request("https://x/api/t", { headers: { "x-request-id": "req-9" } }),
    );
    expect(res.headers.get("x-request-id")).toBeNull();
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=60");
  });

  it("ApiRouteError의 cause를 서버 로그에 남긴다", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const wrapped = withApiRoute(async () => {
      throw new ApiRouteError(502, "MAP_QUERY_FAILED", "불러오지 못했습니다.", {
        cause: { message: "supabase: relation does not exist" },
      });
    });
    await wrapped(new Request("https://x/api/t"));
    expect(spy).toHaveBeenCalledWith(
      "[api]",
      expect.objectContaining({
        code: "MAP_QUERY_FAILED",
        cause: { message: "supabase: relation does not exist" },
      }),
    );
  });

  it("ApiRouteError를 공통 오류 형태로 직렬화한다", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const wrapped = withApiRoute(async () => {
      throw new ApiRouteError(401, "AUTH_REQUIRED", "로그인이 필요합니다.");
    });
    const res = await wrapped(
      new Request("https://x/api/t", { headers: { "x-request-id": "req-2" } }),
    );
    expect(res.status).toBe(401);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(await res.json()).toEqual({
      error: {
        code: "AUTH_REQUIRED",
        message: "로그인이 필요합니다.",
        requestId: "req-2",
      },
    });
  });

  it("예상치 못한 예외는 500 INTERNAL로 감싸고 상세를 브라우저에 노출하지 않는다", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const wrapped = withApiRoute(async () => {
      throw new Error("supabase down: secret detail");
    });
    const res = await wrapped(new Request("https://x/api/t"));
    expect(res.status).toBe(500);
    const body = (await res.json()) as {
      error: { code: string; requestId: string };
    };
    expect(body.error.code).toBe("INTERNAL");
    expect(JSON.stringify(body)).not.toContain("secret detail");
    expect(typeof body.error.requestId).toBe("string");
  });
});
