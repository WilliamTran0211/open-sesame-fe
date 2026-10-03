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

import { ChevronRight, KeyRound, Mail, Smartphone } from "lucide";
import { resolveLoginRedirect } from "~/utils/oauth";

type Method = "totp" | "email" | "recovery";

const METHOD_ICONS = { totp: Smartphone, email: Mail, recovery: KeyRound };
// Recovery codes are 10 characters; app and email codes are 6 digits.
const RECOVERY_CODE_PATTERN = /^[A-Za-z0-9_-]{10}$/;

const auth = useAuthStore();
const route = useRoute();
const config = useRuntimeConfig();
const { t } = useI18n();

// When the API says which method the account uses, only offer that one
// (plus recovery codes); otherwise let people pick.
const methods = computed<Method[]>(() =>
  auth.mfaMethod ? [auth.mfaMethod, "recovery"] : ["totp", "email", "recovery"],
);
const method = ref<Method | null>(null);
const code = ref("");
const submitted = ref(false);
const redirect = computed(() =>
  resolveLoginRedirect(route.query, config.public.apiBaseUrl),
);

const isRecovery = computed(() => method.value === "recovery");
const codeValid = computed(() =>
  isRecovery.value
    ? RECOVERY_CODE_PATTERN.test(code.value.trim())
    : /^\d{6}$/.test(code.value),
);
const title = computed(() =>
  method.value ? t(`auth.mfa.steps.${method.value}.title`) : t("auth.mfa.title"),
);
const description = computed(() =>
  method.value
    ? t(`auth.mfa.steps.${method.value}.description`)
    : t("auth.mfa.choose"),
);

function choose(next: Method | null) {
  method.value = next;
  code.value = "";
  submitted.value = false;
  auth.error = "";
}

async function verify() {
  submitted.value = true;
  if (!codeValid.value || auth.isLoading) {
    return;
  }

  if (await auth.verifyMfaLogin(code.value)) {
    await navigateTo(redirect.value || "/dashboard");
  }
}

useHead({ title: () => t("titles.mfa") });
</script>

<template>
  <AuthPanel
    heading-id="mfa-title"
    :title="title"
    :description="description"
    :loading="auth.isLoading"
  >
    <ul v-if="!method" class="mfa-methods">
      <li v-for="option in methods" :key="option">
        <button type="button" class="mfa-method" @click="choose(option)">
          <span class="mfa-method-icon">
            <AppIcon :icon="METHOD_ICONS[option]" :size="18" />
          </span>
          <span class="mfa-method-text">
            <strong>{{ t(`auth.mfa.methods.${option}.label`) }}</strong>
            <small>{{ t(`auth.mfa.methods.${option}.hint`) }}</small>
          </span>
          <AppIcon :icon="ChevronRight" class="mfa-method-caret" :size="16" />
        </button>
      </li>
    </ul>

    <form v-else class="auth-form" @submit.prevent="verify">
      <AlertMessage v-if="auth.error">
        {{ auth.error }}
      </AlertMessage>

      <FormField
        v-if="isRecovery"
        v-model="code"
        id="mfa-code"
        :label="t('auth.mfa.methods.recovery.label')"
        autocomplete="off"
        placeholder="xxxxxxxxxx"
        :error="submitted && !codeValid"
        :error-message="t('auth.errors.recoveryCodeInvalid')"
      />
      <OtpInput
        v-else
        v-model="code"
        id="mfa-code"
        :label="t('auth.mfa.code')"
        :error="submitted && !codeValid"
        :error-message="t('auth.errors.mfaCodeRequired')"
      />

      <SubmitButton :loading="auth.isLoading">
        {{ t("auth.mfa.submit") }}
      </SubmitButton>

      <button type="button" class="mfa-switch" @click="choose(null)">
        {{ t("auth.mfa.otherMethod") }}
      </button>
    </form>

    <!-- The API emails a new code with each sign-in; there is no resend for a challenge. -->
    <p v-if="method === 'email'" class="help-text">
      {{ t("auth.mfa.noEmail") }}
      <NuxtLink :to="{ path: '/login', query: { redirect: route.query.redirect } }">
        {{ t("auth.mfa.signInAgain") }}
      </NuxtLink>
    </p>
  </AuthPanel>
</template>
