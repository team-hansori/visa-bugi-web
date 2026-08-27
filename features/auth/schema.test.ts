import { describe, expect, it } from "vitest";
import { signInSchema, signUpSchema, toIdEmail } from "./schema";

describe("toIdEmail", () => {
  it("정규화한 아이디를 고정 도메인 이메일로 만든다", () => {
    expect(toIdEmail("visa_bugi")).toBe("visa_bugi@id.visabugi.internal");
  });
  it("대문자·공백을 정규화한다", () => {
    expect(toIdEmail("  Visa_Bugi  ")).toBe("visa_bugi@id.visabugi.internal");
  });
});

describe("signUpSchema", () => {
  const base = {
    username: "visa_bugi",
    password: "secret12",
    name: "홍길동",
    locale: "ko",
  };

  it("정상 입력을 통과시킨다", () => {
    expect(signUpSchema.parse(base)).toEqual(base);
  });

  it("아이디는 소문자·숫자·밑줄 3~30자만 허용한다", () => {
    expect(signUpSchema.safeParse({ ...base, username: "AB" }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...base, username: "has space" }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...base, username: "a".repeat(31) }).success).toBe(false);
  });

  it("비밀번호는 8~72자", () => {
    expect(signUpSchema.safeParse({ ...base, password: "short" }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...base, password: "x".repeat(73) }).success).toBe(false);
  });

  it("이름은 trim 후 1~50자", () => {
    expect(signUpSchema.safeParse({ ...base, name: "   " }).success).toBe(false);
    expect(signUpSchema.parse({ ...base, name: "  홍길동  " }).name).toBe("홍길동");
  });

  it("username을 소문자로 정규화한다", () => {
    expect(signUpSchema.parse({ ...base, username: "Visa_Bugi" }).username).toBe("visa_bugi");
  });

  it("예약된 아이디는 거부한다", () => {
    expect(signUpSchema.safeParse({ ...base, username: "admin" }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...base, username: "Support" }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...base, username: "MODERATOR" }).success).toBe(false);
  });

  it("지원하지 않는 locale은 거부한다", () => {
    expect(signUpSchema.safeParse({ ...base, locale: "en" }).success).toBe(false);
  });
});

describe("signInSchema", () => {
  it("아이디·비밀번호만 받는다", () => {
    expect(
      signInSchema.parse({ username: "visa_bugi", password: "secret12" }),
    ).toEqual({ username: "visa_bugi", password: "secret12" });
  });

  it("아이디를 소문자로 정규화한다", () => {
    expect(
      signInSchema.parse({ username: "Visa_Bugi", password: "secret12" }).username,
    ).toBe("visa_bugi");
  });
});
