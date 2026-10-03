// /users endpoints: the signed-in account, sign-up, email verification and password reset.
import { apiFetch } from "~/utils/api";

// Mirrors the API's UserResponseSchema; extra fields are tolerated.
export type AuthUser = {
  id?: string | number;
  email?: string;
  name?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  avatar?: string | null;
  role?: string;
  is_superuser?: boolean;
  [key: string]: unknown;
};

export type RegisterPayload = {
  full_name: string;
  email: string;
  password: string;
};

export type ProfileChanges = {
  full_name?: string;
  email?: string;
};

export const usersApi = {
  me: () => apiFetch<AuthUser>("/users/me"),

  updateMe: (changes: ProfileChanges) =>
    apiFetch<AuthUser>("/users/me", { method: "PATCH", body: changes }),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiFetch("/users/me/change-password", {
      method: "POST",
      body: { current_password: currentPassword, new_password: newPassword },
    }),

  register: (payload: RegisterPayload) =>
    apiFetch<AuthUser>("/users/register", { method: "POST", body: payload }),

  verifyEmail: (email: string, otp: string) =>
    apiFetch<AuthUser>("/users/verify", { method: "POST", body: { email, otp } }),

  resendVerification: (email: string) =>
    apiFetch("/users/verify/resend", { method: "POST", body: { email } }),

  requestPasswordReset: (email: string) =>
    apiFetch("/users/reset-password", { method: "POST", body: { email } }),

  confirmPasswordReset: (email: string, otp: string, newPassword: string) =>
    apiFetch<AuthUser>("/users/reset-password/confirm", {
      method: "POST",
      body: { email, otp, new_password: newPassword },
    }),
};
