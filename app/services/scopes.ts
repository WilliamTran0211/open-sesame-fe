// /scopes endpoints: permissions clients can be allowed to request.
// Listing is open to any signed-in user; changes are superuser-only.
import { apiFetch } from "~/utils/api";
import type { OAuthScope } from "~/utils/oauth";

const scopePath = (name: string) => `/scopes/${encodeURIComponent(name)}`;

export const scopesApi = {
  // Only active scopes are listed.
  list: () => apiFetch<OAuthScope[]>("/scopes/list"),

  create: (name: string, description: string) =>
    apiFetch<OAuthScope>("/scopes/", { method: "POST", body: { name, description } }),

  update: (name: string, description: string) =>
    apiFetch<OAuthScope>(scopePath(name), { method: "PATCH", body: { description } }),

  deactivate: (name: string) =>
    apiFetch<OAuthScope>(scopePath(name), { method: "DELETE" }),
};
