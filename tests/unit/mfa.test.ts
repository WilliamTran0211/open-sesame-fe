import { describe, expect, it } from "vitest";
import { MFA_CODE_PATTERN, normalizeMfaCode } from "~/utils/mfa";

describe("normalizeMfaCode", () => {
  it("drops spaces people paste in", () => {
    expect(normalizeMfaCode(" 123 456 ")).toBe("123456");
  });
});

describe("MFA_CODE_PATTERN", () => {
  it("accepts a 6-digit code", () => {
    expect(MFA_CODE_PATTERN.test("123456")).toBe(true);
  });

  it("accepts a 10-character recovery code with - and _", () => {
    expect(MFA_CODE_PATTERN.test("a1B2c3D4e5")).toBe(true);
    expect(MFA_CODE_PATTERN.test("a1B-c3_4e5")).toBe(true);
  });

  it("rejects other lengths", () => {
    expect(MFA_CODE_PATTERN.test("12345")).toBe(false);
    expect(MFA_CODE_PATTERN.test("1234567")).toBe(false);
    expect(MFA_CODE_PATTERN.test("a1B2c3D4e")).toBe(false);
  });
});
