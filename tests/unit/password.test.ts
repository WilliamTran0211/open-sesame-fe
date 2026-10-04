import { describe, expect, it } from "vitest";
import { getPasswordChecks, passwordProblem } from "~/utils/password";

describe("getPasswordChecks", () => {
  it.each(["Ledger_line9", "Ledger-line9", "Ledger.line9", "Ledger!line9"])(
    "counts any symbol in %s as a special character",
    (password) => expect(getPasswordChecks(password).every(Boolean)).toBe(true),
  );

  it("doesn't count a space as a special character", () => {
    expect(getPasswordChecks("Ledger line9")[4]).toBe(false);
  });
});

describe("passwordProblem", () => {
  it("accepts a strong password", () => {
    expect(passwordProblem("Ledger_line9")).toBeNull();
  });

  it("flags a password the API would reject as too long", () => {
    expect(passwordProblem(`Aa1_${"x".repeat(97)}`)).toBe("auth.errors.passwordTooLong");
  });

  it("flags a password containing the person's name", () => {
    expect(passwordProblem("Pham_2026!x", "Pham")).toBe("auth.errors.weakPassword");
  });
});
