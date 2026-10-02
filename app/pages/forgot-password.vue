<script setup lang="ts">
definePageMeta({
  middleware: ["guest"],
});

import { PhArrowRight } from "@phosphor-icons/vue";
import { isValidEmail } from "~/utils/email";
import { resolveLoginRedirect } from "~/utils/oauth";
import { isPasswordQualified } from "~/utils/password";

const RESEND_COOLDOWN_SECONDS = 60;

type Step = "request" | "confirm";

const auth = useAuthStore();
const { t } = useI18n();
const route = useRoute();
const config = useRuntimeConfig();
// Lets the login page prefill the email once the password is reset.
const resetEmail = useState<string>("auth.resetEmail", () => "");
// Carried through from sign-in (e.g. a pending OAuth consent).
const returnTo = computed(
  () => resolveLoginRedirect(route.query, config.public.apiBaseUrl) || undefined,
);

const step = ref<Step>("request");
const email = ref(String(route.query.email || ""));
const otp = ref("");
const newPassword = ref("");
const confirmPassword = ref("");
const submitted = ref(false);
const isLoading = ref(false);
const error = ref("");
const resent = ref(false);
const cooldown = ref(0);
let cooldownTimer: number | undefined;

const normalizedEmail = computed(() => email.value.trim().toLowerCase());
const emailError = computed(
  () => submitted.value && !isValidEmail(email.value),
);
const otpError = computed(() => submitted.value && otp.value.length !== 6);
const newPasswordError = computed(
  () => submitted.value && !isPasswordQualified(newPassword.value),
);
const confirmPasswordError = computed(
  () =>
    (submitted.value || !!confirmPassword.value) &&
    confirmPassword.value !== newPassword.value,
);

function startCooldown() {
  cooldown.value = RESEND_COOLDOWN_SECONDS;
  window.clearInterval(cooldownTimer);
  cooldownTimer = window.setInterval(() => {
    cooldown.value -= 1;

    if (cooldown.value <= 0) {
      window.clearInterval(cooldownTimer);
    }
  }, 1000);
}

async function sendCode() {
  isLoading.value = true;
  error.value = (await auth.requestPasswordReset(normalizedEmail.value)) || "";
  isLoading.value = false;

  if (!error.value) {
    startCooldown();
  }

  return !error.value;
}

async function submitRequest() {
  submitted.value = true;
  error.value = "";

  if (!isValidEmail(email.value) || isLoading.value) {
    return;
  }

  if (await sendCode()) {
    submitted.value = false;
    step.value = "confirm";
  }
}

async function resend() {
  resent.value = false;
  otp.value = "";

  if (await sendCode()) {
    resent.value = true;
  }
}

async function submitConfirm() {
  submitted.value = true;
  error.value = "";
  resent.value = false;

  if (
    isLoading.value ||
    otpError.value ||
    newPasswordError.value ||
    confirmPasswordError.value
  ) {
    return;
  }

  isLoading.value = true;
  error.value =
    (await auth.confirmPasswordReset(
      normalizedEmail.value,
      otp.value,
      newPassword.value,
    )) || "";
  isLoading.value = false;

  if (error.value) {
    otp.value = "";
    return;
  }

  resetEmail.value = normalizedEmail.value;
  await navigateTo({
    path: "/login",
    query: { reset: "1", redirect: returnTo.value },
  });
}

function changeEmail() {
  step.value = "request";
  submitted.value = false;
  error.value = "";
  resent.value = false;
  otp.value = "";
}

onBeforeUnmount(() => {
  window.clearInterval(cooldownTimer);
});
</script>

<template>
  <main class="login-page">
    <ThemeToggle class="auth-theme-toggle" />

    <AuthPanel
      v-if="step === 'request'"
      heading-id="reset-title"
      :title="t('auth.reset.title')"
      :description="t('auth.reset.description')"
      :loading="isLoading"
    >
      <form class="auth-form" novalidate @submit.prevent="submitRequest">
        <FormField
          v-model="email"
          id="email"
          :label="t('auth.email')"
          type="email"
          autocomplete="email"
          :placeholder="t('auth.emailPlaceholder')"
          :error="emailError"
          :error-message="t('auth.errors.invalidEmail')"
        />

        <div v-if="error" role="alert" class="alert alert-error py-2 text-xs">
          {{ error }}
        </div>

        <button
          type="submit"
          class="btn btn-primary w-full"
          :disabled="isLoading"
        >
          {{ t("auth.reset.send") }}
          <PhArrowRight :size="16" weight="bold" aria-hidden="true" />
        </button>
      </form>

      <p class="help-text">
        {{ t("auth.reset.remembered") }}
        <NuxtLink :to="{ path: '/login', query: { redirect: returnTo } }">{{
          t("auth.signIn")
        }}</NuxtLink>
      </p>
    </AuthPanel>

    <AuthPanel
      v-else
      heading-id="reset-title"
      :title="t('auth.reset.confirmTitle')"
      :description="t('auth.reset.confirmDescription', { email: normalizedEmail })"
      :loading="isLoading"
    >
      <form class="auth-form" novalidate @submit.prevent="submitConfirm">
        <!-- Lets password managers pair the new password with this account. -->
        <input
          type="text"
          name="username"
          autocomplete="username"
          :value="normalizedEmail"
          hidden
          readonly
        />
        <OtpInput
          v-model="otp"
          id="otp"
          :label="t('auth.verify.code')"
          :error="otpError"
          :error-message="t('auth.verify.codeError')"
        />
        <PasswordStrengthInput
          v-model="newPassword"
          id="new-password"
          :label="t('profile.password.new')"
          :placeholder="t('auth.passwordPlaceholder')"
          :error="newPasswordError"
        />
        <FormField
          v-model="confirmPassword"
          id="confirm-password"
          :label="t('auth.confirmPassword')"
          type="password"
          autocomplete="new-password"
          :placeholder="t('auth.confirmPasswordPlaceholder')"
          :error="confirmPasswordError"
          :error-message="t('auth.errors.passwordMismatch')"
          show-password-toggle
        />

        <div v-if="error" role="alert" class="alert alert-error py-2 text-xs">
          {{ error }}
        </div>
        <div
          v-else-if="newPasswordError"
          role="alert"
          class="alert alert-error py-2 text-xs"
        >
          {{ t("auth.errors.weakPassword") }}
        </div>
        <div
          v-else-if="resent"
          role="status"
          class="alert alert-success py-2 text-xs"
        >
          {{ t("auth.verify.resent") }}
        </div>

        <button
          type="submit"
          class="btn btn-primary w-full"
          :disabled="isLoading"
        >
          {{ t("auth.reset.submit") }}
          <PhArrowRight :size="16" weight="bold" aria-hidden="true" />
        </button>
      </form>

      <p class="help-text">
        {{ t("auth.verify.noCode") }}
        <button
          type="button"
          class="link link-primary no-underline hover:underline disabled:no-underline disabled:opacity-60"
          :disabled="cooldown > 0 || isLoading"
          @click="resend"
        >
          {{
            cooldown > 0
              ? t("auth.verify.resendIn", { seconds: cooldown })
              : t("auth.verify.resend")
          }}
        </button>
        <br />
        {{ t("auth.verify.wrongEmail") }}
        <button type="button" class="link link-primary no-underline hover:underline" @click="changeEmail">{{ t("auth.verify.editEmail") }}</button>
      </p>
    </AuthPanel>

    <AuthFooter />
  </main>
</template>
