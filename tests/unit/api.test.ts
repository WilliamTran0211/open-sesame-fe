import { describe, expect, it } from "vitest";
import { getErrorMessage, getErrorStatus } from "~/utils/api";

const failure = (status: number, data?: object) => ({ response: { status }, data });

describe("getErrorMessage", () => {
  it("prefers the API's error_description", () => {
    expect(
      getErrorMessage(failure(400, { error_description: "Invalid code" }), "fallback"),
    ).toBe("Invalid code");
  });

  it("joins validation messages from FastAPI", () => {
    expect(
      getErrorMessage(failure(422, { detail: [{ msg: "Too short." }, { msg: "Too weak." }] }), "x"),
    ).toBe("Too short. Too weak.");
  });

  it("hides server error details behind the caller's message", () => {
    expect(
      getErrorMessage(failure(500, { error_description: "Traceback ..." }), "Couldn't save."),
    ).toBe("Couldn't save.");
  });

  it("falls back when there is no body", () => {
    expect(getErrorMessage(new Error("boom"), "fallback")).toBe("fallback");
  });
});

describe("getErrorStatus", () => {
  it("reads the response status", () => {
    expect(getErrorStatus(failure(429))).toBe(429);
  });

  it("is undefined when the request never got a response", () => {
    expect(getErrorStatus(new TypeError("Failed to fetch"))).toBeUndefined();
  });
});
