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
const justVerified = computed(() => route.query.verified === "1");
const justReset = computed(() => route.query.reset === "1");
const resetEmail = useState<string>("auth.resetEmail", () => "");
// Set when sign-in was triggered by a protected page or an OAuth authorize request.
const returnTo = computed(() =>
  resolveLoginRedirect(route.query, config.public.apiBaseUrl),
);
const email = ref("");
const password = ref("");
const rememberDevice = ref(false);
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
      title="Open the door!"
      description="Sign in to continue to your workspace."
    >
      <form class="auth-form" @submit.prevent="signIn">
        <FormField
          v-model="email"
          id="email"
          label="Email"
          type="email"
          autocomplete="email"
          placeholder="you@company.com"
          :error="emailError"
          error-message="Enter a valid email address."
        />

        <FormField
          v-model="password"
          id="password"
          label="Password"
          type="password"
          autocomplete="current-password"
          placeholder="Enter your password"
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
              >Forgot password?</NuxtLink
            >
          </template>
        </FormField>

        <label class="remember-option cursor-pointer">
          <input
            v-model="rememberDevice"
            id="remember"
            type="checkbox"
            class="checkbox checkbox-primary"
          />
          <span>Remember me</span>
        </label>

        <div
          v-if="auth.error"
          role="alert"
          class="alert alert-error py-2 text-xs"
        >
          {{ auth.error }}
        </div>

        <div
          v-else-if="justVerified"
          role="status"
          class="alert alert-success py-2 text-xs"
        >
          {{ t("auth.verify.verified") }}
        </div>

        <div
          v-else-if="justReset"
          role="status"
          class="alert alert-success py-2 text-xs"
        >
          {{ t("auth.reset.done") }}
        </div>

        <button
          type="submit"
          class="btn btn-primary w-full"
          :class="{ loading: auth.isLoading }"
          :disabled="auth.isLoading"
        >
          Continue <span aria-hidden="true">→</span>
        </button>
      </form>

      <div class="divider auth-divider">OR</div>
      <button type="button" class="btn btn-outline w-full">
        Continue with SSO
      </button>

      <p class="help-text">
        New here?
        <NuxtLink
          :to="{
            path: '/register',
            query: { redirect: returnTo || undefined },
          }"
          >Create an account</NuxtLink
        >
      </p>
    </AuthPanel>

    <footer class="login-footer">
      <span>© 2026 Open Sesame</span>
      <span><a href="#">Privacy</a><a href="#">Status</a></span>
    </footer>
  </main>
</template>
