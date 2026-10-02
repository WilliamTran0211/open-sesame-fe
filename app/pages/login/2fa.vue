<script setup lang="ts">
definePageMeta({
  middleware: [
    "guest",
    () => {
      if (!useAuthStore().mfaChallengeId) {
        return navigateTo("/login");
      }
    },
  ],
});

import { resolveLoginRedirect } from "~/utils/oauth";

const auth = useAuthStore();
const route = useRoute();
const config = useRuntimeConfig();
const { t } = useI18n();
const code = ref("");
const submitted = ref(false);
const redirect = computed(() =>
  resolveLoginRedirect(route.query, config.public.apiBaseUrl),
);

async function verify() {
  submitted.value = true;
  if (!code.value.trim() || auth.isLoading) {
    return;
  }

  if (await auth.verifyMfaLogin(code.value)) {
    await navigateTo(redirect.value || "/dashboard");
  }
}
</script>

<template>
  <main class="login-page">
    <ThemeToggle class="auth-theme-toggle" />

    <AuthPanel
      heading-id="mfa-title"
      :title="t('auth.mfa.title')"
      :description="t('auth.mfa.description')"
      :loading="auth.isLoading"
    >
      <form class="auth-form" @submit.prevent="verify">
        <FormField
          v-model="code"
          id="mfa-code"
          :label="t('auth.mfa.code')"
          autocomplete="one-time-code"
          :placeholder="t('auth.mfa.codePlaceholder')"
          :error="submitted && !code.trim()"
          :error-message="t('auth.errors.mfaCodeRequired')"
        />

        <div
          v-if="auth.error"
          role="alert"
          class="alert alert-error py-2 text-xs"
        >
          {{ auth.error }}
        </div>

        <button
          type="submit"
          class="btn btn-primary w-full"
          :class="{ loading: auth.isLoading }"
          :disabled="auth.isLoading"
        >
          {{ t("auth.mfa.submit") }} <span aria-hidden="true">→</span>
        </button>
      </form>

      <!-- The API emails a new code with each sign-in; there is no resend for a challenge. -->
      <p class="help-text">
        {{ t("auth.mfa.emailHint") }}
        <NuxtLink :to="{ path: '/login', query: { redirect: route.query.redirect } }">
          {{ t("auth.mfa.signInAgain") }}
        </NuxtLink>
      </p>
    </AuthPanel>
  </main>
</template>
