import { defineStore } from "pinia";
import { getErrorMessage, getErrorStatus, type ApiError } from "~/utils/api";
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
  [key: string]: unknown;
};

type SignInResult = "success" | "unverified" | "failed";

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
      const config = useRuntimeConfig();
      const profile = await $fetch<AuthUser>(
        `${config.public.apiBaseUrl}/users/me`,
        {
          method: "GET",
          credentials: "include",
        },
      );

      user.value = profile;
      return profile;
    } catch (requestError) {
      const status = (requestError as { response?: { status?: number } })
        ?.response?.status;

      user.value = null;

      if (status !== 401 && status !== 403) {
        error.value = getErrorMessage(requestError, t("auth.errors.profile"));
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
      const config = useRuntimeConfig();
      await $fetch(`${config.public.apiBaseUrl}/auth/login`, {
        method: "POST",
        body: { email: email.trim(), password },
        credentials: "include",
      });

      clearPendingEmail();

      const profile = await fetchMe();
      isLoading.value = false;
      return profile ? "success" : "failed";
    } catch (requestError) {
      isLoading.value = false;

      // Right password, but the account still needs its OTP; hand off to /verify.
      if ((requestError as { data?: ApiError })?.data?.error === "email_not_verified") {
        setPendingEmail(email.trim().toLowerCase());
        return "unverified";
      }

      error.value = getErrorMessage(requestError, t("auth.errors.signIn"));
      return "failed";
    }
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
      const config = useRuntimeConfig();
      await $fetch(`${config.public.apiBaseUrl}/users/register`, {
        method: "POST",
        body: {
          full_name: fullName.trim(),
          email: email.trim(),
          password,
        },
        credentials: "include",
      });

      // Registering doesn't sign in; the account must be verified by OTP first.
      setPendingEmail(email.trim().toLowerCase());

      isLoading.value = false;
      return true;
    } catch (requestError) {
      error.value = getErrorMessage(requestError, t("auth.errors.register"));
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
      const config = useRuntimeConfig();
      await $fetch(`${config.public.apiBaseUrl}/users/verify`, {
        method: "POST",
        body: { email: pendingEmail.value, otp },
        credentials: "include",
      });

      isLoading.value = false;
      return true;
    } catch (requestError) {
      error.value = getErrorMessage(requestError, t("auth.errors.verify"));
      isLoading.value = false;
      return false;
    }
  }

  async function resendVerification() {
    error.value = "";

    try {
      const config = useRuntimeConfig();
      await $fetch(`${config.public.apiBaseUrl}/users/verify/resend`, {
        method: "POST",
        body: { email: pendingEmail.value },
        credentials: "include",
      });

      return true;
    } catch (requestError) {
      const status = (requestError as { response?: { status?: number } })
        ?.response?.status;

      error.value =
        status === 429
          ? t("auth.errors.resendLimited")
          : getErrorMessage(requestError, t("auth.errors.resend"));
      return false;
    }
  }

  // Profile forms keep their own loading/error state, so these return the outcome
  // instead of writing to the shared `isLoading` / `error`.
  async function updateProfile(changes: { full_name?: string; email?: string }) {
    const previousEmail = user.value?.email;

    try {
      const config = useRuntimeConfig();
      const profile = await $fetch<AuthUser>(
        `${config.public.apiBaseUrl}/users/me`,
        {
          method: "PATCH",
          body: changes,
          credentials: "include",
        },
      );

      user.value = profile;
      const emailChanged =
        !!profile.email && profile.email !== previousEmail;

      // The API resets verification and emails an OTP to the new address.
      if (emailChanged && profile.email) {
        setPendingEmail(profile.email);
      }

      return { error: null, emailChanged };
    } catch (requestError) {
      return {
        error:
          getErrorStatus(requestError) === 409
            ? t("profile.errors.emailTaken")
            : getErrorMessage(requestError, t("profile.errors.update")),
        emailChanged: false,
      };
    }
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    try {
      const config = useRuntimeConfig();
      await $fetch(`${config.public.apiBaseUrl}/users/me/change-password`, {
        method: "POST",
        body: {
          current_password: currentPassword,
          new_password: newPassword,
        },
        credentials: "include",
      });

      return null;
    } catch (requestError) {
      // The API answers a wrong current password with 400 validation_error.
      return getErrorStatus(requestError) === 400
        ? t("profile.errors.wrongPassword")
        : getErrorMessage(requestError, t("profile.errors.password"));
    }
  }

  // Password reset runs signed out, so like the profile forms these return the
  // error (or null) and leave the shared `error` alone.
  async function requestPasswordReset(email: string) {
    try {
      const config = useRuntimeConfig();
      // The API answers the same way for unknown emails, so this never reveals
      // whether an account exists.
      await $fetch(`${config.public.apiBaseUrl}/users/reset-password`, {
        method: "POST",
        body: { email: email.trim().toLowerCase() },
      });

      return null;
    } catch (requestError) {
      return getErrorStatus(requestError) === 429
        ? t("auth.errors.resendLimited")
        : getErrorMessage(requestError, t("auth.reset.errors.request"));
    }
  }

  async function confirmPasswordReset(
    email: string,
    otp: string,
    newPassword: string,
  ) {
    try {
      const config = useRuntimeConfig();
      await $fetch(`${config.public.apiBaseUrl}/users/reset-password/confirm`, {
        method: "POST",
        body: {
          email: email.trim().toLowerCase(),
          otp,
          new_password: newPassword,
        },
      });

      return null;
    } catch (requestError) {
      // A wrong or expired code comes back as 400 validation_error.
      return getErrorStatus(requestError) === 400
        ? t("auth.reset.errors.invalidCode")
        : getErrorMessage(requestError, t("auth.reset.errors.confirm"));
    }
  }

  async function listSessions() {
    const config = useRuntimeConfig();
    return await $fetch<UserSession[]>(
      `${config.public.apiBaseUrl}/auth/sessions`,
      {
        method: "GET",
        credentials: "include",
      },
    );
  }

  // Ends every session, including this one, so the caller must send the user to sign in.
  async function revokeAllSessions() {
    try {
      const config = useRuntimeConfig();
      await $fetch(`${config.public.apiBaseUrl}/auth/sessions/revoke-all`, {
        method: "POST",
        credentials: "include",
      });
    } catch (requestError) {
      return getErrorMessage(requestError, t("profile.sessions.errors.revoke"));
    }

    user.value = null;
    sessionChecked.value = true;
    return null;
  }

  async function signOut() {
    error.value = "";

    try {
      const config = useRuntimeConfig();
      await $fetch(`${config.public.apiBaseUrl}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (requestError) {
      const status = (requestError as { response?: { status?: number } })
        ?.response?.status;
      if (status !== 404 && status !== 422) {
        error.value = getErrorMessage(requestError, t("auth.errors.signOut"));
      }
    } finally {
      user.value = null;
      sessionChecked.value = true;
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
