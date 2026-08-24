import { beforeEach, describe, expect, it, vi } from "vitest";

const upsertProfiles = vi.fn();
const upsertVisaProfile = vi.fn();
const getUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser },
    from: (table: string) => ({
      upsert: table === "profiles" ? upsertProfiles : upsertVisaProfile,
    }),
  }),
}));

const { saveOnboarding } = await import("./actions");

const validPayload = {
  locale: "ko",
  gender: "unspecified",
  birthdate: "1998-04-12",
  nationality: "VN",
  currentVisaCode: "E-9",
  addressRoad: "충북 제천시 내토로 295",
  addressJibun: "충북 제천시 청전동 111",
  regionSigungu: "제천시",
  lat: 37.1326,
  lng: 128.1909,
  koreanLevelType: "TOPIK",
  koreanLevelValue: 3,
  targetVisaCode: "E-7-4R",
  e9E10H2ResidenceYears: 3,
};

function formDataOf(payload: unknown) {
  const formData = new FormData();
  formData.set("payload", JSON.stringify(payload));
  return formData;
}

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  upsertProfiles.mockResolvedValue({ error: null });
  upsertVisaProfile.mockResolvedValue({ error: null });
});

describe("saveOnboarding", () => {
  it("익명 세션조차 없으면(부트스트랩 실패) 저장하지 않고 오류를 반환한다", async () => {
    // 정상 흐름에서는 Task 10의 마운트 훅이 이미 익명 세션을 발급해 둔다.
    // 이 케이스는 그게 실패했거나 쿠키가 막힌 예외 상황이다.
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    const result = await saveOnboarding({ status: "idle" }, formDataOf(validPayload));
    expect(result.status).toBe("error");
    expect(upsertProfiles).not.toHaveBeenCalled();
    expect(upsertVisaProfile).not.toHaveBeenCalled();
  });

  it("검증에 실패한 값은 저장하지 않는다", async () => {
    const result = await saveOnboarding(
      { status: "idle" },
      formDataOf({ ...validPayload, birthdate: "2999-01-01" }),
    );
    expect(result.status).toBe("error");
    expect(upsertVisaProfile).not.toHaveBeenCalled();
  });

  it("JSON이 깨져 있으면 오류를 반환한다", async () => {
    const formData = new FormData();
    formData.set("payload", "{not-json");
    const result = await saveOnboarding({ status: "idle" }, formData);
    expect(result.status).toBe("error");
  });

  it("profiles에 신원 정보를 저장한다", async () => {
    await saveOnboarding({ status: "idle" }, formDataOf(validPayload));
    expect(upsertProfiles).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        locale: "ko",
        gender: "unspecified",
        birthdate: "1998-04-12",
        nationality: "VN",
      }),
      { onConflict: "user_id" },
    );
  });

  it("판정 필드는 컬럼에, 비자 전용 필드는 visa_details에 저장한다", async () => {
    await saveOnboarding({ status: "idle" }, formDataOf(validPayload));
    expect(upsertVisaProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        current_visa_code: "E-9",
        target_visa_code: "E-7-4R",
        korean_level_type: "TOPIK",
        korean_level_value: 3,
        region_sigungu: "제천시",
        visa_details: { e9E10H2ResidenceYears: 3 },
      }),
      { onConflict: "user_id" },
    );
  });

  it("F-2-R 학력은 visa_details가 아니라 education_level 컬럼에 저장한다", async () => {
    await saveOnboarding(
      { status: "idle" },
      formDataOf({
        ...validPayload,
        targetVisaCode: "F-2-R",
        e9E10H2ResidenceYears: undefined,
        educationLevel: "ASSOCIATE_OR_ABOVE",
      }),
    );
    const [row] = upsertVisaProfile.mock.calls[0];
    expect(row.education_level).toBe("ASSOCIATE_OR_ABOVE");
    expect(row.visa_details).toEqual({});
  });

  it("D-2 재학 정보는 visa_details에 저장한다", async () => {
    await saveOnboarding(
      { status: "idle" },
      formDataOf({
        ...validPayload,
        targetVisaCode: "D-2",
        e9E10H2ResidenceYears: undefined,
        universityName: "충북대학교",
        departmentName: "융합소프트웨어학과",
        academicStatus: "BACHELOR_3_4",
        programStartDate: "2024-03-02",
      }),
    );
    const [row] = upsertVisaProfile.mock.calls[0];
    expect(row.visa_details).toEqual({
      universityName: "충북대학교",
      departmentName: "융합소프트웨어학과",
      academicStatus: "BACHELOR_3_4",
      programStartDate: "2024-03-02",
    });
  });

  it("저장에 성공하면 success를 반환한다", async () => {
    const result = await saveOnboarding({ status: "idle" }, formDataOf(validPayload));
    expect(result.status).toBe("success");
  });

  it("DB 오류가 나면 error를 반환한다", async () => {
    upsertVisaProfile.mockResolvedValue({ error: { message: "boom" } });
    const result = await saveOnboarding({ status: "idle" }, formDataOf(validPayload));
    expect(result.status).toBe("error");
  });
});
