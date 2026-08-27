import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

function request(query: string) {
  return new Request(`http://localhost/api/address/search?query=${query}`);
}

const kakaoPayload = {
  documents: [
    {
      address_name: "충북 제천시 청전동 111",
      x: "128.1909",
      y: "37.1326",
      address: { address_name: "충북 제천시 청전동 111", region_2depth_name: "제천시" },
      road_address: {
        address_name: "충북 제천시 내토로 295",
        region_2depth_name: "제천시",
      },
    },
  ],
};

beforeEach(() => {
  vi.stubEnv("KAKAO_REST_API_KEY", "test-key");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("GET /api/address/search", () => {
  it("검색어가 없으면 빈 결과를 반환한다", async () => {
    const response = await GET(request(""));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ documents: [] });
  });

  it("검색어가 2자 미만이면 Kakao를 호출하지 않는다", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const response = await GET(request("서"));
    expect(fetchSpy).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({ documents: [] });
  });

  it("Kakao 응답을 앱 도메인 형태로 변환해 반환한다", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(kakaoPayload), { status: 200 }),
    );
    const response = await GET(request("내토로"));
    await expect(response.json()).resolves.toEqual({
      documents: [
        {
          roadAddress: "충북 제천시 내토로 295",
          jibunAddress: "충북 제천시 청전동 111",
          regionSigungu: "제천시",
          lat: 37.1326,
          lng: 128.1909,
        },
      ],
    });
  });

  it("Authorization 헤더에 KakaoAK 키를 담아 호출한다", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify(kakaoPayload), { status: 200 }));
    await GET(request("내토로"));
    const [, init] = fetchSpy.mock.calls[0];
    expect((init?.headers as Record<string, string>).Authorization).toBe(
      "KakaoAK test-key",
    );
  });

  it("API 키가 없으면 503과 빈 결과를 반환하고 throw하지 않는다", async () => {
    vi.stubEnv("KAKAO_REST_API_KEY", "");
    const response = await GET(request("내토로"));
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ documents: [] });
  });

  it("Kakao가 오류를 반환하면 502와 빈 결과를 반환한다", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("rate limited", { status: 429 }),
    );
    const response = await GET(request("내토로"));
    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({ documents: [] });
  });

  it("네트워크 오류가 나도 502와 빈 결과를 반환한다", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"));
    const response = await GET(request("내토로"));
    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({ documents: [] });
  });
});
