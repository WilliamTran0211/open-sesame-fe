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

  return !["javascript:", "data:", "file:", "vbscript:"].includes(url.protocol);
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

function firstValue(value: LocationQuery[string] | undefined) {
  const item = Array.isArray(value) ? value[0] : value;
  return typeof item === "string" ? item.trim() : "";
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
  const redirectUri = firstValue(query.redirect_uri);
  const scope = firstValue(query.scope);
  const state = firstValue(query.state);
  const codeChallenge = firstValue(query.code_challenge);
  const codeChallengeMethod = firstValue(query.code_challenge_method);

  if (responseType !== "code") {
    return { request: null, error: "unsupportedResponseType" };
  }

  if (!clientId) {
    return { request: null, error: "missingClient" };
  }

  if (!getUrlHost(redirectUri)) {
    return { request: null, error: "invalidRedirect" };
  }

  if (!state) {
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

export function getUrlHost(url: string) {
  try {
    return new URL(url).host;
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

// The API issues the code once the browser (carrying the session cookie) hits this URL.
export function buildAuthorizeUrl(apiBaseUrl: string, request: AuthorizeRequest) {
  return appendQuery(`${apiBaseUrl}/oauth/authorize`, {
    response_type: request.responseType,
    client_id: request.clientId,
    redirect_uri: request.redirectUri,
    scope: request.scope,
    state: request.state,
    code_challenge: request.codeChallenge,
    code_challenge_method: request.codeChallengeMethod,
  });
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

function isInternalPath(path: string) {
  // "//host" and "/\host" are protocol-relative URLs to browsers, i.e. off-site.
  return path.startsWith("/") && !/^\/[/\\]/.test(path);
}

/**
 * Where to send the user after signing in.
 * - `redirect`: an in-app path (set by the auth middleware).
 * - `redirect_uri`: the API's authorize URL, sent by the API when there is no session.
 *   It's rewritten to the consent page so the user approves scopes first.
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
