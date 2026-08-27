"use client";

import { useTranslations } from "next-intl";
import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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

type Translator = ReturnType<typeof useTranslations<"Onboarding">>;

/** 스텝 제목/설명 등 다국어 문구를 t()로부터 조립한다. 컴포넌트 안에서만 호출한다. */
function buildStepTitles(t: Translator): Record<StepId, string> {
  return {
    locale: t("stepTitles.locale"),
    nationality: t("stepTitles.nationality"),
    gender: t("stepTitles.gender"),
    birthdate: t("stepTitles.birthdate"),
    currentVisa: t("stepTitles.currentVisa"),
    address: t("stepTitles.address"),
    koreanLevel: t("stepTitles.koreanLevel"),
    targetVisa: t("stepTitles.targetVisa"),
    f2rDetail: t("stepTitles.f2rDetail"),
    e74rDetail: t("stepTitles.e74rDetail"),
    f4rDetail: t("stepTitles.f4rDetail"),
    d2Detail: t("stepTitles.d2Detail"),
  };
}

function buildStepDescriptions(t: Translator): Record<StepId, string> {
  return {
    locale: t("stepDescriptions.locale"),
    nationality: t("stepDescriptions.nationality"),
    gender: t("stepDescriptions.gender"),
    birthdate: t("stepDescriptions.birthdate"),
    currentVisa: t("stepDescriptions.currentVisa"),
    address: t("stepDescriptions.address"),
    koreanLevel: t("stepDescriptions.koreanLevel"),
    targetVisa: t("stepDescriptions.targetVisa"),
    f2rDetail: t("stepDescriptions.f2rDetail"),
    e74rDetail: t("stepDescriptions.e74rDetail"),
    f4rDetail: t("stepDescriptions.f4rDetail"),
    d2Detail: t("stepDescriptions.d2Detail"),
  };
}

function buildGenderOptions(t: Translator) {
  return [
    { id: "female", label: t("genderOptions.female") },
    { id: "male", label: t("genderOptions.male") },
    { id: "unspecified", label: t("genderOptions.unspecified") },
  ];
}

function buildNationalityOptions(t: Translator) {
  return [
    { id: "VN", label: t("nationalityOptions.VN") },
    { id: "UZ", label: t("nationalityOptions.UZ") },
    { id: "NP", label: t("nationalityOptions.NP") },
    { id: "KH", label: t("nationalityOptions.KH") },
    { id: "CN", label: t("nationalityOptions.CN") },
    { id: "OT", label: t("nationalityOptions.OT") },
  ];
}

function buildCurrentVisaLabels(t: Translator): Record<string, string> {
  return {
    "D-2": t("currentVisaOptions.D-2"),
    "D-10": t("currentVisaOptions.D-10"),
    "E-9": t("currentVisaOptions.E-9"),
    "E-10": t("currentVisaOptions.E-10"),
    "H-2": t("currentVisaOptions.H-2"),
    "F-4": t("currentVisaOptions.F-4"),
    OTHER: t("currentVisaOptions.OTHER"),
    UNKNOWN: t("currentVisaOptions.UNKNOWN"),
  };
}

function buildTargetVisaLabels(t: Translator): Record<TargetVisaCode, string> {
  return {
    "F-2-R": t("targetVisaOptions.F-2-R"),
    "E-7-4R": t("targetVisaOptions.E-7-4R"),
    "F-4-R": t("targetVisaOptions.F-4-R"),
    "D-2": t("targetVisaOptions.D-2"),
  };
}

function buildEducationOptions(t: Translator) {
  return [
    { id: "ASSOCIATE_OR_ABOVE", label: t("educationOptions.ASSOCIATE_OR_ABOVE") },
    { id: "BELOW_ASSOCIATE", label: t("educationOptions.BELOW_ASSOCIATE") },
  ];
}

function buildResidenceYearOptions(t: Translator) {
  return [
    { id: "1", label: t("residenceYearOptions.1") },
    { id: "2", label: t("residenceYearOptions.2") },
    { id: "3", label: t("residenceYearOptions.3") },
    { id: "4", label: t("residenceYearOptions.4") },
  ];
}

function buildMigrationTypeOptions(t: Translator) {
  return [
    {
      id: "EXISTING_RESIDENT",
      label: t("migrationTypeLabels.EXISTING_RESIDENT"),
      description: t("migrationTypeDescriptions.EXISTING_RESIDENT"),
    },
    {
      id: "DOMESTIC_TRANSFER",
      label: t("migrationTypeLabels.DOMESTIC_TRANSFER"),
      description: t("migrationTypeDescriptions.DOMESTIC_TRANSFER"),
    },
    {
      id: "OVERSEAS_TRANSFER",
      label: t("migrationTypeLabels.OVERSEAS_TRANSFER"),
      description: t("migrationTypeDescriptions.OVERSEAS_TRANSFER"),
    },
  ];
}

