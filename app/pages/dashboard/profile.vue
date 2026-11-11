<script setup lang="ts">
definePageMeta({
  layout: "dashboard",
  middleware: ["auth"],
});

import { isValidEmail } from "~/utils/email";
import { passwordProblem } from "~/utils/password";

const PROFILE_PATH = "/dashboard/profile";

const auth = useAuthStore();
const { t } = useI18n();

// --- Account details -------------------------------------------------------
const fullName = ref(String(auth.user?.full_name || ""));
const email = ref(String(auth.user?.email || ""));
const profileSubmitted = ref(false);
const isSavingProfile = ref(false);
const profileError = ref("");
const profileNotice = ref("");
const confirmEmailChange = ref(false);

const isVerified = computed(() => auth.user?.is_verified !== false);
const normalizedEmail = computed(() => email.value.trim().toLowerCase());
const emailChanged = computed(
  () => normalizedEmail.value !== String(auth.user?.email || "").toLowerCase(),
);
const nameChanged = computed(
  () => fullName.value.trim() !== String(auth.user?.full_name || ""),
);
const fullNameError = computed(
  () => profileSubmitted.value && !fullName.value.trim(),
);
const emailError = computed(
  () => profileSubmitted.value && !isValidEmail(email.value),
);

function submitProfile() {
  profileSubmitted.value = true;
  profileError.value = "";
  profileNotice.value = "";

  if (!fullName.value.trim() || !isValidEmail(email.value)) {
    return;
  }

  if (!nameChanged.value && !emailChanged.value) {
    profileNotice.value = t("profile.noChanges");
    return;
  }

  // A new email signs the account out of "verified" until the OTP is entered.
  if (emailChanged.value) {
    confirmEmailChange.value = true;
    return;
  }

  saveProfile();
}

async function saveProfile() {
  isSavingProfile.value = true;

  const result = await auth.updateProfile({
    full_name: nameChanged.value ? fullName.value.trim() : undefined,
    email: emailChanged.value ? normalizedEmail.value : undefined,
  });

  isSavingProfile.value = false;
  confirmEmailChange.value = false;

  if (result.error) {
    profileError.value = result.error;
    return;
  }

  profileSubmitted.value = false;

  if (result.emailChanged) {
    // The API already emailed a code to the new address.
    await navigateTo({ path: "/verify", query: { redirect: PROFILE_PATH } });
    return;
  }

  profileNotice.value = t("profile.saved");
}

async function verifyCurrentEmail() {
  auth.setPendingEmail(String(auth.user?.email || ""));
  await navigateTo({
    path: "/verify",
    query: { resend: "1", redirect: PROFILE_PATH },
  });
}

// --- Password ------------------------------------------------------------
const currentPassword = ref("");
const newPassword = ref("");
const confirmPassword = ref("");
const passwordSubmitted = ref(false);
const isSavingPassword = ref(false);
const passwordError = ref("");
const passwordNotice = ref("");
const newPasswordError = computed(() => {
  if (!passwordSubmitted.value) return "";
  const problem = passwordProblem(newPassword.value, fullName.value);
  if (problem) {
    return t(problem);
  }
  if (newPassword.value === currentPassword.value) {
    return t("profile.password.sameAsCurrent");
  }
  return "";
});
const confirmPasswordError = computed(
  () =>
    (passwordSubmitted.value || !!confirmPassword.value) &&
    confirmPassword.value !== newPassword.value,
);

async function submitPassword() {
  passwordSubmitted.value = true;
  passwordError.value = "";
  passwordNotice.value = "";

  if (
    !currentPassword.value ||
    newPasswordError.value ||
    confirmPasswordError.value
  ) {
    return;
  }

  isSavingPassword.value = true;
  const error = await auth.changePassword(
    currentPassword.value,
    newPassword.value,
  );
  isSavingPassword.value = false;

  if (error) {
    passwordError.value = error;
    return;
  }

  currentPassword.value = "";
  newPassword.value = "";
  confirmPassword.value = "";
  passwordSubmitted.value = false;
  passwordNotice.value = t("profile.password.changed");
}

onMounted(async () => {
  // Pick up is_verified changes made on /verify.
  await auth.fetchMe();
});

// Follow profile updates, but only for fields the person hasn't started editing.
watch(
  () => auth.user,
  (user, previous) => {
    if (!user || isSavingProfile.value) {
      return;
    }

    if (fullName.value === String(previous?.full_name || "")) {
      fullName.value = String(user.full_name || "");
    }

    if (email.value === String(previous?.email || "")) {
      email.value = String(user.email || "");
    }
  },
);

