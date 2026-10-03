<script setup lang="ts">
definePageMeta({
  layout: "auth",
  middleware: [
    "guest",
    () => {
      // Only reachable while an email awaits its code (after sign-up or an email change).
      if (!useAuthStore().pendingEmail) {
        return navigateTo("/register");
      }
    },
  ],
});

import { resolveLoginRedirect } from "~/utils/oauth";

const RESEND_COOLDOWN_SECONDS = 60;

const auth = useAuthStore();
const afterSignIn = useAfterSignIn();
const { t } = useI18n();
const route = useRoute();
const fromSignIn = ref(false);
const config = useRuntimeConfig();
// Carried through sign-up / sign-in (e.g. a pending OAuth consent), or the profile
// page when a signed-in user changed their email.
const returnTo = computed(
  () => resolveLoginRedirect(route.query, config.public.apiBaseUrl) || undefined,
);
const otp = ref("");
const submitted = ref(false);
const resent = ref(false);
const { remaining: cooldown, start: startCooldown } = useCooldown(RESEND_COOLDOWN_SECONDS);
const otpError = computed(() => submitted.value && otp.value.length !== 6);

async function verify() {
  if (auth.isLoading) {
    return;
  }

  submitted.value = true;
  resent.value = false;
  const success = await auth.verifyEmail(otp.value);

  if (success && auth.isAuthenticated) {
    // Re-verifying a changed email: the session is still valid, so skip sign-in.
    auth.clearPendingEmail();
    await auth.fetchMe();
    await afterSignIn(returnTo.value);
  } else if (success) {
    await navigateTo({
      path: "/login",
      query: { verified: "1", redirect: returnTo.value },
    });
  } else {
    // The API error already explains what went wrong; let the user retype.
    submitted.value = false;
    otp.value = "";
  }
}

async function resend() {
  resent.value = false;
  submitted.value = false;

  if (await auth.resendVerification()) {
    otp.value = "";
    resent.value = true;
    startCooldown();
  }
}

async function requestNewCode() {
  // A manual resend replaces the "not verified yet" notice from sign-in.
  fromSignIn.value = false;
  await resend();
}

async function startOver() {
  auth.clearPendingEmail();

  if (auth.isAuthenticated) {
    // Changed email: go back and fix it on the profile page instead of re-registering.
    await navigateTo(returnTo.value || "/dashboard/profile");
    return;
  }

  await navigateTo({ path: "/register", query: { redirect: returnTo.value } });
}

// Submit as soon as the full code is typed or pasted.
watch(otp, (value) => {
  if (value.length === 6) {
    verify();
  }
});

onMounted(async () => {
  auth.error = "";

  if (route.query.resend === "1") {
    fromSignIn.value = true;
    // Drop the flag so a refresh doesn't burn another resend.
    await navigateTo(
      { path: "/verify", query: { redirect: returnTo.value } },
      { replace: true },
    );
    await resend();

    if (auth.error) {
      // The resend failed (e.g. rate limited); still let the user retry later.
      startCooldown();
    }
    return;
  }

  startCooldown();
});

useHead({ title: () => t("titles.verify") });
</script>

<template>
  <AuthPanel
    heading-id="verify-title"
    :title="t('auth.verify.title')"
    :description="t('auth.verify.description', { email: auth.pendingEmail })"
    :loading="auth.isLoading"
  >
    <form class="auth-form" @submit.prevent="verify">
      <AlertMessage v-if="auth.error">
        {{ auth.error }}
      </AlertMessage>

      <AlertMessage v-else-if="resent" tone="success">
        {{ fromSignIn ? t("auth.verify.notVerified") : t("auth.verify.resent") }}
      </AlertMessage>

      <OtpInput
        v-model="otp"
        id="otp"
        :label="t('auth.verify.code')"
        :error="otpError"
        :error-message="t('auth.verify.codeError')"
      />

      <SubmitButton :loading="auth.isLoading">
        {{ t("auth.verify.submit") }}
      </SubmitButton>
    </form>

    <p class="help-text">
      {{ t("auth.verify.noCode") }}
      <button
        type="button"
        class="link link-primary no-underline hover:underline disabled:no-underline disabled:opacity-60"
        :disabled="cooldown > 0"
        @click="requestNewCode"
      >
        {{
          cooldown > 0
            ? t("auth.verify.resendIn", { seconds: cooldown })
            : t("auth.verify.resend")
        }}
      </button>
      <br />
      {{ t("auth.verify.wrongEmail") }}
      <button type="button" class="link link-primary no-underline hover:underline" @click="startOver">{{
        auth.isAuthenticated ? t("auth.verify.editEmail") : t("auth.verify.startOver")
      }}</button>
    </p>
  </AuthPanel>
</template>
