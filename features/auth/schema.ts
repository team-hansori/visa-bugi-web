import { z } from "zod";
import { routing } from "@/i18n/routing";

export const ID_EMAIL_DOMAIN = "id.visabugi.internal";

/** 아이디를 정규화한다: 앞뒤 공백 제거 + 소문자. */
function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

/** 정규화한 아이디를 내부용 가상 이메일로 바꾼다. 라우팅 불가 TLD라 실제 메일은 나가지 않는다. */
export function toIdEmail(username: string): string {
  return `${normalizeUsername(username)}@${ID_EMAIL_DOMAIN}`;
}

// 관리자 사칭·시스템 계정 혼동을 유발할 수 있는 아이디는 막는다.
const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "root",
  "system",
  "support",
  "help",
  "official",
  "staff",
  "moderator",
]);

const usernameSchema = z
  .string()
  .transform(normalizeUsername)
  .pipe(
    z
      .string()
      .regex(/^[a-z0-9_]{3,30}$/, "아이디는 영문 소문자·숫자·밑줄 3~30자입니다.")
      .refine((value) => !RESERVED_USERNAMES.has(value), {
        message: "사용할 수 없는 아이디입니다.",
      }),
  );

const passwordSchema = z
  .string()
  .min(8, "비밀번호는 8자 이상입니다.")
  .max(72, "비밀번호는 72자 이하입니다.");

const nameSchema = z
  .string()
  .transform((value) => value.trim())
  .pipe(z.string().min(1, "이름을 입력해 주세요.").max(50, "이름은 50자 이하입니다."));

export const signUpSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
  name: nameSchema,
  locale: z.enum(routing.locales),
});

export const signInSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
