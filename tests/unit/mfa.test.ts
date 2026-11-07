import { describe, expect, it } from "vitest";
import { loginMethods } from "~/utils/mfa";

describe("loginMethods", () => {
  it("offers every method the account has, then recovery codes", () => {
    expect(loginMethods(["totp", "email"], "totp")).toEqual(["totp", "email", "recovery"]);
  });

  it("offers only the one method an account has", () => {
    expect(loginMethods(["email"], "email")).toEqual(["email", "recovery"]);
  });

  it("falls back to the preferred method when the list is missing", () => {
    expect(loginMethods([], "totp")).toEqual(["totp", "recovery"]);
  });

  it("offers everything when the API says nothing", () => {
    expect(loginMethods([], null)).toEqual(["totp", "email", "recovery"]);
  });
});
