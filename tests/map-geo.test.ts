import { describe, expect, it } from "vitest";
import { REGION_CENTERS, type RegionId } from "@/features/map/geo";

describe("REGION_CENTERS", () => {
  const regionIds: RegionId[] = ["cheongju", "chungju", "jincheon", "eumseong"];

  it("has a center for every pilot region", () => {
    for (const id of regionIds) {
      expect(REGION_CENTERS[id]).toBeDefined();
    }
  });

  it("keeps every center within plausible South Korea bounds", () => {
    for (const id of regionIds) {
      const { lat, lng } = REGION_CENTERS[id];
      expect(lat).toBeGreaterThan(33);
      expect(lat).toBeLessThan(39);
      expect(lng).toBeGreaterThan(124);
      expect(lng).toBeLessThan(132);
    }
  });
});
