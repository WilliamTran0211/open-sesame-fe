<script setup lang="ts">
definePageMeta({
  middleware: ["guest"],
});

import { isValidEmail } from "~/utils/email";
import { resolveLoginRedirect } from "~/utils/oauth";

const auth = useAuthStore();
const { t } = useI18n();
const route = useRoute();
const config = useRuntimeConfig();
// Kept through verify → sign-in so an OAuth consent can resume after sign-up.
const returnTo = computed(() =>
  resolveLoginRedirect(route.query, config.public.apiBaseUrl),
);
const fullName = ref("");
const email = ref("");
const password = ref("");
const confirmPassword = ref("");
const submitted = ref(false);
const emailIsValid = computed(() => isValidEmail(email.value));
const fullNameError = computed(() => submitted.value && !fullName.value.trim());
const emailError = computed(() => submitted.value && !emailIsValid.value);
const confirmPasswordError = computed(() => {
  if (!confirmPassword.value) {
    return submitted.value;
  }

  return confirmPassword.value !== password.value;
});

async function register() {
  submitted.value = true;
  const success = await auth.register(
    fullName.value,
    email.value,
    password.value,
    confirmPassword.value,
  );

  if (success) {
    await navigateTo({
      path: "/verify",
      query: { redirect: returnTo.value || undefined },
    });
  }
}
</script>

<template>
  <main class="login-page">
    <ThemeToggle class="auth-theme-toggle" />

    <AuthPanel
      heading-id="register-title"
      :title="t('auth.createKey')"
      :description="t('auth.registerDescription')"
      card-class="register-card"
      :loading="auth.isLoading"
    >
      <form class="auth-form" @submit.prevent="register">
        <FormField
          v-model="fullName"
          id="full-name"
          :label="t('auth.fullName')"
          autocomplete="name"
          :error="fullNameError"
          error-message="Enter your full name."
        />

        <FormField
          v-model="email"
          id="email"
          :label="t('auth.email')"
          type="email"
          autocomplete="email"
          :placeholder="t('auth.emailPlaceholder')"
          :error="emailError"
          error-message="Enter a valid email address."
        />

        <PasswordStrengthInput
          v-model="password"
          id="password"
          :label="t('auth.password')"
          autocomplete="new-password"
          :placeholder="t('auth.passwordPlaceholder')"
          :full-name="fullName"
          :error="submitted && !password"
        />

        <FormField
          v-model="confirmPassword"
          id="confirm-password"
          :label="t('auth.confirmPassword')"
          type="password"
          autocomplete="new-password"
          :placeholder="t('auth.confirmPasswordPlaceholder')"
          :error="confirmPasswordError"
          error-message="Passwords must match."
          show-password-toggle
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
          {{ t("auth.createAccount") }} <span aria-hidden="true">→</span>
        </button>
      </form>

      <p class="help-text">
        {{ t("auth.alreadyAccount") }}
        <NuxtLink
          :to="{ path: '/login', query: { redirect: returnTo || undefined } }"
          >{{ t("auth.signIn") }}</NuxtLink
        >
      </p>
    </AuthPanel>

    <footer class="login-footer">
      <span>© 2026 Open Sesame</span>
      <span><a href="#">Privacy</a><a href="#">Status</a></span>
    </footer>
  </main>
</template>
