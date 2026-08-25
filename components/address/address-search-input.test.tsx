import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestTranslator } from "@/lib/test-utils/next-intl-mock";
import { AddressSearchInput } from "./address-search-input";

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => createTestTranslator(namespace),
}));

const suggestion = {
  roadAddress: "충북 제천시 내토로 295",
  jibunAddress: "충북 제천시 청전동 111",
  regionSigungu: "제천시",
  lat: 37.1326,
  lng: 128.1909,
};

function mockSearchResponse(documents: unknown[]) {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ documents }), { status: 200 }),
  );
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("AddressSearchInput", () => {
  it("입력 즉시 요청하지 않고 debounce 후에 한 번만 요청한다", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ documents: [] }), { status: 200 }),
    );
    render(<AddressSearchInput value={null} onSelect={vi.fn()} label="주소" />);

    await user.type(screen.getByLabelText("주소"), "내토로");
    expect(fetchSpy).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(300);
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
  });

  it("검색 결과를 옵션으로 보여준다", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    mockSearchResponse([suggestion]);
    render(<AddressSearchInput value={null} onSelect={vi.fn()} label="주소" />);

    await user.type(screen.getByLabelText("주소"), "내토로");
    await vi.advanceTimersByTimeAsync(300);

    expect(await screen.findByRole("option", { name: /내토로 295/ })).toBeInTheDocument();
  });

  it("결과 개수를 보조기술에 알린다", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    mockSearchResponse([suggestion]);
    render(<AddressSearchInput value={null} onSelect={vi.fn()} label="주소" />);

    await user.type(screen.getByLabelText("주소"), "내토로");
    await vi.advanceTimersByTimeAsync(300);

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("검색 결과 1건"),
    );
  });

  it("결과를 클릭하면 onSelect를 호출한다", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onSelect = vi.fn();
    mockSearchResponse([suggestion]);
    render(<AddressSearchInput value={null} onSelect={onSelect} label="주소" />);

    await user.type(screen.getByLabelText("주소"), "내토로");
    await vi.advanceTimersByTimeAsync(300);
    await user.click(await screen.findByRole("option", { name: /내토로 295/ }));

    expect(onSelect).toHaveBeenCalledWith(suggestion);
  });

  it("방향키와 Enter로 결과를 선택할 수 있다", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onSelect = vi.fn();
    mockSearchResponse([suggestion]);
    render(<AddressSearchInput value={null} onSelect={onSelect} label="주소" />);

    const input = screen.getByLabelText("주소");
    await user.type(input, "내토로");
    await vi.advanceTimersByTimeAsync(300);
    await screen.findByRole("option", { name: /내토로 295/ });

    await user.keyboard("{ArrowDown}{Enter}");
    expect(onSelect).toHaveBeenCalledWith(suggestion);
  });

  it("Escape를 누르면 목록을 닫는다", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    mockSearchResponse([suggestion]);
    render(<AddressSearchInput value={null} onSelect={vi.fn()} label="주소" />);

    const input = screen.getByLabelText("주소");
    await user.type(input, "내토로");
    await vi.advanceTimersByTimeAsync(300);
    await screen.findByRole("option", { name: /내토로 295/ });

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("option")).not.toBeInTheDocument());
  });

  it("combobox 접근성 속성을 갖는다", () => {
    render(<AddressSearchInput value={null} onSelect={vi.fn()} label="주소" />);
    const input = screen.getByLabelText("주소");
    expect(input).toHaveAttribute("role", "combobox");
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(input).toHaveAttribute("aria-autocomplete", "list");
  });

  it("이미 선택된 주소가 있으면 입력창에 표시한다", () => {
    render(<AddressSearchInput value={suggestion} onSelect={vi.fn()} label="주소" />);
    expect(screen.getByLabelText("주소")).toHaveValue("충북 제천시 내토로 295");
  });
});
