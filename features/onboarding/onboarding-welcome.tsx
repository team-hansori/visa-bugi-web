"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import { useState } from "react";

type Props = {
  onContinueWithoutLogin: () => void;
};

/**
 * 온보딩 진입 전 첫 화면. Google 로그인은 아직 연동 전(외부 OAuth 설정
 * 필요)이라 클릭해도 이동하지 않고 준비 중 안내만 보여준다. 로그인 없이도
 * 항상 진행할 수 있는 경로를 유지한다 — 로그인은 강제하지 않는다.
 */
export function OnboardingWelcome({ onContinueWithoutLogin }: Props) {
  const t = useTranslations("Onboarding");
  const [showGoogleNotice, setShowGoogleNotice] = useState(false);

  function handleGoogleLogin() {
    // 실제 Google OAuth 연동 시 이 자리를 아래로 교체한다.
    // (Supabase에 Google 프로바이더 설정 + 아래 호출로 대체 — 익명 세션과
    //  동일하게 Supabase Auth를 쓰므로 별도 인증 라이브러리를 추가하지 않는다.)
    //
    //   await createClient().auth.signInWithOAuth({
    //     provider: "google",
    //     options: { redirectTo: `${window.location.origin}/auth/callback` },
    //   });
    setShowGoogleNotice(true);
  }

  return (
    <section
      aria-labelledby="welcome-title"
      className="flex min-h-[480px] flex-col items-center justify-center gap-6 rounded-[28px] border border-[#e0e7e2] bg-white p-5 text-center shadow-[0_12px_36px_rgba(52,76,65,0.07)] sm:p-8 lg:p-10"
    >
      <Image
        src="/brand/onboarding/visa-bugi-login-hero-v1.png"
        alt="비자부기"
        width={1145}
        height={1373}
        priority
        className="h-auto w-40 sm:w-48"
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

      <div className="grid w-full max-w-xs gap-3">
        <button
          type="button"
          onClick={handleGoogleLogin}
          className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-[#dfe5e1] bg-white px-5 text-sm font-extrabold text-[#33453e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d]"
        >
          {t("googleStart")}
        </button>

        {showGoogleNotice ? (
          <p role="status" className="text-sm font-semibold text-[#6c7873]">
            {t("googleComingSoon")}
          </p>
        ) : null}

        <button
          type="button"
          onClick={onContinueWithoutLogin}
          className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#2d6d5d] px-5 text-sm font-extrabold text-white shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d]"
        >
          {t("continueWithoutLogin")}
        </button>
      </div>
    </section>
  );
}
