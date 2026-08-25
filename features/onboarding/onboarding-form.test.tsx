import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const replace = vi.fn();
const push = vi.fn();
let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParams,
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ replace, push }),
  usePathname: () => "/onboarding",
}));

vi.mock("./actions", () => ({
  saveOnboarding: vi.fn(async () => ({ status: "success" as const })),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) => {
    if (key === "questionLabel") return `질문 ${values?.index}`;
    const map: Record<string, string> = {
      badge: "간단 설정 · 약 2분",
      heroTitle: "나에게 맞는 안내를 준비할게요",
      heroDescription:
        "로그인 화면 없이 바로 이용할 수 있고, 선택 결과는 이 브라우저에 안전하게 보관됩니다.",
      privacyTitle: "개인정보 최소 수집",
      privacyNotice:
        "여기서 안내하는 내용은 참고용이며, 최종 자격 판정은 관할 출입국·외국인관서에서 확인해야 합니다.",
      previous: "이전",
      next: "다음",
      submit: "설정 완료",
      submitting: "저장하는 중...",
      saveSuccess: "설정이 저장되었습니다.",
    };
    return map[key] ?? key;
  },
}));

const mockSupabaseClient = { auth: {} };
vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

const ensureAnonymousSession = vi.fn<(client: unknown) => Promise<{ id: string }>>(
  async () => ({ id: "anon-1" }),
);
vi.mock("@/lib/supabase/ensure-anonymous-session", () => ({
  ensureAnonymousSession: (client: unknown) => ensureAnonymousSession(client),
}));

const { OnboardingForm } = await import("./onboarding-form");

beforeEach(() => {
  vi.clearAllMocks();
  ensureAnonymousSession.mockResolvedValue({ id: "anon-1" });
  searchParams = new URLSearchParams();
  window.sessionStorage.clear();
});

