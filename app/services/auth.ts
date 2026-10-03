// /auth endpoints: sign-in (with the optional two-factor step), sign-out and sessions.
import { apiFetch } from "~/utils/api";
import type { AuthUser } from "./users";

// Sign-in answers with the user, or with a challenge when two-factor is on.
export type LoginResponse = AuthUser & { challenge_id?: string };

// Mirrors the API's SessionResponseSchema (GET /auth/sessions).
export type UserSession = {
  session_id: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  expires_at: string;
};

export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<LoginResponse>("/auth/login", {
      method: "POST",
      body: { email, password },
    }),

  verifyLoginCode: (challengeId: string, code: string) =>
    apiFetch<AuthUser>("/auth/login/2fa", {
      method: "POST",
      body: { challenge_id: challengeId, code },
    }),

  logout: () => apiFetch("/auth/logout", { method: "POST" }),

  sessions: () => apiFetch<UserSession[]>("/auth/sessions"),

  // Ends every session, including the caller's own.
  revokeAllSessions: () => apiFetch("/auth/sessions/revoke-all", { method: "POST" }),
};
