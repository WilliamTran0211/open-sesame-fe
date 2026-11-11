<script setup lang="ts">
definePageMeta({
  layout: "auth",
  middleware: [
    "guest",
    () => {
      if (!useAuthStore().mfaChallengeId) {
        return navigateTo("/login");
      }
    },
  ],
});

import {
  DEFAULT_RETRY_AFTER,
  LOGIN_EMAIL_COOLDOWN,
  MFA_CODE_PATTERN,
  normalizeMfaCode,
} from "~/utils/mfa";
import { resolveLoginRedirect } from "~/utils/oauth";

const auth = useAuthStore();
const afterSignIn = useAfterSignIn();
const route = useRoute();
const config = useRuntimeConfig();
const { t } = useI18n();

// One box takes an app code, an emailed code or a recovery code. Older APIs don't list the
// methods; fall back to the one preferred method so the page still reads right.
const methods = computed(() =>
  auth.mfaMethods.length ? auth.mfaMethods : auth.mfaMethod ? [auth.mfaMethod] : [],
);
const hasTotp = computed(() => methods.value.includes("totp"));
const hasEmail = computed(() => methods.value.includes("email"));
const description = computed(() => {
  if (hasTotp.value && hasEmail.value) {
    return t("auth.mfa.descriptionBoth");
  }

  return hasEmail.value
    ? t("auth.mfa.descriptionEmail")
    : t("auth.mfa.descriptionTotp");
});

const code = ref("");
const submitted = ref(false);
// Sign-in already emailed a code when email was the preferred method.
const emailSent = ref(auth.mfaMethod === "email");
const notice = ref<"" | "sent" | "resent">(auth.mfaMethod === "email" ? "sent" : "");
const { remaining: emailCooldown, start: startEmailCooldown } = useCooldown(LOGIN_EMAIL_COOLDOWN);
const { remaining: submitCooldown, start: startSubmitCooldown } = useCooldown(DEFAULT_RETRY_AFTER);

const returnTo = computed(() => {
  const value = Array.isArray(route.query.redirect) ? route.query.redirect[0] : route.query.redirect;
  return value || undefined;
});
const redirect = computed(() => resolveLoginRedirect(route.query, config.public.apiBaseUrl));
const codeValid = computed(() => MFA_CODE_PATTERN.test(normalizeMfaCode(code.value)));

function focusCode() {
  nextTick(() => document.getElementById("mfa-code")?.focus());
}

// Back to the password step, with a note on why.
function backToSignIn(reason: "expired" | "gone") {
  return navigateTo({ path: "/login", query: { mfa: reason, redirect: returnTo.value } });
}

async function sendEmailCode() {
  auth.error = "";
  notice.value = "";
  const result = await auth.sendLoginEmailCode();

  if (result.expired) {
    await backToSignIn("expired");
    return;
  }

  if (result.error) {
    auth.error = result.error;
    return;
  }

  if (result.retryAfter) {
    startEmailCooldown(result.retryAfter);
  }

  emailSent.value = true;
  notice.value = result.sent ? "resent" : "";
}

async function verify() {
  submitted.value = true;
  notice.value = "";

  if (!codeValid.value || auth.isLoading || submitCooldown.value > 0) {
    return;
  }

  const { result, retryAfter } = await auth.verifyMfaLogin(code.value);

  if (result === "ok") {
    await afterSignIn(redirect.value);
  } else if (result === "expired" || result === "gone") {
    await backToSignIn(result);
  } else if (result === "rate_limited") {
    startSubmitCooldown(retryAfter ?? DEFAULT_RETRY_AFTER);
  } else {
    // A wrong code: clear the box so the next one starts clean.
    code.value = "";
    submitted.value = false;
    focusCode();
  }
}

onMounted(() => {
  // The login email counts toward the API's 30-second wait.
  if (emailSent.value) {
    startEmailCooldown();
  }
});

useHead({ title: () => t("titles.mfa") });
</script>

<template>
  <AuthPanel
    heading-id="mfa-title"
    :title="t('auth.mfa.title')"
    :description="description"
    :loading="auth.isLoading"
  >
    <form class="auth-form" novalidate @submit.prevent="verify">
      <AlertMessage v-if="submitCooldown > 0" tone="warning">
        {{ t("auth.mfa.rateLimited", { seconds: submitCooldown }) }}
      </AlertMessage>
      <AlertMessage v-else-if="auth.error">
        {{ auth.error }}
      </AlertMessage>
      <AlertMessage v-else-if="notice === 'sent'" tone="success">
        {{ t("auth.mfa.emailSent") }}
      </AlertMessage>
      <AlertMessage v-else-if="notice === 'resent'" tone="success">
        {{ t("auth.verify.resent") }}
      </AlertMessage>

      <FormField
        v-model="code"
        id="mfa-code"
        :label="t('auth.mfa.code')"
        autocomplete="one-time-code"
        :placeholder="t('auth.mfa.codePlaceholder')"
        :error="submitted && !codeValid"
        :error-message="t('auth.errors.mfaCodeInvalid')"
      />
      <p class="dash-field-hint">{{ t("auth.mfa.recoveryHint") }}</p>

      <SubmitButton :loading="auth.isLoading">
        {{ t("auth.mfa.submit") }}
      </SubmitButton>
    </form>

    <p v-if="hasEmail" class="help-text">
      <button
        type="button"
        class="link link-primary no-underline hover:underline disabled:no-underline disabled:opacity-60"
        :disabled="emailCooldown > 0 || auth.isLoading"
        @click="sendEmailCode"
      >
        {{
          emailCooldown > 0
            ? t("auth.verify.resendIn", { seconds: emailCooldown })
            : emailSent
              ? t("auth.verify.resend")
              : t("auth.mfa.sendEmail")
        }}
      </button>
    </p>
  </AuthPanel>
</template>
