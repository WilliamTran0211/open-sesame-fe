import type { LocationQuery } from "vue-router";

export const CONSENT_PATH = "/oauth/authorize";

export type ScopeLevel = "basic" | "sensitive";

// Scopes the system knows how to describe; their copy lives under oauth.scopes.* in i18n.
// Anything else a client asks for is still shown, flagged as a custom permission.
export const SCOPE_CATALOG: Record<string, { level: ScopeLevel }> = {
  openid: { level: "basic" },
  profile: { level: "basic" },
  email: { level: "basic" },
  offline_access: { level: "sensitive" },
};

// Mirrors the API's ScopeResponseSchema (GET /scopes/list).
export type OAuthScope = {
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
};

export type ClientType = "confidential" | "public";

export const GRANT_TYPES = [
  "authorization_code",
  "refresh_token",
  "client_credentials",
] as const;

export type GrantType = (typeof GRANT_TYPES)[number];

export type OAuthClientInfo = {
  client_id: string;
  name: string;
  client_type: ClientType;
  redirect_uris: string[];
  allowed_scopes?: string[];
  is_active: boolean;
};

// Full client record returned by the /clients endpoints (owner view).
export type OAuthClient = OAuthClientInfo & {
  id: string;
  grant_types: string[];
  allowed_scopes: string[];
  require_pkce: boolean;
  access_token_ttl: number | null;
  refresh_token_ttl: number | null;
  owner_id: string | null;
  created_at: string;
};

export type OAuthClientPayload = {
  name: string;
  redirect_uris: string[];
  grant_types: GrantType[];
  allowed_scopes: string[];
  client_type: ClientType;
  require_pkce: boolean;
  access_token_ttl: number | null;
  refresh_token_ttl: number | null;
};

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

// Accepts https URLs, http only on loopback (local dev), and custom schemes
// (e.g. myapp://callback for native apps). Fragments are never allowed (RFC 6749 §3.1.2).
export function isValidRedirectUri(value: string) {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return false;
  }

  if (url.hash || value.includes("#")) {
    return false;
  }

  if (url.protocol === "https:") {
    return !!url.host;
  }

  if (url.protocol === "http:") {
    return LOOPBACK_HOSTS.has(url.hostname);
  }

  return !UNSAFE_PROTOCOLS.includes(url.protocol);
}

const UNSAFE_PROTOCOLS = ["javascript:", "data:", "file:", "vbscript:"];

// A URL the browser can be sent to: https, http or an app's own scheme
// (com.example.app:/oauth), never script or file URLs.
function isNavigableUrl(value: string) {
  try {
    return !UNSAFE_PROTOCOLS.includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

// Mirrors the query params accepted by the API's GET /oauth/authorize.
export type AuthorizeRequest = {
  responseType: "code";
  clientId: string;
  redirectUri: string;
  scope: string;
  scopes: string[];
  state: string;
  codeChallenge?: string;
  codeChallengeMethod?: "S256";
};

export type AuthorizeRequestError =
  | "unsupportedResponseType"
  | "missingClient"
  | "invalidRedirect"
  | "missingState"
  | "invalidChallengeMethod";

function rawValue(value: LocationQuery[string] | undefined) {
  const item = Array.isArray(value) ? value[0] : value;
  return typeof item === "string" ? item : "";
}

function firstValue(value: LocationQuery[string] | undefined) {
  return rawValue(value).trim();
}

export function parseScopes(scope: string) {
  return [...new Set(scope.split(/\s+/).filter(Boolean))];
}

export function parseAuthorizeRequest(
  query: LocationQuery,
):
  | { request: AuthorizeRequest; error: null }
  | { request: null; error: AuthorizeRequestError } {
  const responseType = firstValue(query.response_type);
  const clientId = firstValue(query.client_id);
  // Passed back to the API untouched: it compares them exactly, and the app checks
  // that state comes back byte for byte.
  const redirectUri = rawValue(query.redirect_uri);
  const scope = firstValue(query.scope);
  const state = rawValue(query.state);
  const codeChallenge = rawValue(query.code_challenge);
  const codeChallengeMethod = firstValue(query.code_challenge_method);

  if (responseType !== "code") {
    return { request: null, error: "unsupportedResponseType" };
  }

  if (!clientId) {
    return { request: null, error: "missingClient" };
  }

  if (!isNavigableUrl(redirectUri)) {
    return { request: null, error: "invalidRedirect" };
  }

  if (!state.trim()) {
    return { request: null, error: "missingState" };
  }

  if (codeChallengeMethod && codeChallengeMethod !== "S256") {
    return { request: null, error: "invalidChallengeMethod" };
  }

  return {
    error: null,
    request: {
      responseType: "code",
      clientId,
      redirectUri,
      scope,
      scopes: parseScopes(scope),
      state,
      codeChallenge: codeChallenge || undefined,
      codeChallengeMethod: codeChallengeMethod ? "S256" : undefined,
    },
  };
}

// Where a redirect goes, for people: the host, or the app's scheme for native
// redirect URIs like com.example.app:/oauth, which have no host.
export function getRedirectLabel(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.host || parsed.protocol.replace(/:$/, "");
  } catch {
    return "";
  }
}

function appendQuery(url: string, params: Record<string, string | undefined>) {
  const target = new URL(url);

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      target.searchParams.set(key, value);
    }
  }

  return target.toString();
}

