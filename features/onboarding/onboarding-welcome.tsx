"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import { useState } from "react";
import { AuthForm } from "@/features/auth/auth-form";
import { Link, useRouter } from "@/i18n/navigation";

type Props = {
  onContinueWithoutLogin: () => void;
};

type View = "choice" | "signIn" | "signUp";

/**
 * 온보딩 진입 전 첫 화면. 회원가입 / 로그인 / 비회원 조회 3버튼으로 나뉘고,
 * 회원가입·로그인을 누르면 해당 입력 폼으로 바뀐다(뒤로가기로 3버튼 복귀).
 * 비회원 조회는 로그인 없이 익명 계정으로 온보딩을 시작한다 — 로그인은 강제하지 않는다.
 */
export function OnboardingWelcome({ onContinueWithoutLogin }: Props) {
  const t = useTranslations("Onboarding");
  const authT = useTranslations("Auth");
  const router = useRouter();
  const [view, setView] = useState<View>("choice");

  function goHome() {
    // Server Action이 세팅한 인증 쿠키를 RSC 트리가 다시 읽도록 refresh 후
    // 홈으로 보낸다. 홈의 완료 가드가 미완료 프로필을 온보딩으로 되돌린다.
    router.refresh();
    router.push("/");
  }

  return (
    <section
      aria-labelledby="welcome-title"
      className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-sm flex-col items-center justify-between gap-8 px-4 py-10 text-center"
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        <Image
          src="/brand/onboarding/visa-bugi-login-hero-v1.png"
          alt="비자부기"
          width={1145}
          height={1373}
          priority
          className="h-auto w-32 sm:w-40"
        />

        <div>
          <h2
            id="welcome-title"
            className="text-2xl font-black leading-tight tracking-[-0.04em] text-[#20332c] sm:text-3xl"
          >
            {t("welcomeTitle")}
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#6c7873] sm:text-base">
            {t("welcomeDescription")}
          </p>
        </div>
      </div>

      <div className="grid w-full max-w-xs gap-3">
        {view === "choice" ? (
          <>
            <button
              type="button"
              onClick={() => setView("signUp")}
              className="inline-flex min-h-14 w-full cursor-pointer items-center justify-center rounded-2xl bg-[#2d6d5d] px-5 text-sm font-extrabold text-white shadow-sm transition-colors hover:bg-[#245d4f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d]"
            >
              {authT("tabSignUp")}
            </button>
            <button
              type="button"
              onClick={() => setView("signIn")}
              className="inline-flex min-h-14 w-full cursor-pointer items-center justify-center rounded-2xl border-2 border-[#2d6d5d] bg-white px-5 text-sm font-extrabold text-[#245d4f] transition-colors hover:bg-[#eef5f2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d]"
            >
              {authT("tabSignIn")}
            </button>
            <button
              type="button"
              onClick={onContinueWithoutLogin}
              className="inline-flex min-h-14 w-full cursor-pointer items-center justify-center rounded-2xl border border-[#dfe5e1] bg-white px-5 text-sm font-extrabold text-[#33453e] transition-colors hover:border-[#c4cfc9] hover:bg-[#f2f5f2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d]"
            >
              {t("continueWithoutLogin")}
            </button>
          </>
        ) : (
          <AuthForm
            mode={view}
            onAuthenticated={goHome}
            onBack={() => setView("choice")}
          />
        )}

        <p className="mt-1 max-w-xs text-center text-xs leading-5 text-[#8a938e]">
          {t.rich("consentNotice", {
            terms: (chunks) => (
              <Link
                href="/terms"
                className="font-semibold text-[#52615b] underline underline-offset-2"
              >
                {chunks}
              </Link>
            ),
            privacy: (chunks) => (
              <Link
                href="/privacy"
                className="font-semibold text-[#52615b] underline underline-offset-2"
              >
                {chunks}
              </Link>
            ),
          })}
        </p>
      </div>
    </section>
  );
}
