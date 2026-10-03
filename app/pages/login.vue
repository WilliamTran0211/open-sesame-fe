<script setup lang="ts">
definePageMeta({
  middleware: ["guest"],
});

import { PhArrowRight } from "@phosphor-icons/vue";
import { isValidEmail } from "~/utils/email";
import { resolveLoginRedirect } from "~/utils/oauth";

const auth = useAuthStore();
const { t } = useI18n();
const route = useRoute();
const config = useRuntimeConfig();
const justVerified = computed(() => route.query.verified === "1");
const justReset = computed(() => route.query.reset === "1");
// Set by apiFetch when a signed-in request came back 401.
const sessionExpired = computed(() => route.query.expired === "1");
const resetEmail = useState<string>("auth.resetEmail", () => "");
// Set when sign-in was triggered by a protected page or an OAuth authorize request.
const returnTo = computed(() =>
  resolveLoginRedirect(route.query, config.public.apiBaseUrl),
);
const email = ref("");
const password = ref("");
const submitted = ref(false);
const emailIsValid = computed(() => isValidEmail(email.value));
const emailError = computed(() => submitted.value && !emailIsValid.value);

async function signIn() {
  submitted.value = true;
  const result = await auth.signIn(email.value, password.value);

  if (result === "success") {
    await navigateTo(returnTo.value || "/dashboard");
  } else if (result === "mfa_required") {
    await navigateTo({
      path: "/login/2fa",
      query: { redirect: returnTo.value || undefined },
    });
  } else if (result === "unverified") {
    // The code from sign-up has likely expired, so ask /verify to send a fresh one.
    await navigateTo({
      path: "/verify",
      query: { resend: "1", redirect: returnTo.value || undefined },
    });
  }
}

onMounted(() => {
  // Coming from OTP verification: the email is known, only the password is left.
  if (justVerified.value && auth.pendingEmail) {
    email.value = auth.pendingEmail;
  } else if (justReset.value && resetEmail.value) {
    email.value = resetEmail.value;
    resetEmail.value = "";
  }
});
</script>

<template>
  <main class="login-page">
    <ThemeToggle class="auth-theme-toggle" />

    <AuthPanel
      heading-id="login-title"
      :title="t('auth.login.title')"
      :description="t('auth.login.description')"
    >
      <form class="auth-form" @submit.prevent="signIn">
        <AlertMessage v-if="auth.error">
          {{ auth.error }}
        </AlertMessage>

        <AlertMessage v-else-if="justVerified" tone="success">
          {{ t("auth.verify.verified") }}
        </AlertMessage>

        <AlertMessage v-else-if="justReset" tone="success">
          {{ t("auth.reset.done") }}
        </AlertMessage>

        <AlertMessage v-else-if="sessionExpired" tone="warning">
          {{ t("auth.login.expired") }}
        </AlertMessage>

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

        <FormField
          v-model="password"
          id="password"
          :label="t('auth.password')"
          type="password"
          autocomplete="current-password"
          :placeholder="t('auth.login.passwordPlaceholder')"
          :error="submitted && !password"
          show-password-toggle
        >
          <template #label-action>
            <NuxtLink
              :to="{
                path: '/forgot-password',
                query: {
                  email: emailIsValid ? email.trim() : undefined,
                  redirect: returnTo || undefined,
                },
              }"
              >{{ t("auth.login.forgot") }}</NuxtLink
            >
          </template>
        </FormField>

        <button
          type="submit"
          class="btn btn-primary w-full"
          :disabled="auth.isLoading"
        >
          <span v-if="auth.isLoading" class="loading loading-spinner loading-xs" />
          {{ t("auth.login.submit") }}
          <PhArrowRight v-if="!auth.isLoading" :size="16" weight="bold" aria-hidden="true" />
        </button>
      </form>

      <p class="help-text">
        {{ t("auth.login.newHere") }}
        <NuxtLink
          :to="{
            path: '/register',
            query: { redirect: returnTo || undefined },
          }"
          >{{ t("auth.createAccount") }}</NuxtLink
        >
      </p>
    </AuthPanel>

    <AuthFooter />
  </main>
</template>
