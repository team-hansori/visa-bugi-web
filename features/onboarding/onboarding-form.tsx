"use client";

import { useRouter } from "@/i18n/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";

type Answer = { id: string; label: string };
type Question = {
  id: "locale" | "nationality" | "region" | "visa";
  title: string;
  description: string;
  answers: Answer[];
};

const questions: Question[] = [
  { id: "locale", title: "어떤 언어가 편한가요?", description: "화면에 표시할 언어를 선택해 주세요.", answers: [{ id: "ko", label: "한국어" }, { id: "vi", label: "Tiếng Việt" }, { id: "zh", label: "中文" }, { id: "en", label: "English" }] },
  { id: "nationality", title: "국적을 선택해 주세요", description: "맞춤 안내에 필요한 최소 정보만 현재 브라우저 세션에서 사용합니다.", answers: [{ id: "VN", label: "베트남" }, { id: "UZ", label: "우즈베키스탄" }, { id: "NP", label: "네팔" }, { id: "KH", label: "캄보디아" }, { id: "OTHER", label: "기타" }] },
  { id: "region", title: "현재 생활 지역은 어디인가요?", description: "기관 추천에는 GPS 좌표 대신 선택한 지역을 사용할 수 있습니다.", answers: [{ id: "cheongju", label: "청주시" }, { id: "chungju", label: "충주시" }, { id: "jincheon", label: "진천군" }, { id: "eumseong", label: "음성군" }, { id: "unknown", label: "아직 모르겠어요" }] },
  { id: "visa", title: "확인하려는 체류자격이 있나요?", description: "현재는 화면 시연용 선택지이며 공식 판정에는 사용하지 않습니다.", answers: [{ id: "E-7-4R", label: "E-7-4R" }, { id: "F-2-R", label: "F-2-R" }, { id: "OTHER", label: "다른 체류자격" }, { id: "UNKNOWN", label: "잘 모르겠어요" }] },
];

export function OnboardingForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [storageError, setStorageError] = useState("");
  const questionHeadingRef = useRef<HTMLHeadingElement>(null);
  const previousStepRef = useRef(step);
  const question = questions[step];
  const selected = answers[question.id];
  const isLastStep = step === questions.length - 1;

  useEffect(() => {
    if (previousStepRef.current === step) return;
    previousStepRef.current = step;
    questionHeadingRef.current?.focus();
  }, [step]);

  function selectAnswer(value: string) {
    setStorageError("");
    setAnswers((current) => ({ ...current, [question.id]: value }));
  }

  function goNext() {
    if (!selected) return;
    if (!isLastStep) {
      setStep((current) => current + 1);
      return;
    }
    try {
      window.sessionStorage.setItem("visa-bugi-demo-profile", JSON.stringify({ version: 1, ...answers }));
    } catch {
      setStorageError("선택 결과를 이 브라우저에 저장하지 못했습니다. 브라우저의 저장소 설정을 확인한 뒤 다시 시도해 주세요.");
      return;
    }
    router.push("/");
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-stretch">
      <aside className="rounded-[28px] bg-[#173f36] p-6 text-white sm:p-8 lg:flex lg:flex-col lg:justify-between lg:p-10">
        <div>
          <span className="inline-flex min-h-8 items-center rounded-full bg-white/12 px-3 text-xs font-bold text-[#d9eee5]">간단 설정 · 약 1분</span>
          <h1 className="mt-5 text-3xl font-black leading-tight tracking-[-0.05em] sm:text-4xl">나에게 맞는 안내를 준비할게요</h1>
          <p className="mt-4 text-sm leading-6 text-[#d1dfda] sm:text-base sm:leading-7">로그인 전에는 선택 결과를 현재 브라우저 세션 동안만 보관합니다. GPS와 문서 이미지는 저장하지 않습니다.</p>
        </div>
        <div className="mt-8 rounded-2xl bg-white/10 p-4 text-sm leading-6 text-[#e1ede8]">
          <div className="flex items-center gap-2 font-extrabold text-white"><Icon name="shield" className="size-5" />개인정보 최소 수집</div>
          <p className="mt-2">언어·국적·지역·관심 체류자격만 선택하며 현재 탭을 닫으면 선택 결과가 삭제됩니다.</p>
        </div>
      </aside>

      <section className="flex min-h-[480px] flex-col rounded-[28px] border border-[#e0e7e2] bg-white p-5 shadow-[0_12px_36px_rgba(52,76,65,0.07)] sm:p-8 lg:p-10" aria-labelledby="question-title">
        <div>
          <div className="flex items-center justify-between gap-4 text-xs font-extrabold text-[#6e7a75]"><span>{step + 1} / {questions.length}</span><span>{Math.round(((step + 1) / questions.length) * 100)}%</span></div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e8edea]" aria-hidden="true"><div className="h-full rounded-full bg-[#2d6d5d] transition-[width]" style={{ width: `${((step + 1) / questions.length) * 100}%` }} /></div>
        </div>
        <div className="mt-8">
          <p className="text-xs font-extrabold tracking-[0.08em] text-[#2d6d5d]">질문 {step + 1}</p>
          <h2 ref={questionHeadingRef} id="question-title" tabIndex={-1} className="mt-2 text-2xl font-black leading-tight tracking-[-0.04em] focus-visible:rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2d6d5d] sm:text-3xl">{question.title}</h2>
          <p className="mt-3 text-sm leading-6 text-[#6c7873] sm:text-base">{question.description}</p>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2" role="group" aria-label={question.title}>
          {question.answers.map((answer) => {
            const active = selected === answer.id;
            return (
              <button key={answer.id} type="button" aria-pressed={active} onClick={() => selectAnswer(answer.id)} className={`flex min-h-14 items-center justify-between rounded-2xl border px-4 text-left text-base font-extrabold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d] ${active ? "border-[#2d6d5d] bg-[#e9f3ef] text-[#1f584a]" : "border-[#dfe5e1] bg-white text-[#33453e] hover:border-[#9bb9ac] hover:bg-[#f7faf8]"}`}>
                {answer.label}
                <span className={`grid size-6 place-items-center rounded-full border ${active ? "border-[#2d6d5d] bg-[#2d6d5d] text-white" : "border-[#cbd5cf] text-transparent"}`}><Icon name="check" className="size-3.5" /></span>
              </button>
            );
          })}
        </div>
        {storageError ? <p role="alert" className="mt-5 rounded-xl bg-[#fff0ed] px-4 py-3 text-sm font-semibold leading-6 text-[#9f4038]">{storageError}</p> : null}
        <div className="mt-auto flex gap-3 pt-8">
          <button type="button" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0} className="inline-flex min-h-12 items-center justify-center gap-1 rounded-2xl border border-[#dce3df] px-4 text-sm font-extrabold text-[#52615b] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d]"><Icon name="chevron-left" className="size-4" />이전</button>
          <button type="button" onClick={goNext} disabled={!selected} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#2d6d5d] px-5 text-sm font-extrabold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-[#c7d1cc] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d]">
            {isLastStep ? "설정 완료" : "다음"}<Icon name={isLastStep ? "check" : "arrow-right"} className="size-4" />
          </button>
        </div>
      </section>
    </div>
  );
}
