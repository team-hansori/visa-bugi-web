"use client";

import { useLocale, useTranslations } from "next-intl";
import { useActionState, useEffect, useRef } from "react";
import { signInWithId, signUpWithId, type AuthActionState } from "./actions";

type Mode = "signIn" | "signUp";
const IDLE: AuthActionState = { status: "idle" };

const fieldClass = "grid gap-1 text-xs font-bold text-[#52615b]";
const inputClass =
  "min-h-12 rounded-xl border border-[#dfe5e1] bg-white px-3 text-sm text-[#20332c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d]";
const hintClass = "font-normal text-[#8a938e]";

/**
 * 단일 모드(로그인 또는 회원가입) 폼. 모드 선택과 뒤로가기는 상위(OnboardingWelcome)가
 * 3버튼 진입 화면으로 관리하고, 여기서는 넘겨받은 mode에 맞는 입력 칸만 그린다.
 */
export function AuthForm({
  mode,
  onAuthenticated,
  onBack,
}: {
  mode: Mode;
  onAuthenticated: () => void;
  onBack: () => void;
}) {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const [signInState, signInAction, signInPending] = useActionState(
    signInWithId,
    IDLE,
  );
  const [signUpState, signUpAction, signUpPending] = useActionState(
    signUpWithId,
    IDLE,
  );

  const state = mode === "signIn" ? signInState : signUpState;
  const pending = mode === "signIn" ? signInPending : signUpPending;

  // 성공 전환은 한 번만 알린다 — onAuthenticated는 인라인 콜백이라 매 렌더
  // 참조가 바뀌고, success 상태가 유지되는 동안 이펙트가 반복 실행될 수 있다.
  const notifiedRef = useRef(false);
  useEffect(() => {
    if (state.status === "success" && !notifiedRef.current) {
      notifiedRef.current = true;
      onAuthenticated();
    }
  }, [state.status, onAuthenticated]);

  return (
    <div className="w-full max-w-xs text-left">
      <button
        type="button"
        onClick={onBack}
        className="mb-3 inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-lg px-1 text-sm font-bold text-[#52615b] transition-colors hover:text-[#20332c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d]"
      >
        <span aria-hidden="true">←</span> {t("back")}
      </button>

      <form
        action={mode === "signIn" ? signInAction : signUpAction}
        className="grid gap-3"
      >
        <input type="hidden" name="locale" value={locale} />

        <div className={fieldClass}>
          <label htmlFor="auth-username">{t("username")}</label>
          <input
            id="auth-username"
            name="username"
            autoComplete="username"
            required
            aria-describedby="auth-username-hint"
            className={inputClass}
          />
          <span id="auth-username-hint" className={hintClass}>
            {t("usernameHint")}
          </span>
        </div>

        {mode === "signUp" ? (
          <div className={fieldClass}>
            <label htmlFor="auth-name">{t("name")}</label>
            <input
              id="auth-name"
              name="name"
              autoComplete="name"
              required
              className={inputClass}
            />
          </div>
        ) : null}

        <div className={fieldClass}>
          <label htmlFor="auth-password">{t("password")}</label>
          <input
            id="auth-password"
            name="password"
            type="password"
            autoComplete={mode === "signIn" ? "current-password" : "new-password"}
            required
            aria-describedby="auth-password-hint"
            className={inputClass}
          />
          <span id="auth-password-hint" className={hintClass}>
            {t("passwordHint")}
          </span>
        </div>

        {state.status === "error" ? (
          <p
            role="alert"
            className="rounded-xl bg-[#fff0ed] px-3 py-2 text-xs font-semibold leading-5 text-[#9f4038]"
          >
            {state.message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="mt-1 inline-flex min-h-12 cursor-pointer items-center justify-center rounded-2xl bg-[#2d6d5d] px-5 text-sm font-extrabold text-white shadow-sm transition-colors hover:bg-[#245d4f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6d5d] disabled:cursor-not-allowed disabled:bg-[#c7d1cc]"
        >
          {pending
            ? t("submitting")
            : mode === "signIn"
              ? t("signInSubmit")
              : t("signUpSubmit")}
        </button>
      </form>
    </div>
  );
}
