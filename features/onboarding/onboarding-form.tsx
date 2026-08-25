"use client";

import { useTranslations } from "next-intl";
import { useActionState, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { usePathname, useRouter } from "@/i18n/navigation";
import { localeNames, routing } from "@/i18n/routing";
import type { AddressSuggestion } from "@/lib/address/normalize";
import { createClient } from "@/lib/supabase/client";
import { ensureAnonymousSession } from "@/lib/supabase/ensure-anonymous-session";
import { saveOnboarding, type SaveOnboardingState } from "./actions";
import { CURRENT_VISA_OPTIONS, TARGET_VISA_CODES, type TargetVisaCode } from "./constants";
import { OnboardingWelcome } from "./onboarding-welcome";
import { onboardingSubmissionSchema, pastDateSchema } from "./schema";
import { getStepIndex, getStepSequence, type StepId } from "./steps";
import { AddressStep } from "./steps/address-step";
import { BirthdateStep } from "./steps/birthdate-step";
import { ChoiceStep } from "./steps/choice-step";
import { D2DetailStep } from "./steps/d2-detail-step";
import { KoreanLevelStep, type KoreanCredential } from "./steps/korean-level-step";
import { recommendTargetVisas } from "./visa-recommendation";

const STORAGE_KEY = "visa-bugi-onboarding";
const STORAGE_VERSION = 2;

type FormValues = {
  locale: string | null;
  nationality: string | null;
  gender: string | null;
  birthdate: string;
  currentVisaCode: string | null;
  address: AddressSuggestion | null;
  koreanCredentials: KoreanCredential[];
  koreanNone: boolean;
  topikLevel: number | null;
  kiipLevel: number | null;
  targetVisaCode: TargetVisaCode | null;
  educationLevel: string | null;
  e9E10H2ResidenceYears: number | null;
  migrationType: string | null;
  universityName: string;
  departmentName: string;
  academicStatus: string;
  programStartDate: string;
};

const EMPTY_VALUES: FormValues = {
  locale: null,
  nationality: null,
  gender: null,
  birthdate: "",
  currentVisaCode: null,
  address: null,
  koreanCredentials: [],
  koreanNone: false,
  topikLevel: null,
  kiipLevel: null,
  targetVisaCode: null,
  educationLevel: null,
  e9E10H2ResidenceYears: null,
  migrationType: null,
  universityName: "",
  departmentName: "",
  academicStatus: "",
  programStartDate: "",
};

const STEP_TITLES: Record<StepId, string> = {
  locale: "어떤 언어가 편한가요?",
  nationality: "국적을 선택해 주세요",
  gender: "성별을 선택해 주세요",
  birthdate: "생년월일이 어떻게 되나요?",
  currentVisa: "지금 가지고 계신 체류자격은 무엇인가요?",
  address: "어디에 살고 계신가요?",
  koreanLevel: "한국어능력 자격이 있으신가요?",
  targetVisa: "어떤 체류자격을 준비하고 계신가요?",
  f2rDetail: "국내 전문학사 이상 학위가 있으신가요?",
  e74rDetail: "최근 10년 내 E-9·E-10·H-2로 몇 년 체류하셨나요?",
  f4rDetail: "다음 중 어떤 상황에 가까우신가요?",
  d2Detail: "재학 정보를 알려주세요",
};

const STEP_DESCRIPTIONS: Record<StepId, string> = {
  locale: "화면에 표시할 언어를 선택해 주세요.",
  nationality: "맞춤 안내를 준비하는 데 사용합니다.",
  gender: "선택하지 않아도 다음 단계로 넘어갈 수 있습니다.",
  birthdate: "나이 요건 확인에 사용합니다.",
  currentVisa: "이 답변으로 준비 가능한 체류자격을 좁혀서 보여드립니다.",
  address: "지역특화형 비자는 인구감소지역 거주(희망)가 조건입니다.",
  koreanLevel: "해당하는 자격을 모두 선택해 주세요. TOPIK과 사회통합프로그램을 둘 다 가지고 계셔도 괜찮습니다.",
  targetVisa: "현재 체류자격을 기준으로 준비 가능한 자격만 보여드립니다.",
  f2rDetail: "학위 또는 생활임금 요건 중 하나를 충족하면 됩니다.",
  e74rDetail: "대략적인 기간이면 충분합니다.",
  f4rDetail: "이주 유형에 따라 필요한 서류가 달라집니다.",
  d2Detail: "광역형 비자 대상 학과인지 확인하는 데 사용합니다.",
};

const GENDER_OPTIONS = [
  { id: "female", label: "여성" },
  { id: "male", label: "남성" },
  { id: "unspecified", label: "선택하지 않음" },
];

const NATIONALITY_OPTIONS = [
  { id: "VN", label: "베트남" },
  { id: "UZ", label: "우즈베키스탄" },
  { id: "NP", label: "네팔" },
  { id: "KH", label: "캄보디아" },
  { id: "CN", label: "중국" },
  { id: "OT", label: "기타" },
];

const CURRENT_VISA_LABELS: Record<string, string> = {
  "D-2": "D-2 (유학)",
  "D-10": "D-10 (구직)",
  "E-9": "E-9 (비전문취업)",
  "E-10": "E-10 (선원취업)",
  "H-2": "H-2 (방문취업)",
  "F-4": "F-4 (재외동포)",
  OTHER: "다른 체류자격",
  UNKNOWN: "잘 모르겠어요",
};

const TARGET_VISA_LABELS: Record<TargetVisaCode, string> = {
  "F-2-R": "F-2-R (지역특화 우수인재)",
  "E-7-4R": "E-7-4R (지역특화 숙련기능인력)",
  "F-4-R": "F-4-R (지역특화 재외동포)",
  "D-2": "D-2 (충북 광역형 유학)",
};

const EDUCATION_OPTIONS = [
  { id: "ASSOCIATE_OR_ABOVE", label: "전문학사 이상 있음" },
  { id: "BELOW_ASSOCIATE", label: "없음" },
];

const RESIDENCE_YEAR_OPTIONS = [
  { id: "1", label: "1년 미만" },
  { id: "2", label: "2년 이상" },
  { id: "3", label: "3년 이상" },
  { id: "4", label: "4년 이상" },
];

const MIGRATION_TYPE_OPTIONS = [
  { id: "EXISTING_RESIDENT", label: "기존 거주자", description: "이미 인구감소지역에 2년 이상 거주" },
  { id: "DOMESTIC_TRANSFER", label: "국내 전입자", description: "국내 다른 지역에서 가족과 함께 이주" },
  { id: "OVERSEAS_TRANSFER", label: "해외 전입자", description: "해외에서 가족과 함께 이주" },
];

export function OnboardingForm() {
  const t = useTranslations("Onboarding");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [stepError, setStepError] = useState("");
  const [state, formAction, isPending] = useActionState<
    SaveOnboardingState,
    FormData
  >(saveOnboarding, { status: "idle" });

  // 새로고침·뒤로가기에도 답변이 남도록 sessionStorage에서 복원한다.
  // 읽기(sessionStorage.getItem)는 동기로 두되, setValues 호출만 콜백으로
  // 미룬다 — 이걸 이펙트 본문에서 바로 부르면 react-hooks/set-state-in-effect가
  // cascading render 경고를 낸다(Task 7의 AddressSearchInput과 같은 원칙).
  // 읽기 자체까지 미루면 아래 persist 이펙트가 먼저 실행돼 sessionStorage를
  // 빈 값으로 덮어쓴 뒤에야 복원이 읽게 되므로, 읽기는 반드시 동기로 유지한다.
  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as { version?: number; values?: Partial<FormValues> };
      if (parsed.version !== STORAGE_VERSION || !parsed.values) return;
      const restored = parsed.values;
      const timer = setTimeout(() => {
        setValues((current) => ({ ...current, ...restored }));
      }, 0);
      return () => clearTimeout(timer);
    } catch {
      // 저장소를 못 읽어도 온보딩은 진행할 수 있어야 한다.
    }
  }, []);

  // 로그인 화면 없이도 마지막 스텝에서 바로 저장할 수 있도록, 진입하자마자
  // 조용히 익명 세션을 발급해 둔다. 실패해도 온보딩 자체는 계속 진행된다 —
  // 마지막 제출에서 saveOnboarding이 다시 시도한다.
  useEffect(() => {
    ensureAnonymousSession(createClient());
  }, []);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: STORAGE_VERSION, values }),
      );
    } catch {
      // 저장 실패는 치명적이지 않다. 사용자는 계속 진행할 수 있다.
    }
  }, [values]);

  const sequence = useMemo(
    () => getStepSequence(values.targetVisaCode),
    [values.targetVisaCode],
  );
  const stepIndex = getStepIndex(sequence, searchParams.get("step") ?? "");
  const currentStep = sequence[stepIndex];
  const isLastStep = stepIndex === sequence.length - 1;
  const totalSteps = sequence.length;

  const goToStep = useCallback(
    (index: number) => {
      const next = sequence[index];
      if (!next) return;
      const params = new URLSearchParams(searchParams.toString());
      params.set("step", next);
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams, sequence],
  );

  function update<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setStepError("");
    setValues((current) => ({ ...current, [key]: value }));
  }

  /** 현재 스텝의 필드가 채워졌는지만 확인한다. 전체 검증은 제출 시 zod가 한다. */
  const isStepComplete = useMemo(() => {
    switch (currentStep) {
      case "locale":
        return values.locale !== null;
      case "nationality":
        return values.nationality !== null;
      case "gender":
        return values.gender !== null;
      case "birthdate":
        return values.birthdate !== "";
      case "currentVisa":
        return values.currentVisaCode !== null;
      case "address":
        return values.address !== null;
      case "koreanLevel":
        if (values.koreanNone) return true;
        if (values.koreanCredentials.length === 0) return false;
        return values.koreanCredentials.every((credential) =>
          credential === "TOPIK" ? values.topikLevel !== null : values.kiipLevel !== null,
        );
      case "targetVisa":
        return values.targetVisaCode !== null;
      case "f2rDetail":
        return values.educationLevel !== null;
      case "e74rDetail":
        return values.e9E10H2ResidenceYears !== null;
      case "f4rDetail":
        return values.migrationType !== null;
      case "d2Detail":
        return (
          values.universityName.trim() !== "" &&
          values.departmentName.trim() !== "" &&
          values.academicStatus !== "" &&
          values.programStartDate !== ""
        );
      default:
        return false;
    }
  }, [currentStep, values]);

  const submissionPayload = useMemo(() => {
    const base = {
      locale: values.locale,
      gender: values.gender,
      birthdate: values.birthdate,
      nationality: values.nationality,
      currentVisaCode: values.currentVisaCode,
      addressRoad: values.address?.roadAddress,
      addressJibun: values.address?.jibunAddress,
      regionSigungu: values.address?.regionSigungu,
      lat: values.address?.lat,
      lng: values.address?.lng,
      topikLevel: values.topikLevel,
      kiipLevel: values.kiipLevel,
      targetVisaCode: values.targetVisaCode,
    };
    switch (values.targetVisaCode) {
      case "F-2-R":
        return { ...base, educationLevel: values.educationLevel };
      case "E-7-4R":
        return { ...base, e9E10H2ResidenceYears: values.e9E10H2ResidenceYears };
      case "F-4-R":
        return { ...base, migrationType: values.migrationType };
      case "D-2":
        return {
          ...base,
          universityName: values.universityName,
          departmentName: values.departmentName,
          academicStatus: values.academicStatus,
          programStartDate: values.programStartDate,
        };
      default:
        return base;
    }
  }, [values]);

  /**
   * 다음 스텝으로 넘어가기 전에 **현재 스텝의 필드만** 검증한다 (스펙 §8).
   * 전체 검증은 제출 시 zod가, 서버 재검증은 Server Action이 한 번 더 한다.
   * 값이 채워졌는지만 보는 `isStepComplete`와 달리 값의 유효성까지 본다.
   */
  function validateCurrentStep(): string | null {
    if (currentStep === "birthdate") {
      const result = pastDateSchema.safeParse(values.birthdate);
      return result.success ? null : (result.error.issues[0]?.message ?? null);
    }
    if (currentStep === "d2Detail") {
      const result = pastDateSchema.safeParse(values.programStartDate);
      return result.success ? null : (result.error.issues[0]?.message ?? null);
    }
    // 나머지 스텝은 고정 선택지라 값이 있으면 곧 유효하다.
    return null;
  }

  function handleNext() {
    if (!isStepComplete) return;
    const error = validateCurrentStep();
    if (error !== null) {
      setStepError(error);
      return;
    }
    setStepError("");
    goToStep(stepIndex + 1);
  }

  const targetVisaOptions = useMemo(() => {
    const recommended = values.currentVisaCode
      ? recommendTargetVisas(
          values.currentVisaCode as (typeof CURRENT_VISA_OPTIONS)[number],
        )
      : [...TARGET_VISA_CODES];
    return recommended.map((code) => ({ id: code, label: TARGET_VISA_LABELS[code] }));
  }, [values.currentVisaCode]);

  const canSubmit =
    isLastStep &&
    isStepComplete &&
    onboardingSubmissionSchema.safeParse(submissionPayload).success;

  // URL에 step 파라미터가 전혀 없으면(첫 진입) 로그인/비로그인 시작 화면을
  // 먼저 보여준다. "로그인 없이 시작하기"를 누르면 첫 스텝으로 이동한다.
  const hasStepParam = searchParams.get("step") !== null;

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-stretch">
      <aside className="rounded-[28px] bg-[#173f36] p-6 text-white sm:p-8 lg:flex lg:flex-col lg:justify-between lg:p-10">
        <div>
          <span className="inline-flex min-h-8 items-center rounded-full bg-white/12 px-3 text-xs font-bold text-[#d9eee5]">
            {t("badge")}
          </span>
          <h1 className="mt-5 text-3xl font-black leading-tight tracking-[-0.05em] sm:text-4xl">
            {t("heroTitle")}
          </h1>
          <p className="mt-4 text-sm leading-6 text-[#d1dfda] sm:text-base sm:leading-7">
            {t("heroDescription")}
          </p>
        </div>
        <div className="mt-8 rounded-2xl bg-white/10 p-4 text-sm leading-6 text-[#e1ede8]">
          <div className="flex items-center gap-2 font-extrabold text-white">
            <Icon name="shield" className="size-5" aria-hidden="true" />
            {t("privacyTitle")}
          </div>
          <p className="mt-2">{t("privacyNotice")}</p>
        </div>
      </aside>

      {!hasStepParam ? (
        <OnboardingWelcome onContinueWithoutLogin={() => goToStep(0)} />
      ) : (
      <section
        className="flex min-h-[480px] flex-col rounded-[28px] border border-[#e0e7e2] bg-white p-5 shadow-[0_12px_36px_rgba(52,76,65,0.07)] sm:p-8 lg:p-10"
        aria-labelledby="question-title"
      >
        <div>
          <div className="flex items-center justify-between gap-4 text-xs font-extrabold text-[#6e7a75]">
            <span>
              {stepIndex + 1} / {totalSteps}
            </span>
            <span>{Math.round(((stepIndex + 1) / totalSteps) * 100)}%</span>
          </div>
          <div
            className="mt-2 h-2 overflow-hidden rounded-full bg-[#e8edea]"
            aria-hidden="true"
          >
            <div
              className="h-full rounded-full bg-[#2d6d5d] transition-[width]"
              style={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        <div className="mt-8">
          <p className="text-xs font-extrabold tracking-[0.08em] text-[#2d6d5d]">
            {t("questionLabel", { index: stepIndex + 1 })}
          </p>
          <h2
            id="question-title"
            tabIndex={-1}
            className="mt-2 text-2xl font-black leading-tight tracking-[-0.04em] focus-visible:rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2d6d5d] sm:text-3xl"
          >
            {STEP_TITLES[currentStep]}
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#6c7873] sm:text-base">
            {STEP_DESCRIPTIONS[currentStep]}
          </p>
        </div>

        <div className="mt-6">
          {currentStep === "locale" ? (
            <ChoiceStep
              legend={STEP_TITLES.locale}
              value={values.locale}
              onChange={(id) => update("locale", id)}
              options={routing.locales.map((code) => ({
                id: code,
                label: localeNames[code],
              }))}
            />
          ) : null}

          {currentStep === "nationality" ? (
            <ChoiceStep
              legend={STEP_TITLES.nationality}
              value={values.nationality}
              onChange={(id) => update("nationality", id)}
              options={NATIONALITY_OPTIONS}
            />
          ) : null}

          {currentStep === "gender" ? (
            <ChoiceStep
              legend={STEP_TITLES.gender}
              value={values.gender}
              onChange={(id) => update("gender", id)}
              options={GENDER_OPTIONS}
            />
          ) : null}

          {currentStep === "birthdate" ? (
            <BirthdateStep
              value={values.birthdate}
              onChange={(value) => update("birthdate", value)}
              error={stepError || undefined}
            />
          ) : null}

          {currentStep === "currentVisa" ? (
            <ChoiceStep
              legend={STEP_TITLES.currentVisa}
              value={values.currentVisaCode}
              onChange={(id) => {
                update("currentVisaCode", id);
                // 현재 체류자격이 바뀌면 이전에 고른 목표비자를 초기화한다.
                setValues((current) => ({ ...current, targetVisaCode: null }));
              }}
              options={CURRENT_VISA_OPTIONS.map((code) => ({
                id: code,
                label: CURRENT_VISA_LABELS[code],
              }))}
            />
          ) : null}

          {currentStep === "address" ? (
            <AddressStep
              value={values.address}
              onSelect={(suggestion) => update("address", suggestion)}
            />
          ) : null}

          {currentStep === "koreanLevel" ? (
            <KoreanLevelStep
              credentials={values.koreanCredentials}
              none={values.koreanNone}
              topikLevel={values.topikLevel}
              kiipLevel={values.kiipLevel}
              onChange={(next) => {
                setStepError("");
                setValues((current) => ({
                  ...current,
                  koreanCredentials: next.credentials,
                  koreanNone: next.none,
                  topikLevel: next.topikLevel,
                  kiipLevel: next.kiipLevel,
                }));
              }}
            />
          ) : null}

          {currentStep === "targetVisa" ? (
            <ChoiceStep
              legend={STEP_TITLES.targetVisa}
              value={values.targetVisaCode}
              onChange={(id) => update("targetVisaCode", id as TargetVisaCode)}
              options={targetVisaOptions}
            />
          ) : null}

          {currentStep === "f2rDetail" ? (
            <ChoiceStep
              legend={STEP_TITLES.f2rDetail}
              value={values.educationLevel}
              onChange={(id) => update("educationLevel", id)}
              options={EDUCATION_OPTIONS}
            />
          ) : null}

          {currentStep === "e74rDetail" ? (
            <ChoiceStep
              legend={STEP_TITLES.e74rDetail}
              value={
                values.e9E10H2ResidenceYears === null
                  ? null
                  : String(values.e9E10H2ResidenceYears)
              }
              onChange={(id) => update("e9E10H2ResidenceYears", Number(id))}
              options={RESIDENCE_YEAR_OPTIONS}
            />
          ) : null}

          {currentStep === "f4rDetail" ? (
            <ChoiceStep
              legend={STEP_TITLES.f4rDetail}
              value={values.migrationType}
              onChange={(id) => update("migrationType", id)}
              options={MIGRATION_TYPE_OPTIONS}
            />
          ) : null}

          {currentStep === "d2Detail" ? (
            <D2DetailStep
              values={{
                universityName: values.universityName,
                departmentName: values.departmentName,
                academicStatus: values.academicStatus,
                programStartDate: values.programStartDate,
              }}
              onChange={(next) =>
                setValues((current) => ({ ...current, ...next }))
              }
              errors={{}}
            />
          ) : null}
        </div>

        {stepError && currentStep !== "birthdate" ? (
          <p
            role="alert"
            className="mt-5 rounded-xl bg-[#fff0ed] px-4 py-3 text-sm font-semibold leading-6 text-[#9f4038]"
          >
            {stepError}
          </p>
        ) : null}

        {state.status === "error" ? (
          <p
            role="alert"
            className="mt-5 rounded-xl bg-[#fff0ed] px-4 py-3 text-sm font-semibold leading-6 text-[#9f4038]"
          >
            {state.message}
          </p>
        ) : null}

        {state.status === "success" ? (
          <p
            role="status"
            className="mt-5 rounded-xl bg-[#e9f3ef] px-4 py-3 text-sm font-semibold leading-6 text-[#1f584a]"
          >
            {t("saveSuccess")}
          </p>
        ) : null}

        <div className="mt-auto flex gap-3 pt-8">
          <button
            type="button"
            onClick={() => goToStep(stepIndex - 1)}
            disabled={stepIndex === 0}
            className="inline-flex min-h-12 items-center justify-center gap-1 rounded-2xl border border-[#dce3df] px-4 text-sm font-extrabold text-[#52615b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Icon name="chevron-left" className="size-4" aria-hidden="true" />
            {t("previous")}
          </button>

          {isLastStep ? (
            <form action={formAction} className="flex-1">
              <input
                type="hidden"
                name="payload"
                value={JSON.stringify(submissionPayload)}
              />
              <button
                type="submit"
                disabled={!canSubmit || isPending}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#2d6d5d] px-5 text-sm font-extrabold text-white shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d] disabled:cursor-not-allowed disabled:bg-[#c7d1cc]"
              >
                {isPending ? t("submitting") : t("submit")}
                <Icon name="check" className="size-4" aria-hidden="true" />
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              disabled={!isStepComplete}
              className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#2d6d5d] px-5 text-sm font-extrabold text-white shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d] disabled:cursor-not-allowed disabled:bg-[#c7d1cc]"
            >
              {t("next")}
              <Icon name="arrow-right" className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </section>
      )}
    </div>
  );
}