// RFC 6749 §4.1.2.1 — tell the client the user said no.
export function buildDeniedUrl(request: AuthorizeRequest) {
  return appendQuery(request.redirectUri, {
    error: "access_denied",
    error_description: "The user denied the request",
    state: request.state,
  });
}

export function isRegisteredRedirect(
  client: OAuthClientInfo | null,
  redirectUri: string,
) {
  return !!client?.redirect_uris.includes(redirectUri);
}

const INTERNAL_ORIGIN = "https://open-sesame.invalid";

// True only for a path on this site. Browsers read "//host" and "/\host" as other
// sites and silently drop tabs and newlines ("/\t/host" becomes "//host"), so the
// path is resolved the way a browser would and must keep our origin.
export function isInternalPath(path: string) {
  if (!path.startsWith("/") || /[\\\u0000-\u001f\u007f]/.test(path)) {
    return false;
  }

  try {
    return new URL(path, INTERNAL_ORIGIN).origin === INTERNAL_ORIGIN;
  } catch {
    return false;
  }
}

/**
 * Where to send the user after signing in.
 * - `redirect`: an in-app path (set by the auth middleware).
 * - `redirect_uri`: the API's authorize URL, sent by the API when there is no session.
 *   It's rewritten to the consent page path, so it can travel between the sign-in,
 *   register and verify pages as an in-app `redirect`. signInDestination turns it back
 *   into the API URL for the final step.
 */
export function resolveLoginRedirect(query: LocationQuery, apiBaseUrl: string) {
  const redirect = firstValue(query.redirect);

  if (redirect && isInternalPath(redirect)) {
    return redirect;
  }

  const redirectUri = firstValue(query.redirect_uri);

  if (!redirectUri) {
    return null;
  }

  try {
    const target = new URL(redirectUri);
    const authorizeEndpoint = new URL(`${apiBaseUrl}/oauth/authorize`);

    if (
      target.origin === authorizeEndpoint.origin &&
      target.pathname.replace(/\/$/, "") === authorizeEndpoint.pathname
    ) {
      return `${CONSENT_PATH}${target.search}`;
    }
  } catch {
    // Not a URL we recognise; fall through to the default landing page.
  }

  return null;
}

/**
 * What to open once someone is signed in, given an in-app path from
 * resolveLoginRedirect. A consent request goes back through the API's authorize
 * endpoint instead of straight to the consent page: the API issues the code at once
 * for an app the user already approved, and sends them to the consent page otherwise.
 */
export function signInDestination(target: string, apiBaseUrl: string) {
  if (isInternalPath(target)) {
    const url = new URL(target, INTERNAL_ORIGIN);

    if (url.pathname === CONSENT_PATH) {
      return { url: `${apiBaseUrl}/oauth/authorize${url.search}`, external: true };
    }
  }

  return { url: target, external: false };
}