export function OnboardingForm() {
  const t = useTranslations("Onboarding");
  const STEP_TITLES = buildStepTitles(t);
  const STEP_DESCRIPTIONS = buildStepDescriptions(t);
  const GENDER_OPTIONS = buildGenderOptions(t);
  const NATIONALITY_OPTIONS = buildNationalityOptions(t);
  const CURRENT_VISA_LABELS = buildCurrentVisaLabels(t);
  const TARGET_VISA_LABELS = buildTargetVisaLabels(t);
  const EDUCATION_OPTIONS = buildEducationOptions(t);
  const RESIDENCE_YEAR_OPTIONS = buildResidenceYearOptions(t);
  const MIGRATION_TYPE_OPTIONS = buildMigrationTypeOptions(t);
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

  // 데모 진행을 위해 온보딩을 마쳐야 홈으로 넘어간다. 홈(app)/page.tsx가
  // user_visa_profile 저장 여부로 같은 게이트를 서버에서도 다시 확인한다.
  useEffect(() => {
    if (state.status === "success") {
      router.push("/");
    }
  }, [state.status, router]);

  const sequence = useMemo(
    () => getStepSequence(values.targetVisaCode),
    [values.targetVisaCode],
  );
  const stepIndex = getStepIndex(sequence, searchParams.get("step") ?? "");
  const currentStep = sequence[stepIndex];
  const isLastStep = stepIndex === sequence.length - 1;
  const totalSteps = sequence.length;

  // 스텝이 바뀔 때 키보드·스크린리더 포커스를 새 질문 제목으로 옮긴다.
  // (main의 코드 리뷰 반영 커밋 ff616ac에서 도입된 접근성 동작 — URL
  // 기반 퍼널로 재작성하며 빠졌던 것을 복원)
  const questionHeadingRef = useRef<HTMLHeadingElement>(null);
  const previousStepIndexRef = useRef(stepIndex);

  useEffect(() => {
    if (previousStepIndexRef.current === stepIndex) return;
    previousStepIndexRef.current = stepIndex;
    questionHeadingRef.current?.focus();
  }, [stepIndex]);

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

  /**
   * 브라우저 히스토리(router.back())에 의존하지 않는다 — 홈 게이트
   * 리다이렉트가 끼어있으면 히스토리 스택이 예상과 달라져 엉뚱한 곳으로
   * 돌아가는 문제가 있었다. stepIndex 기준으로 목적지를 직접 결정한다.
   */
  function handleBack() {
    if (stepIndex === 0) {
      router.push(pathname);
      return;
    }
    goToStep(stepIndex - 1);
  }

  const targetVisaOptions = useMemo(() => {
    const recommended = values.currentVisaCode
      ? recommendTargetVisas(
          values.currentVisaCode as (typeof CURRENT_VISA_OPTIONS)[number],
        )
      : [...TARGET_VISA_CODES];
    return recommended.map((code) => ({ id: code, label: TARGET_VISA_LABELS[code] }));
    // TARGET_VISA_LABELS도 넣는다 — 안 넣으면 언어를 바꿔도(currentVisaCode는
    // 그대로인데) 목표비자 라벨이 이전 언어로 굳어 있는 실제 버그가 있었다.
  }, [values.currentVisaCode, TARGET_VISA_LABELS]);

  const canSubmit =
    isLastStep &&
    isStepComplete &&
    onboardingSubmissionSchema.safeParse(submissionPayload).success;

  // URL에 step 파라미터가 전혀 없으면(첫 진입) 로그인/비로그인 시작 화면을
  // 먼저 보여준다. "로그인 없이 시작하기"를 누르면 첫 스텝으로 이동한다.
  const hasStepParam = searchParams.get("step") !== null;

  if (!hasStepParam) {
    return <OnboardingWelcome onContinueWithoutLogin={() => goToStep(0)} />;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8 flex items-center gap-3">
        <button
          type="button"
          onClick={handleBack}
          aria-label={t("previous")}
          className="grid size-9 shrink-0 place-items-center rounded-xl text-[#3a4a44] hover:bg-[#f2f5f2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d]"
        >
          <Icon name="chevron-left" className="size-5" aria-hidden="true" />
        </button>
        <div
          className="h-3 flex-1 overflow-hidden rounded-full bg-[#e8edea]"
          role="progressbar"
          aria-valuenow={stepIndex + 1}
          aria-valuemin={1}
          aria-valuemax={totalSteps}
          aria-label={`${stepIndex + 1} / ${totalSteps}`}
        >
          <div
            className="h-full rounded-full bg-[#2d6d5d] transition-[width]"
            style={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      <section aria-labelledby="question-title" className="flex flex-col">
        <div>
          <p className="text-xs font-extrabold text-[#2d6d5d]">
            {t("questionLabel", { index: stepIndex + 1 })}
          </p>
          <h2
            ref={questionHeadingRef}
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

        <p className="mt-5 text-center text-xs leading-5 text-[#8a938e]">
          {t("privacyNotice")}
        </p>
      </section>
    </div>
  );
}
