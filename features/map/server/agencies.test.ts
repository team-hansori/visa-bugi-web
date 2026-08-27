import { beforeEach, describe, expect, it, vi } from "vitest";

let rows: unknown[] = [];
let queryError: unknown = null;
const orSpy = vi.fn();
const eqSpy = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: () => {
      const builder = {
        select: () => builder,
        or: (arg: string) => {
          orSpy(arg);
          return builder;
        },
        eq: (col: string, val: string) => {
          eqSpy(col, val);
          return builder;
        },
        then: (resolve: (v: { data: unknown; error: unknown }) => void) =>
          resolve({ data: rows, error: queryError }),
      };
      return builder;
    },
  }),
}));

const { getNearbyAgencies } = await import("./agencies");

beforeEach(() => {
  vi.clearAllMocks();
  rows = [];
  queryError = null;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "pk";
});

const row = (id: string, lat: number, lng: number) => ({
  agency_id: id,
  department_name: id,
  agency_type: "OTHER",
  road_address: null,
  latitude: lat,
  longitude: lng,
  phone: "",
  url: null,
  operating_hours: null,
});

describe("getNearbyAgencies", () => {
  it("행을 Agency로 변환하고 거리순 정렬 후 limit만큼 반환한다", async () => {
    rows = [row("far", 38, 128), row("near", 36.64, 127.49)];
    const result = await getNearbyAgencies({
      region: "cheongju",
      agencyType: null,
      near: { lat: 36.64, lng: 127.49 },
      limit: 1,
    });
    expect(result.map((a) => a.id)).toEqual(["near"]);
    expect(result[0].name).toBe("near");
  });

  it("region이 있으면 지역 토큰 + 도 전체 토큰으로 or 필터를 건다", async () => {
    await getNearbyAgencies({
      region: "chungju",
      agencyType: null,
      near: { lat: 36.9, lng: 127.9 },
      limit: 3,
    });
    expect(orSpy).toHaveBeenCalledWith("region.eq.충주,region.eq.충청북도");
  });

  it("agencyType이 있으면 eq 필터를 건다", async () => {
    await getNearbyAgencies({
      region: null,
      agencyType: "COMMUNITY_CENTER",
      near: { lat: 36.6, lng: 127.5 },
      limit: 3,
    });
    expect(eqSpy).toHaveBeenCalledWith("agency_type", "COMMUNITY_CENTER");
  });

  it("env 미설정이면 MAP_NOT_CONFIGURED", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    await expect(
      getNearbyAgencies({
        region: null,
        agencyType: null,
        near: { lat: 36.6, lng: 127.5 },
        limit: 3,
      }),
    ).rejects.toMatchObject({ status: 503, code: "MAP_NOT_CONFIGURED" });
  });

  it("Supabase 오류면 MAP_QUERY_FAILED이고 원본 오류를 cause로 싣는다", async () => {
    queryError = { message: "boom" };
    await expect(
      getNearbyAgencies({
        region: null,
        agencyType: null,
        near: { lat: 36.6, lng: 127.5 },
        limit: 3,
      }),
    ).rejects.toMatchObject({
      status: 502,
      code: "MAP_QUERY_FAILED",
      cause: { message: "boom" },
    });
  });
});
