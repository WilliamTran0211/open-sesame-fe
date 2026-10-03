import { describe, expect, it } from "vitest";
import {
  isInternalPath,
  isRegisteredRedirect,
  isValidRedirectUri,
  parseAuthorizeRequest,
  resolveLoginRedirect,
  signInDestination,
} from "~/utils/oauth";

const API = "https://localhost:8000/api/v1";

describe("isInternalPath (open redirect guard)", () => {
  it.each(["/dashboard", "/dashboard/clients?tab=active", "/oauth/authorize?client_id=a&state=b"])(
    "accepts the in-app path %s",
    (path) => expect(isInternalPath(path)).toBe(true),
  );

  it.each([
    ["protocol-relative", "//evil.example/login"],
    ["backslash", "/\\evil.example"],
    ["tab dropped by browsers", "/\t/evil.example"],
    ["newline dropped by browsers", "/\n/evil.example"],
    ["absolute URL", "https://evil.example/"],
    ["javascript scheme", "javascript:alert(1)"],
    ["relative path", "dashboard"],
    ["empty", ""],
  ])("rejects %s", (_label, path) => expect(isInternalPath(path)).toBe(false));
});

describe("resolveLoginRedirect", () => {
  it("returns an in-app redirect", () => {
    expect(resolveLoginRedirect({ redirect: "/dashboard/profile" }, API)).toBe(
      "/dashboard/profile",
    );
  });

  it("ignores an off-site redirect", () => {
    expect(resolveLoginRedirect({ redirect: "//evil.example" }, API)).toBeNull();
    expect(resolveLoginRedirect({ redirect: "/\t/evil.example" }, API)).toBeNull();
  });

  it("turns the API's authorize URL into the consent page", () => {
    const redirectUri = `${API}/oauth/authorize?client_id=app&state=xyz`;
    expect(resolveLoginRedirect({ redirect_uri: redirectUri }, API)).toBe(
      "/oauth/authorize?client_id=app&state=xyz",
    );
  });

  it("ignores a redirect_uri that only looks like the authorize endpoint", () => {
    const lookalike = "https://localhost:8000.evil.example/api/v1/oauth/authorize?state=x";
    expect(resolveLoginRedirect({ redirect_uri: lookalike }, API)).toBeNull();
    expect(
      resolveLoginRedirect({ redirect_uri: "https://evil.example/api/v1/oauth/authorize" }, API),
    ).toBeNull();
  });
});

describe("signInDestination", () => {
  it("sends a consent request back through the API, which skips approved apps", () => {
    expect(signInDestination("/oauth/authorize?client_id=app&state=xyz", API)).toEqual({
      url: `${API}/oauth/authorize?client_id=app&state=xyz`,
      external: true,
    });
  });

  it("keeps other in-app paths in the app", () => {
    expect(signInDestination("/dashboard/profile", API)).toEqual({
      url: "/dashboard/profile",
      external: false,
    });
  });

  it("never turns an off-site path into an external navigation", () => {
    expect(signInDestination("//evil.example/oauth/authorize", API).external).toBe(false);
  });
});

describe("isValidRedirectUri", () => {
  it.each([
    "https://app.example.com/callback",
    "http://localhost:4000/callback",
    "http://127.0.0.1:8080/cb",
    "com.example.app:/oauth",
  ])("accepts %s", (uri) => expect(isValidRedirectUri(uri)).toBe(true));

  it.each([
    ["plain http on a public host", "http://app.example.com/callback"],
    ["a fragment", "https://app.example.com/callback#token"],
    ["javascript", "javascript:alert(1)"],
    ["data", "data:text/html,hi"],
    ["file", "file:///etc/passwd"],
    ["not a URL", "callback"],
  ])("rejects %s", (_label, uri) => expect(isValidRedirectUri(uri)).toBe(false));
});

describe("parseAuthorizeRequest", () => {
  const base = {
    response_type: "code",
    client_id: "app",
    redirect_uri: "https://app.example.com/callback",
    scope: "openid email",
    state: "s1",
  };

  it("accepts a complete request", () => {
    const { request, error } = parseAuthorizeRequest(base);
    expect(error).toBeNull();
    expect(request?.scopes).toEqual(["openid", "email"]);
  });

  it("requires state", () => {
    expect(parseAuthorizeRequest({ ...base, state: "" }).error).toBe("missingState");
  });

  it("rejects the plain PKCE method", () => {
    expect(
      parseAuthorizeRequest({ ...base, code_challenge: "x", code_challenge_method: "plain" })
        .error,
    ).toBe("invalidChallengeMethod");
  });

  it("rejects other response types", () => {
    expect(parseAuthorizeRequest({ ...base, response_type: "token" }).error).toBe(
      "unsupportedResponseType",
    );
  });
});

describe("isRegisteredRedirect (deny without an open redirect)", () => {
  const client = {
    client_id: "app",
    name: "App",
    client_type: "confidential" as const,
    redirect_uris: ["https://app.example.com/callback"],
    is_active: true,
  };

  it("only allows registered URIs", () => {
    expect(isRegisteredRedirect(client, "https://app.example.com/callback")).toBe(true);
    expect(isRegisteredRedirect(client, "https://evil.example/callback")).toBe(false);
  });

  it("refuses when the client is unknown", () => {
    expect(isRegisteredRedirect(null, "https://app.example.com/callback")).toBe(false);
  });
});