useHead({ title: () => t("titles.profile") });
</script>

<template>
  <PageHeader
    :title="t('profile.title')"
    :description="t('profile.description')"
  />

  <section class="dash-card">
    <div class="dash-card-header">
      <h2 class="dash-card-title">{{ t("profile.account.title") }}</h2>
      <span
        class="badge badge-sm"
        :class="isVerified ? 'badge-success' : 'badge-warning'"
      >
        {{
          isVerified
            ? t("profile.account.verified")
            : t("profile.account.unverified")
        }}
      </span>
    </div>

    <AlertMessage v-if="!isVerified" tone="warning">
      {{ t("profile.account.unverifiedHint") }}
      <template #action>
        <button type="button" class="btn btn-sm" @click="verifyCurrentEmail">
          {{ t("profile.account.verifyNow") }}
        </button>
      </template>
    </AlertMessage>

    <form class="dash-form" novalidate @submit.prevent="submitProfile">
      <FormField
        v-model="fullName"
        id="profile-full-name"
        :label="t('auth.fullName')"
        autocomplete="name"
        :error="fullNameError"
        :error-message="t('profile.account.nameRequired')"
      />
      <FormField
        v-model="email"
        id="profile-email"
        :label="t('auth.email')"
        type="email"
        autocomplete="email"
        :error="emailError"
        :error-message="t('auth.errors.invalidEmail')"
      />
      <p v-if="emailChanged" class="dash-field-hint">
        {{ t("profile.account.emailChangeHint") }}
      </p>

      <AlertMessage v-if="profileError">
        {{ profileError }}
      </AlertMessage>
      <AlertMessage v-else-if="profileNotice" tone="success">
        {{ profileNotice }}
      </AlertMessage>

      <div class="dash-form-actions">
        <button
          type="submit"
          class="btn btn-primary"
          :disabled="isSavingProfile"
        >
          <span
            v-if="isSavingProfile"
            class="loading loading-spinner loading-xs"
          />
          {{ t("profile.save") }}
        </button>
      </div>
    </form>
  </section>

  <section class="dash-card">
    <h2 class="dash-card-title">{{ t("profile.password.title") }}</h2>

    <form class="dash-form" novalidate @submit.prevent="submitPassword">
      <!-- Lets password managers pair the new password with this account. -->
      <input
        type="text"
        name="username"
        autocomplete="username"
        :value="auth.user?.email"
        hidden
        readonly
      />
      <FormField
        v-model="currentPassword"
        id="current-password"
        :label="t('profile.password.current')"
        :placeholder="t('profile.password.currentRequired')"
        type="password"
        autocomplete="current-password"
        :error="passwordSubmitted && !currentPassword"
        :error-message="t('profile.password.currentRequired')"
        show-password-toggle
      />
      <div>
        <PasswordStrengthInput
          v-model="newPassword"
          id="new-password"
          :label="t('profile.password.new')"
          :placeholder="t('auth.passwordPlaceholder')"
          :full-name="fullName"
          :error="!!newPasswordError"
        />
        <AlertMessage v-if="newPasswordError" compact>
          {{ newPasswordError }}
        </AlertMessage>
      </div>
      <FormField
        v-model="confirmPassword"
        id="confirm-new-password"
        :label="t('auth.confirmPassword')"
        type="password"
        autocomplete="new-password"
        :placeholder="t('auth.confirmPasswordPlaceholder')"
        :error="confirmPasswordError"
        :error-message="t('auth.errors.passwordMismatch')"
        show-password-toggle
      />

      <AlertMessage v-if="passwordError">
        {{ passwordError }}
      </AlertMessage>
      <AlertMessage v-else-if="passwordNotice" tone="success">
        {{ passwordNotice }}
      </AlertMessage>

      <div class="dash-form-actions">
        <button
          type="submit"
          class="btn btn-primary"
          :disabled="isSavingPassword"
        >
          <span
            v-if="isSavingPassword"
            class="loading loading-spinner loading-xs"
          />
          {{ t("profile.password.submit") }}
        </button>
      </div>
    </form>
  </section>

  <TwoFactorSettings />

  <ActiveSessions />

  <ConfirmDialog
    :open="confirmEmailChange"
    :title="t('profile.emailDialog.title')"
    :message="t('profile.emailDialog.message', { email: normalizedEmail })"
    :confirm-label="t('profile.emailDialog.confirm')"
    :loading="isSavingProfile"
    @confirm="saveProfile"
    @cancel="confirmEmailChange = false"
  />
</template>
