// /users/me/2fa endpoints: status, turning methods on and off.
// See plan/mfa-frontend-guide.md for every response and error.
import { apiFetch } from "~/utils/api";

export type MfaMethod = "totp" | "email";

export type MfaStatus = {
  enabled: boolean;
  methods: MfaMethod[];
};

// Mirrors the API's MfaSetupResponseSchema; secret/provisioning_uri are TOTP-only.
export type MfaSetup = {
  method: MfaMethod;
  secret?: string | null;
  provisioning_uri?: string | null;
};

export const mfaApi = {
  status: () => apiFetch<MfaStatus>("/users/me/2fa"),

  // Calling it again renews: a new QR code (valid 5 min) or a new email code (valid 2 min),
  // and the previous one stops working.
  setup: (method: MfaMethod) =>
    apiFetch<MfaSetup>("/users/me/2fa/setup", { method: "POST", body: { method } }),

  // The code comes from the app (totp) or the email (email). recovery_codes is only filled for
  // the first method turned on; adding another returns [] and keeps the existing codes.
  confirm: (method: MfaMethod, code: string) =>
    apiFetch<{ recovery_codes: string[] }>("/users/me/2fa/confirm", {
      method: "POST",
      body: { method, code },
    }),

  // Turning a method off always needs a code emailed by this call, whichever method it is.
  requestDisableCode: () =>
    apiFetch("/users/me/2fa/disable/request-code", { method: "POST" }),

  // Turns off only this method. Turning off the last one removes the recovery codes too.
  disable: (method: MfaMethod, code: string) =>
    apiFetch("/users/me/2fa/disable", { method: "POST", body: { method, code } }),
};