describe("OnboardingForm", () => {
  it("첫 진입 시(step 파라미터 없음) 시작 화면을 보여준다", () => {
    render(<OnboardingForm />);
    expect(
      screen.getByRole("button", { name: "로그인 없이 시작하기" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /어떤 언어가 편한가요/ }),
    ).not.toBeInTheDocument();
  });

  it("시작 화면에서 로그인 없이 시작하기를 누르면 첫 스텝으로 이동한다", async () => {
    const user = userEvent.setup();
    render(<OnboardingForm />);

    await user.click(screen.getByRole("button", { name: "로그인 없이 시작하기" }));

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith(expect.stringContaining("step=locale")),
    );
  });

  it("진행률을 표시한다", () => {
    searchParams = new URLSearchParams("step=locale");
    render(<OnboardingForm />);
    expect(screen.getByText("1 / 8")).toBeInTheDocument();
  });

  it("URL의 step 파라미터에 해당하는 스텝을 보여준다", () => {
    searchParams = new URLSearchParams("step=gender");
    render(<OnboardingForm />);
    expect(screen.getByRole("heading", { name: /성별/ })).toBeInTheDocument();
  });

  it("모르는 step 값이면 첫 스텝으로 되돌린다", () => {
    searchParams = new URLSearchParams("step=nonsense");
    render(<OnboardingForm />);
    expect(
      screen.getByRole("heading", { name: /어떤 언어가 편한가요/ }),
    ).toBeInTheDocument();
  });

  it("선택하지 않으면 다음 버튼이 비활성화된다", () => {
    searchParams = new URLSearchParams("step=locale");
    render(<OnboardingForm />);
    expect(screen.getByRole("button", { name: /다음/ })).toBeDisabled();
  });

  it("선택 후 다음을 누르면 URL 스텝을 갱신한다", async () => {
    const user = userEvent.setup();
    searchParams = new URLSearchParams("step=locale");
    render(<OnboardingForm />);

    await user.click(screen.getByRole("button", { name: "한국어" }));
    await user.click(screen.getByRole("button", { name: /다음/ }));

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith(
        expect.stringContaining("step=nationality"),
      ),
    );
  });

  it("첫 스텝에서는 이전 버튼이 비활성화된다", () => {
    searchParams = new URLSearchParams("step=locale");
    render(<OnboardingForm />);
    expect(screen.getByRole("button", { name: /이전/ })).toBeDisabled();
  });

  it("답변을 sessionStorage에 보존한다", async () => {
    const user = userEvent.setup();
    searchParams = new URLSearchParams("step=locale");
    render(<OnboardingForm />);

    await user.click(screen.getByRole("button", { name: "한국어" }));

    await waitFor(() => {
      const saved = window.sessionStorage.getItem("visa-bugi-onboarding");
      expect(saved).toContain("ko");
    });
  });

  it("목표비자 스텝에서 현재 체류자격 기반 추천만 보여준다", async () => {
    searchParams = new URLSearchParams("step=targetVisa");
    window.sessionStorage.setItem(
      "visa-bugi-onboarding",
      JSON.stringify({ version: 2, values: { currentVisaCode: "E-9" } }),
    );
    render(<OnboardingForm />);

    // sessionStorage 복원은 마이크로태스크로 미뤄지므로, "F-4-R이 사라질 때까지"
    // 기다려야 복원이 실제로 끝난 시점을 붙잡을 수 있다. E-7-4R은 복원 전
    // 기본 4개 옵션에도 포함돼 있어서 그것만 기다리면 복원 여부를 증명하지 못한다.
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /^F-4-R/ })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: /E-7-4R/ })).toBeInTheDocument();
  });

  it("자동 판정이 아니라 참고용임을 고지한다", () => {
    render(<OnboardingForm />);
    expect(screen.getByText(/참고용/)).toBeInTheDocument();
  });

  it("미래 생년월일은 그 스텝에서 바로 막고 다음으로 넘기지 않는다", async () => {
    const user = userEvent.setup();
    searchParams = new URLSearchParams("step=birthdate");
    render(<OnboardingForm />);

    const input = screen.getByLabelText("생년월일");
    // date input의 max 속성이 있어도 프로그래매틱하게 값을 넣으면 통과하므로 검증이 필요하다.
    await user.clear(input);
    await user.type(input, "2999-01-01");
    await user.click(screen.getByRole("button", { name: /다음/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /미래 날짜는 입력할 수 없습니다/,
    );
    expect(push).not.toHaveBeenCalled();
  });

  it("유효한 생년월일이면 다음 스텝으로 넘어간다", async () => {
    const user = userEvent.setup();
    searchParams = new URLSearchParams("step=birthdate");
    render(<OnboardingForm />);

    await user.clear(screen.getByLabelText("생년월일"));
    await user.type(screen.getByLabelText("생년월일"), "1998-04-12");
    await user.click(screen.getByRole("button", { name: /다음/ }));

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith(expect.stringContaining("step=currentVisa")),
    );
  });

  it("한국어능력 유형만 고르고 급수를 비우면 다음으로 넘기지 않는다", async () => {
    const user = userEvent.setup();
    searchParams = new URLSearchParams("step=koreanLevel");
    render(<OnboardingForm />);

    await user.click(screen.getByRole("button", { name: /TOPIK/ }));
    // 급수를 고르지 않은 상태
    expect(screen.getByRole("button", { name: /다음/ })).toBeDisabled();
    expect(push).not.toHaveBeenCalled();
  });

  it("TOPIK과 사회통합프로그램 급수를 둘 다 채우면 다음으로 넘어간다", async () => {
    const user = userEvent.setup();
    searchParams = new URLSearchParams("step=koreanLevel");
    render(<OnboardingForm />);

    await user.click(screen.getByRole("button", { name: /^TOPIK/ }));
    await user.selectOptions(screen.getByLabelText("TOPIK 급수"), "3");
    await user.click(screen.getByRole("button", { name: /사회통합프로그램/ }));
    await user.selectOptions(screen.getByLabelText("사회통합프로그램 단계"), "2");

    expect(screen.getByRole("button", { name: /다음/ })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: /다음/ }));
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith(expect.stringContaining("step=targetVisa")),
    );
  });

  it("'아직 없어요'를 고르면 급수 없이도 다음으로 넘어간다", async () => {
    const user = userEvent.setup();
    searchParams = new URLSearchParams("step=koreanLevel");
    render(<OnboardingForm />);

    await user.click(screen.getByRole("button", { name: "아직 없어요" }));
    expect(screen.getByRole("button", { name: /다음/ })).toBeEnabled();
  });

  it("시작 화면이 보이는 동안에도 조용히 익명 세션을 발급해 둔다", async () => {
    render(<OnboardingForm />);
    await waitFor(() =>
      expect(ensureAnonymousSession).toHaveBeenCalledWith(mockSupabaseClient),
    );
    // Google 로그인 없이도 항상 진행할 수 있는 경로가 있어야 한다 — 로그인을 강제하지 않는다.
    expect(
      screen.getByRole("button", { name: "로그인 없이 시작하기" }),
    ).toBeEnabled();
  });
});
