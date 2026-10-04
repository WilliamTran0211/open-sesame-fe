import { defineStore } from "pinia";
import { authApi, type LoginResponse } from "~/services/auth";
import { mfaApi, type MfaMethod } from "~/services/mfa";
import { usersApi, type AuthUser } from "~/services/users";
import {
  apiErrorMessage,
  getErrorStatus,
  tryApi,
  type ApiError,
} from "~/utils/api";
import { isValidEmail } from "~/utils/email";
import { passwordProblem } from "~/utils/password";

// API shapes live with their endpoints; re-exported here for existing imports.
export type { UserSession } from "~/services/auth";
export type { MfaMethod, MfaSetup } from "~/services/mfa";
export type { AuthUser } from "~/services/users";

const PENDING_EMAIL_KEY = "open-sesame-pending-email";

type SignInResult = "success" | "mfa_required" | "unverified" | "failed";

function getChallengeId(value: unknown) {
  const challengeId = (value as LoginResponse | undefined)?.challenge_id;
  return typeof challengeId === "string" && challengeId ? challengeId : null;
}

function getChallengeMethod(value: unknown): MfaMethod | null {
  const method = (value as LoginResponse | undefined)?.mfa_method;
  return method === "totp" || method === "email" ? method : null;
}

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
  // The account's two-factor method, when the API says which one it is.
  const mfaMethod = useState<MfaMethod | null>("auth.mfaMethod", () => null);
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

  // Server-rendered pages start with an empty pendingEmail (localStorage is browser-only);
  // pick up the saved one once in the browser.
  function restorePendingEmail() {
    if (import.meta.client && !pendingEmail.value) {
      pendingEmail.value = localStorage.getItem(PENDING_EMAIL_KEY) || "";
    }

    return pendingEmail.value;
  }

  function clearPendingEmail() {
    pendingEmail.value = "";

    if (import.meta.client) {
      localStorage.removeItem(PENDING_EMAIL_KEY);
    }
  }

  async function fetchMe() {
    try {
      const profile = await usersApi.me();

      user.value = profile;
      sessionChecked.value = true;
      return profile;
    } catch (requestError) {
      const status = getErrorStatus(requestError);

      user.value = null;

      // The server couldn't reach the API while rendering: leave the session
      // unchecked so the browser asks again, and don't show an error for it.
      if (import.meta.server && status === undefined) {
        return null;
      }

      sessionChecked.value = true;

      // The API answers 404 when the session cookie points at a session it no
      // longer has; for /users/me that just means "signed out", not an error.
      if (status !== 401 && status !== 403 && status !== 404) {
        error.value = apiErrorMessage(requestError, "auth.errors.profile");
      }

      return null;
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
    mfaMethod.value = null;

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
      const loginResponse = await authApi.login(email.trim(), password);

      const challengeId = getChallengeId(loginResponse);
      if (challengeId) {
        mfaChallengeId.value = challengeId;
        mfaMethod.value = getChallengeMethod(loginResponse);
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
        mfaMethod.value = getChallengeMethod(
          (requestError as { data?: LoginResponse })?.data,
        );
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

      // The API answers a wrong email or password with a bare "Authentication required".
      error.value = apiErrorMessage(requestError, "auth.errors.signIn", {
        401: "auth.errors.wrongCredentials",
      });
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
      await authApi.verifyLoginCode(challengeId, code.trim());

      mfaChallengeId.value = null;
      clearPendingEmail();
      return !!(await fetchMe());
    } catch (requestError) {
      // invalid_grant: the challenge expired or ran out of attempts; a new sign-in is needed.
      const expired =
        (requestError as { data?: ApiError })?.data?.error === "invalid_grant";
      error.value = apiErrorMessage(
        requestError,
        expired ? "auth.errors.mfaExpired" : "auth.errors.mfaVerify",
        expired ? { 400: "auth.errors.mfaExpired" } : { 400: "auth.errors.mfaWrongCode" },
      );
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  async function setupMfa(method: MfaMethod) {
    const { data, error: setupError } = await tryApi(
      () => mfaApi.setup(method),
      "profile.mfa.errors.setup",
    );

    return { setup: data, error: setupError };
  }

  async function confirmMfa(code: string) {
    const { data, error: confirmError } = await tryApi(
      () => mfaApi.confirm(code),
      "profile.mfa.errors.confirm",
    );

    return { recoveryCodes: data?.recovery_codes ?? [], error: confirmError };
  }

  async function requestMfaCode() {
    const result = await tryApi(
      () => mfaApi.requestCode(),
      "profile.mfa.errors.sendCode",
      { 429: "auth.errors.resendLimited" },
    );

    return result.error;
  }

  async function disableMfa(code: string) {
    const result = await tryApi(
      () => mfaApi.disable(code),
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

    const problem = passwordProblem(password, fullName);
    if (problem) {
      error.value = t(problem);
      isLoading.value = false;
      return false;
    }

    if (password !== confirmPassword) {
      error.value = t("auth.errors.passwordMismatch");
      isLoading.value = false;
      return false;
    }

    try {
      await usersApi.register({
        full_name: fullName.trim(),
        email: email.trim(),
        password,
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
      await usersApi.verifyEmail(pendingEmail.value, otp);

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
      () => usersApi.resendVerification(pendingEmail.value),
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
      () => usersApi.updateMe(changes),
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
      () => usersApi.changePassword(currentPassword, newPassword),
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
      () => usersApi.requestPasswordReset(email.trim().toLowerCase()),
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
        usersApi.confirmPasswordReset(email.trim().toLowerCase(), otp, newPassword),
      "auth.reset.errors.confirm",
      // A wrong or expired code comes back as 400 validation_error.
      { 400: "auth.reset.errors.invalidCode" },
    );

    return result.error;
  }

  function listSessions() {
    return authApi.sessions();
  }

  // Ends every session, including this one, so the caller must send the user to sign in.
  async function revokeAllSessions() {
    const result = await tryApi(
      () => authApi.revokeAllSessions(),
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
      await authApi.logout();
    } catch (requestError) {
      // Already signed out on the API side (no cookie, or the session is gone).
      const status = getErrorStatus(requestError);
      if (![401, 403, 404, 422].includes(status ?? 0)) {
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
    sessionChecked,
    pendingEmail,
    signIn,
    mfaChallengeId,
    mfaMethod,
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
    restorePendingEmail,
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
