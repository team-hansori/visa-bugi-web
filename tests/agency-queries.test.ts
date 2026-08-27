import { describe, expect, it } from "vitest";
import {
  haversineDistanceKm,
  sortByDistance,
  REGION_QUERY_TOKENS,
  type Agency,
} from "@/features/map/agency-queries";

describe("REGION_QUERY_TOKENS", () => {
  it("maps each region to its short DB token, not the display label", () => {
    expect(REGION_QUERY_TOKENS.cheongju).toBe("청주");
    expect(REGION_QUERY_TOKENS.chungju).toBe("충주");
    expect(REGION_QUERY_TOKENS.jincheon).toBe("진천");
    expect(REGION_QUERY_TOKENS.eumseong).toBe("음성");
  });
});

describe("haversineDistanceKm", () => {
  it("returns 0 for identical points", () => {
    expect(haversineDistanceKm({ lat: 36.64, lng: 127.48 }, { lat: 36.64, lng: 127.48 })).toBe(0);
  });

  it("returns a larger distance for farther points", () => {
    const origin = { lat: 36.6424, lng: 127.489 };
    const near = { lat: 36.645, lng: 127.49 };
    const far = { lat: 36.991, lng: 127.9259 };
    expect(haversineDistanceKm(origin, near)).toBeLessThan(haversineDistanceKm(origin, far));
  });
});

describe("sortByDistance", () => {
  const makeAgency = (id: string, position: Agency["position"]): Agency => ({
    id,
    name: id,
    agencyType: "OTHER",
    roadAddress: null,
    position,
    phone: "",
    url: null,
    operatingHours: null,
  });

  it("sorts nearest-first without mutating the input array", () => {
    const from = { lat: 0, lng: 0 };
    const far = makeAgency("far", { lat: 10, lng: 10 });
    const near = makeAgency("near", { lat: 1, lng: 1 });
    const input = [far, near];
    const sorted = sortByDistance(input, from);
    expect(sorted.map((a) => a.id)).toEqual(["near", "far"]);
    expect(input.map((a) => a.id)).toEqual(["far", "near"]);
  });
});
