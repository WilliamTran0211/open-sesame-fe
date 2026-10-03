// /users/me/2fa endpoints: setting up, confirming and turning off two-factor sign-in.
import { apiFetch } from "~/utils/api";

export type MfaMethod = "totp" | "email";

// Mirrors the API's MfaSetupResponseSchema; secret/provisioning_uri are TOTP-only.
export type MfaSetup = {
  method: MfaMethod;
  secret?: string | null;
  provisioning_uri?: string | null;
};

export const mfaApi = {
  // For the email method the API also sends the first code right away.
  setup: (method: MfaMethod) =>
    apiFetch<MfaSetup>("/users/me/2fa/setup", { method: "POST", body: { method } }),

  confirm: (code: string) =>
    apiFetch<{ recovery_codes: string[] }>("/users/me/2fa/confirm", {
      method: "POST",
      body: { code },
    }),

  // Emails a fresh code for the email method; the API ignores it for authenticator apps.
  requestCode: () => apiFetch("/users/me/2fa/request-code", { method: "POST" }),

  disable: (code: string) =>
    apiFetch("/users/me/2fa/disable", { method: "POST", body: { code } }),
};
