import { describe, expect, it } from "vitest";
import { getMarkerPosition, REGION_CENTERS } from "@/features/map/geo";

describe("getMarkerPosition", () => {
  it("offsets the first marker from the region center", () => {
    const center = REGION_CENTERS.cheongju;
    const position = getMarkerPosition("cheongju", 0);
    expect(position.lat).toBeCloseTo(center.lat + 0.004, 5);
    expect(position.lng).toBeCloseTo(center.lng - 0.003, 5);
  });

  it("wraps the offset index so any marker count is supported", () => {
    const first = getMarkerPosition("chungju", 0);
    const wrapped = getMarkerPosition("chungju", 3);
    expect(wrapped).toEqual(first);
  });

  it("uses a different center per region", () => {
    const cheongju = getMarkerPosition("cheongju", 0);
    const chungju = getMarkerPosition("chungju", 0);
    expect(cheongju).not.toEqual(chungju);
  });
});
