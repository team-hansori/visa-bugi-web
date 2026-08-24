import { describe, expect, it } from "vitest";
import { mapKakaoDocument, normalizeSigungu } from "./normalize";

describe("normalizeSigungu", () => {
  it("시 단위 이름은 그대로 반환한다", () => {
    expect(normalizeSigungu("제천시")).toBe("제천시");
  });

  it("군 단위 이름은 그대로 반환한다", () => {
    expect(normalizeSigungu("괴산군")).toBe("괴산군");
  });

  it("자치구가 붙은 이름은 시 단위까지만 남긴다", () => {
    expect(normalizeSigungu("청주시 흥덕구")).toBe("청주시");
  });

  it("빈 문자열은 빈 문자열을 반환한다", () => {
    expect(normalizeSigungu("")).toBe("");
  });

  it("앞뒤 공백을 제거한다", () => {
    expect(normalizeSigungu("  단양군  ")).toBe("단양군");
  });
});

describe("mapKakaoDocument", () => {
  const doc = {
    address_name: "충북 제천시 청전동 111",
    x: "128.1909",
    y: "37.1326",
    address: {
      address_name: "충북 제천시 청전동 111",
      region_2depth_name: "제천시",
    },
    road_address: {
      address_name: "충북 제천시 내토로 295",
      region_2depth_name: "제천시",
    },
  };

  it("도로명주소와 지번주소를 함께 반환한다", () => {
    expect(mapKakaoDocument(doc)).toEqual({
      roadAddress: "충북 제천시 내토로 295",
      jibunAddress: "충북 제천시 청전동 111",
      regionSigungu: "제천시",
      lat: 37.1326,
      lng: 128.1909,
    });
  });

  it("도로명주소가 없으면 지번주소로 대체한다", () => {
    const result = mapKakaoDocument({ ...doc, road_address: null });
    expect(result?.roadAddress).toBe("충북 제천시 청전동 111");
    expect(result?.regionSigungu).toBe("제천시");
  });

  it("자치구가 붙은 시군구는 시 단위로 정규화한다", () => {
    const result = mapKakaoDocument({
      ...doc,
      road_address: {
        address_name: "충북 청주시 흥덕구 사직대로 100",
        region_2depth_name: "청주시 흥덕구",
      },
    });
    expect(result?.regionSigungu).toBe("청주시");
  });

  it("좌표가 숫자가 아니면 null을 반환한다", () => {
    expect(mapKakaoDocument({ ...doc, x: "", y: "" })).toBeNull();
  });
});
