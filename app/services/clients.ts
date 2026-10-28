// /clients endpoints: OAuth clients owned by the signed-in user.
import { apiFetch } from "~/utils/api";
import type { OAuthClient, OAuthClientPayload } from "~/utils/oauth";

// The plaintext secret comes back once, on create (confidential clients only).
export type CreatedClient = OAuthClient & { client_secret: string | null };

const clientPath = (clientId: string) => `/clients/${encodeURIComponent(clientId)}`;

export const clientsApi = {
  list: () => apiFetch<OAuthClient[]>("/clients/"),

  get: (clientId: string) => apiFetch<OAuthClient>(clientPath(clientId)),

  create: (payload: OAuthClientPayload) =>
    apiFetch<CreatedClient>("/clients/", { method: "POST", body: payload }),

  update: (clientId: string, changes: Partial<OAuthClientPayload>) =>
    apiFetch<OAuthClient>(clientPath(clientId), { method: "PATCH", body: changes }),

  rotateSecret: (clientId: string) =>
    apiFetch<{ client_secret: string }>(`${clientPath(clientId)}/rotate-secret`, {
      method: "POST",
    }),

  activate: (clientId: string) =>
    apiFetch<OAuthClient>(`${clientPath(clientId)}/activate`, { method: "POST" }),

  // Superusers only. Owners can't verify their own app.
  setVerified: (clientId: string, isVerified: boolean) =>
    apiFetch<OAuthClient>(`${clientPath(clientId)}/verification`, {
      method: "PATCH",
      body: { is_verified: isVerified },
    }),

  // Deactivation also revokes the refresh tokens issued to this client.
  deactivate: (clientId: string) =>
    apiFetch<OAuthClient>(clientPath(clientId), { method: "DELETE" }),
};
