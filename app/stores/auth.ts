import { defineStore } from "pinia";
import {
  apiErrorMessage,
  apiFetch,
  getErrorStatus,
  tryApi,
  type ApiError,
} from "~/utils/api";
import { isValidEmail } from "~/utils/email";
import { isPasswordQualified } from "~/utils/password";

const PENDING_EMAIL_KEY = "open-sesame-pending-email";

type AuthUser = {
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

type SignInResult = "success" | "mfa_required" | "unverified" | "failed";
export type MfaMethod = "totp" | "email";
// Mirrors the API's MfaSetupResponseSchema; secret/provisioning_uri are TOTP-only.
export type MfaSetup = {
  method: MfaMethod;
  secret?: string | null;
  provisioning_uri?: string | null;
};

type LoginResponse = {
  challenge_id?: string;
};

function getChallengeId(value: unknown) {
  const challengeId = (value as LoginResponse | undefined)?.challenge_id;
  return typeof challengeId === "string" && challengeId ? challengeId : null;
}

// Mirrors the API's SessionResponseSchema (GET /auth/sessions).
export type UserSession = {
  session_id: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  expires_at: string;
};

function getDisplayName(user: Partial<AuthUser> | null | undefined) {
  if (!user) {
    return "User";
  }

  return (
    user.name ||
    user.full_name ||
    [user.first_name, user.last_name].filter(Boolean).join(" ") ||
    user.email ||
    user.username ||
    "User"
  );
}

export const useAuthStore = defineStore("auth", () => {
  const isLoading = ref(false);
  const error = ref("");
  const user = useState<AuthUser | null>("auth.user", () => null);
  // True once the API has been asked about the current session in this app load.
  const sessionChecked = useState<boolean>("auth.sessionChecked", () => false);
  const mfaChallengeId = useState<string | null>(
    "auth.mfaChallengeId",
    () => null,
  );
  const isAuthenticated = computed(() => !!user.value);
  const pendingEmail = useState<string>("auth.pendingEmail", () => {
    if (import.meta.client) {
      return localStorage.getItem(PENDING_EMAIL_KEY) || "";
    }

    return "";
  });

  function t(key: string) {
    return useNuxtApp().$i18n.t(key);
  }

  function setPendingEmail(email: string) {
    pendingEmail.value = email;

    if (import.meta.client) {
      localStorage.setItem(PENDING_EMAIL_KEY, email);
    }
  }

  function clearPendingEmail() {
    pendingEmail.value = "";

    if (import.meta.client) {
      localStorage.removeItem(PENDING_EMAIL_KEY);
    }
  }

  async function fetchMe() {
    try {
      const profile = await apiFetch<AuthUser>("/users/me");

      user.value = profile;
      return profile;
    } catch (requestError) {
      const status = getErrorStatus(requestError);

      user.value = null;

      if (status !== 401 && status !== 403) {
        error.value = apiErrorMessage(requestError, "auth.errors.profile");
      }

      return null;
    } finally {
      sessionChecked.value = true;
    }
  }

  async function ensureSession() {
    if (!sessionChecked.value) {
      await fetchMe();
    }

    return isAuthenticated.value;
  }

  async function signIn(
    email: string,
    password: string,
  ): Promise<SignInResult> {
    isLoading.value = true;
    error.value = "";
    mfaChallengeId.value = null;

    if (!email || !password) {
      error.value = t("auth.errors.signInRequired");
      isLoading.value = false;
      return "failed";
    }

    if (!isValidEmail(email)) {
      error.value = t("auth.errors.invalidEmail");
      isLoading.value = false;
      return "failed";
    }

    try {
      const loginResponse = await apiFetch<LoginResponse>("/auth/login", {
        method: "POST",
        body: { email: email.trim(), password },
      });

      const challengeId = getChallengeId(loginResponse);
      if (challengeId) {
        mfaChallengeId.value = challengeId;
        isLoading.value = false;
        return "mfa_required";
      }

      clearPendingEmail();

      const profile = await fetchMe();
      isLoading.value = false;
      return profile ? "success" : "failed";
    } catch (requestError) {
      isLoading.value = false;

      const challengeId = getChallengeId(
        (requestError as { data?: LoginResponse })?.data,
      );
      if (challengeId) {
        mfaChallengeId.value = challengeId;
        return "mfa_required";
      }

      // Right password, but the account still needs its OTP; hand off to /verify.
      if (
        (requestError as { data?: ApiError })?.data?.error ===
        "email_not_verified"
      ) {
        setPendingEmail(email.trim().toLowerCase());
        return "unverified";
      }

      error.value = apiErrorMessage(requestError, "auth.errors.signIn");
      return "failed";
    }
  }

  async function verifyMfaLogin(code: string) {
    error.value = "";
    const challengeId = mfaChallengeId.value;

    if (!challengeId || !code.trim()) {
      error.value = t("auth.errors.mfaCodeRequired");
      return false;
    }

    isLoading.value = true;
    try {
      await apiFetch("/auth/login/2fa", {
        method: "POST",
        body: { challenge_id: challengeId, code: code.trim() },
      });

      mfaChallengeId.value = null;
      clearPendingEmail();
      return !!(await fetchMe());
    } catch (requestError) {
      error.value = apiErrorMessage(requestError, "auth.errors.mfaVerify");
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  // For the email method the API also sends the first code right away.
  async function setupMfa(method: MfaMethod) {
    const { data, error: setupError } = await tryApi(
      () =>
        apiFetch<MfaSetup>("/users/me/2fa/setup", {
          method: "POST",
          body: { method },
        }),
      "profile.mfa.errors.setup",
    );

    return { setup: data, error: setupError };
  }

  async function confirmMfa(code: string) {
    const { data, error: confirmError } = await tryApi(
      () =>
        apiFetch<{ recovery_codes: string[] }>("/users/me/2fa/confirm", {
          method: "POST",
          body: { code },
        }),
      "profile.mfa.errors.confirm",
    );

    return { recoveryCodes: data?.recovery_codes ?? [], error: confirmError };
  }

  // Emails a fresh code for the email method (setup resend or disabling);
  // the API ignores it for authenticator apps.
  async function requestMfaCode() {
    const result = await tryApi(
      () => apiFetch("/users/me/2fa/request-code", { method: "POST" }),
      "profile.mfa.errors.sendCode",
      { 429: "auth.errors.resendLimited" },
    );

    return result.error;
  }

  async function disableMfa(code: string) {
    const result = await tryApi(
      () =>
        apiFetch("/users/me/2fa/disable", { method: "POST", body: { code } }),
      "profile.mfa.errors.disable",
    );

    return result.error;
  }

  async function register(
    fullName: string,
    email: string,
    password: string,
    confirmPassword: string,
  ) {
    isLoading.value = true;
    error.value = "";

    if (!fullName.trim() || !email || !password || !confirmPassword) {
      error.value = t("auth.errors.registerRequired");
      isLoading.value = false;
      return false;
    }

    if (!isValidEmail(email)) {
      error.value = t("auth.errors.invalidEmail");
      isLoading.value = false;
      return false;
    }

    if (!isPasswordQualified(password, fullName)) {
      error.value = t("auth.errors.weakPassword");
      isLoading.value = false;
      return false;
    }

    if (password !== confirmPassword) {
      error.value = t("auth.errors.passwordMismatch");
      isLoading.value = false;
      return false;
    }

    try {
      await apiFetch("/users/register", {
        method: "POST",
        body: {
          full_name: fullName.trim(),
          email: email.trim(),
          password,
        },
      });

      // Registering doesn't sign in; the account must be verified by OTP first.
      setPendingEmail(email.trim().toLowerCase());

      isLoading.value = false;
      return true;
    } catch (requestError) {
      error.value = apiErrorMessage(requestError, "auth.errors.register");
      isLoading.value = false;
      return false;
    }
  }

  async function verifyEmail(otp: string) {
    isLoading.value = true;
    error.value = "";

    if (!/^\d{6}$/.test(otp)) {
      error.value = t("auth.errors.otpRequired");
      isLoading.value = false;
      return false;
    }

    try {
      await apiFetch("/users/verify", {
        method: "POST",
        body: { email: pendingEmail.value, otp },
      });

      isLoading.value = false;
      return true;
    } catch (requestError) {
      error.value = apiErrorMessage(requestError, "auth.errors.verify");
      isLoading.value = false;
      return false;
    }
  }

  async function resendVerification() {
    error.value = "";

    const result = await tryApi(
      () =>
        apiFetch("/users/verify/resend", {
          method: "POST",
          body: { email: pendingEmail.value },
        }),
      "auth.errors.resend",
      { 429: "auth.errors.resendLimited" },
    );

    error.value = result.error ?? "";
    return !result.error;
  }

  // Profile forms keep their own loading/error state, so these return the outcome
  // instead of writing to the shared `isLoading` / `error`.
  async function updateProfile(changes: {
    full_name?: string;
    email?: string;
  }) {
    const previousEmail = user.value?.email;
    const { data: profile, error: updateError } = await tryApi(
      () => apiFetch<AuthUser>("/users/me", { method: "PATCH", body: changes }),
      "profile.errors.update",
      { 409: "profile.errors.emailTaken" },
    );

    if (!profile) {
      return { error: updateError, emailChanged: false };
    }

    user.value = profile;
    const emailChanged = !!profile.email && profile.email !== previousEmail;

    // The API resets verification and emails an OTP to the new address.
    if (emailChanged && profile.email) {
      setPendingEmail(profile.email);
    }

    return { error: null, emailChanged };
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    const result = await tryApi(
      () =>
        apiFetch("/users/me/change-password", {
          method: "POST",
          body: {
            current_password: currentPassword,
            new_password: newPassword,
          },
        }),
      "profile.errors.password",
      // The API answers a wrong current password with 400 validation_error.
      { 400: "profile.errors.wrongPassword" },
    );

    return result.error;
  }

  // Password reset runs signed out, so like the profile forms these return the
  // error (or null) and leave the shared `error` alone.
  async function requestPasswordReset(email: string) {
    // The API answers the same way for unknown emails, so this never reveals
    // whether an account exists.
    const result = await tryApi(
      () =>
        apiFetch("/users/reset-password", {
          method: "POST",
          body: { email: email.trim().toLowerCase() },
        }),
      "auth.reset.errors.request",
      { 429: "auth.errors.resendLimited" },
    );

    return result.error;
  }

  async function confirmPasswordReset(
    email: string,
    otp: string,
    newPassword: string,
  ) {
    const result = await tryApi(
      () =>
        apiFetch("/users/reset-password/confirm", {
          method: "POST",
          body: {
            email: email.trim().toLowerCase(),
            otp,
            new_password: newPassword,
          },
        }),
      "auth.reset.errors.confirm",
      // A wrong or expired code comes back as 400 validation_error.
      { 400: "auth.reset.errors.invalidCode" },
    );

    return result.error;
  }

  function listSessions() {
    return apiFetch<UserSession[]>("/auth/sessions");
  }

  // Ends every session, including this one, so the caller must send the user to sign in.
  async function revokeAllSessions() {
    const result = await tryApi(
      () => apiFetch("/auth/sessions/revoke-all", { method: "POST" }),
      "profile.sessions.errors.revoke",
    );

    if (result.error) {
      return result.error;
    }

    user.value = null;
    sessionChecked.value = true;
    return null;
  }

  async function signOut() {
    error.value = "";

    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch (requestError) {
      const status = getErrorStatus(requestError);
      if (status !== 404 && status !== 422) {
        error.value = apiErrorMessage(requestError, "auth.errors.signOut");
      }
    } finally {
      user.value = null;
      sessionChecked.value = true;
      mfaChallengeId.value = null;
      clearPendingEmail();
    }
  }

  return {
    isLoading,
    error,
    user,
    isAuthenticated,
    pendingEmail,
    signIn,
    mfaChallengeId,
    verifyMfaLogin,
    setupMfa,
    confirmMfa,
    requestMfaCode,
    disableMfa,
    fetchMe,
    ensureSession,
    register,
    verifyEmail,
    resendVerification,
    setPendingEmail,
    clearPendingEmail,
    updateProfile,
    changePassword,
    requestPasswordReset,
    confirmPasswordReset,
    listSessions,
    revokeAllSessions,
    signOut,
    getDisplayName,
  };
});
