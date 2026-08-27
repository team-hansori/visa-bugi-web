import { beforeEach, describe, expect, it, vi } from "vitest";

const getNearbyAgencies = vi.fn();
vi.mock("@/features/map/server/agencies", () => ({
  getNearbyAgencies: (...args: unknown[]) => getNearbyAgencies(...args),
}));

const { GET } = await import("./route");

beforeEach(() => {
  vi.clearAllMocks();
  getNearbyAgencies.mockResolvedValue([]);
});

describe("GET /api/map/agencies", () => {
  it("region+type을 파싱해 도메인 모듈에 넘기고 짧은 public 캐시로 응답한다", async () => {
    getNearbyAgencies.mockResolvedValue([{ id: "a", name: "x" }]);
    const res = await GET(
      new Request(
        "https://x/api/map/agencies?region=chungju&type=COMMUNITY_CENTER&limit=2",
      ),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=60");
    expect(await res.json()).toEqual({ agencies: [{ id: "a", name: "x" }] });
    expect(getNearbyAgencies).toHaveBeenCalledWith(
      expect.objectContaining({
        region: "chungju",
        agencyType: "COMMUNITY_CENTER",
        limit: 2,
      }),
    );
  });

  it("type=all 또는 미지정이면 agencyType=null", async () => {
    await GET(new Request("https://x/api/map/agencies?type=all"));
    expect(getNearbyAgencies).toHaveBeenCalledWith(
      expect.objectContaining({ agencyType: null }),
    );
  });

  it("lat/lng가 둘 다 오면 그 좌표를 near로 쓴다", async () => {
    await GET(new Request("https://x/api/map/agencies?lat=36.64&lng=127.49"));
    expect(getNearbyAgencies).toHaveBeenCalledWith(
      expect.objectContaining({ near: { lat: 36.64, lng: 127.49 } }),
    );
  });

  it("lat/lng 없으면 region 중심 좌표를 near로 쓴다", async () => {
    await GET(new Request("https://x/api/map/agencies?region=eumseong"));
    const call = getNearbyAgencies.mock.calls[0][0];
    expect(call.near).toHaveProperty("lat");
    expect(call.near).toHaveProperty("lng");
  });

  it("잘못된 region이면 400 INVALID_QUERY", async () => {
    const res = await GET(new Request("https://x/api/map/agencies?region=seoul"));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_QUERY");
  });

  it("limit이 범위를 벗어나면 400", async () => {
    const res = await GET(new Request("https://x/api/map/agencies?limit=999"));
    expect(res.status).toBe(400);
  });

  it("범위를 벗어난 좌표면 400", async () => {
    const res = await GET(
      new Request("https://x/api/map/agencies?lat=10&lng=10"),
    );
    expect(res.status).toBe(400);
  });

  it("도메인 모듈의 ApiRouteError는 공통 오류 계약으로 직렬화된다", async () => {
    const { ApiRouteError } = await import("@/lib/api/errors");
    getNearbyAgencies.mockRejectedValue(
      new ApiRouteError(503, "MAP_NOT_CONFIGURED", "기관 정보가 아직 연결되지 않았습니다."),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await GET(new Request("https://x/api/map/agencies"));
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe("MAP_NOT_CONFIGURED");
  });
});
