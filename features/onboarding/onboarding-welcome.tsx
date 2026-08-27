"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import { AuthForm } from "@/features/auth/auth-form";
import { Link, useRouter } from "@/i18n/navigation";

type Props = {
  onContinueWithoutLogin: () => void;
};

/**
 * 온보딩 진입 전 첫 화면. 아이디/비밀번호 가입·로그인 폼을 보여주고,
 * 로그인 없이도 항상 진행할 수 있는 게스트 경로를 유지한다 — 로그인은 강제하지 않는다.
 * 인증 성공 시 홈으로 보내고, 홈의 완료 가드가 미완료 프로필을 다시 온보딩으로 돌린다.
 */
export function OnboardingWelcome({ onContinueWithoutLogin }: Props) {
  const t = useTranslations("Onboarding");
  const router = useRouter();

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

      <div className="grid w-full max-w-xs justify-items-center gap-3">
        <AuthForm
          onAuthenticated={() => {
            // Server Action이 세팅한 인증 쿠키를 RSC 트리가 다시 읽도록
            // refresh 후 홈으로 보낸다. 홈의 완료 가드가 미완료 프로필을
            // 온보딩으로 되돌린다.
            router.refresh();
            router.push("/");
          }}
        />

        <button
          type="button"
          onClick={onContinueWithoutLogin}
          className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border border-[#dfe5e1] bg-white px-5 text-sm font-extrabold text-[#33453e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d]"
        >
          {t("continueWithoutLogin")}
        </button>

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
