import { render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, expect, it, vi } from "vitest";
import messages from "@/messages/ko.json";

vi.mock("@/features/map/kakao-map", () => ({
  KakaoMap: () => <div data-testid="kakao-map" />,
}));

const { AgencyMap } = await import("./agency-map");

function renderMap() {
  return render(
    <NextIntlClientProvider locale="ko" messages={messages}>
      <AgencyMap />
    </NextIntlClientProvider>,
  );
}

afterEach(() => vi.restoreAllMocks());

it("마운트 시 /api/map/agencies를 호출하고 결과를 목록에 표시한다", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        agencies: [
          {
            id: "a",
            name: "청주시청",
            agencyType: "ADMINISTRATIVE_AGENCY",
            roadAddress: null,
            position: { lat: 36.64, lng: 127.49 },
            phone: "",
            url: null,
            operatingHours: null,
          },
        ],
      }),
      { status: 200 },
    ),
  );
  vi.stubGlobal("fetch", fetchMock);

  renderMap();

  await waitFor(() =>
    expect(screen.getByRole("button", { name: "청주시청" })).toBeInTheDocument(),
  );
  expect(String(fetchMock.mock.calls[0][0])).toContain("/api/map/agencies?");
});

it("API가 실패하면 오류 배너를 보여준다", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response("{}", { status: 502 })),
  );

  renderMap();

  await waitFor(() =>
    expect(screen.getByText(messages.Map.errors.loadFailed)).toBeInTheDocument(),
  );
});

it("503이면 미설정 안내 배너를 보여준다", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response("{}", { status: 503 })),
  );

  renderMap();

  await waitFor(() =>
    expect(
      screen.getByText(messages.Map.errors.notConfigured),
    ).toBeInTheDocument(),
  );
});
