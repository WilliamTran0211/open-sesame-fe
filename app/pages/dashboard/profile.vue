<script setup lang="ts">
import QRCode from "qrcode";

definePageMeta({
  middleware: ["auth"],
});

import type { MfaMethod, MfaSetup } from "~/stores/auth";
import { isValidEmail } from "~/utils/email";
import { isPasswordQualified } from "~/utils/password";

const PROFILE_PATH = "/dashboard/profile";
const MFA_RESEND_COOLDOWN_SECONDS = 60;

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
const mfaEnabled = ref<boolean | null>(null);
const mfaSetup = ref<MfaSetup | null>(null);
const mfaQrCode = ref("");
const mfaCode = ref("");
const mfaError = ref("");
const mfaNotice = ref("");
const mfaBusy = ref(false);
const recoveryCodes = ref<string[]>([]);
const mfaCodeSent = ref(false);
const mfaResendCooldown = ref(0);
// Only known if the profile API reports it; until then offer the email option.
const usesAuthenticatorApp = computed(() => auth.user?.mfa_method === "totp");
let mfaCooldownTimer: number | undefined;

function startMfaCooldown() {
  mfaResendCooldown.value = MFA_RESEND_COOLDOWN_SECONDS;
  window.clearInterval(mfaCooldownTimer);
  mfaCooldownTimer = window.setInterval(() => {
    mfaResendCooldown.value -= 1;

    if (mfaResendCooldown.value <= 0) {
      window.clearInterval(mfaCooldownTimer);
    }
  }, 1000);
}

async function sendMfaEmailCode() {
  if (mfaResendCooldown.value > 0) {
    return;
  }

  mfaError.value = "";
  mfaNotice.value = "";
  mfaBusy.value = true;
  const error = await auth.requestMfaCode();
  mfaBusy.value = false;
  startMfaCooldown();

  if (error) {
    mfaError.value = error;
    return;
  }

  mfaCode.value = "";
  mfaCodeSent.value = true;
  mfaNotice.value = t("profile.mfa.emailSent", { email: auth.user?.email });
}

async function startMfaSetup(method: MfaMethod) {
  mfaBusy.value = true;
  mfaError.value = "";
  mfaNotice.value = "";
  recoveryCodes.value = [];

  const result = await auth.setupMfa(method);
  if (result.error || !result.setup) {
    mfaError.value = result.error || t("profile.mfa.errors.setup");
    mfaBusy.value = false;
    return;
  }

  mfaSetup.value = result.setup;

  if (result.setup.method === "email") {
    // The API already emailed the first code.
    mfaBusy.value = false;
    startMfaCooldown();
    return;
  }

  try {
    mfaQrCode.value = await QRCode.toDataURL(result.setup.provisioning_uri || "", {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 240,
    });
  } catch {
    mfaError.value = t("profile.mfa.errors.qr");
  } finally {
    mfaBusy.value = false;
  }
}

async function enableMfa() {
  mfaError.value = "";
  mfaNotice.value = "";

  if (!/^\d{6}$/.test(mfaCode.value)) {
    mfaError.value = t("profile.mfa.errors.code");
    return;
  }

  mfaBusy.value = true;
  const result = await auth.confirmMfa(mfaCode.value);
  mfaBusy.value = false;

  if (result.error) {
    mfaError.value = result.error;
    mfaCode.value = "";
    return;
  }

  mfaEnabled.value = true;
  recoveryCodes.value = result.recoveryCodes;
  mfaSetup.value = null;
  mfaQrCode.value = "";
  mfaCode.value = "";
  mfaCodeSent.value = false;
}

function cancelMfaSetup() {
  mfaSetup.value = null;
  mfaQrCode.value = "";
  mfaCode.value = "";
  mfaError.value = "";
  mfaNotice.value = "";
}

async function turnOffMfa() {
  mfaError.value = "";
  mfaNotice.value = "";

  if (!/^\d{6}$/.test(mfaCode.value)) {
    mfaError.value = t("profile.mfa.errors.code");
    return;
  }

  mfaBusy.value = true;
  const error = await auth.disableMfa(mfaCode.value);
  mfaBusy.value = false;

  if (error) {
    mfaError.value = error;
    mfaCode.value = "";
    return;
  }

  mfaEnabled.value = false;
  mfaCode.value = "";
  mfaCodeSent.value = false;
  mfaNotice.value = t("profile.mfa.disabled");
}

function dismissRecoveryCodes() {
  recoveryCodes.value = [];
  mfaNotice.value = t("profile.mfa.enabled");
}

const newPasswordError = computed(() => {
  if (!passwordSubmitted.value) return "";
  if (!isPasswordQualified(newPassword.value, fullName.value)) {
    return t("auth.errors.weakPassword");
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

onBeforeUnmount(() => window.clearInterval(mfaCooldownTimer));

onMounted(async () => {
  // Pick up is_verified changes made on /verify.
  await auth.fetchMe();
  const enabled = auth.user?.mfa_enabled;
  mfaEnabled.value = typeof enabled === "boolean" ? enabled : null;
});

watch(
  () => auth.user,
  (user) => {
    if (user && !isSavingProfile.value) {
      fullName.value = String(user.full_name || "");
      email.value = String(user.email || "");
    }
  },
);
</script>

<template>
  <DashboardShell>
    <div class="dashboard-intro">
      <p class="eyebrow">{{ t("profile.eyebrow") }}</p>
      <h1>{{ t("profile.title") }}</h1>
      <p>{{ t("profile.description") }}</p>
    </div>

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

      <div
        v-if="!isVerified"
        role="alert"
        class="alert alert-warning py-2 text-sm"
      >
        <span>{{ t("profile.account.unverifiedHint") }}</span>
        <button type="button" class="btn btn-sm" @click="verifyCurrentEmail">
          {{ t("profile.account.verifyNow") }}
        </button>
      </div>

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

        <div
          v-if="profileError"
          role="alert"
          class="alert alert-error py-2 text-xs"
        >
          {{ profileError }}
        </div>
        <div
          v-else-if="profileNotice"
          role="status"
          class="alert alert-success py-2 text-xs"
        >
          {{ profileNotice }}
        </div>

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
          <p v-if="newPasswordError" class="dash-field-error">
            {{ newPasswordError }}
          </p>
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

        <div
          v-if="passwordError"
          role="alert"
          class="alert alert-error py-2 text-xs"
        >
          {{ passwordError }}
        </div>
        <div
          v-else-if="passwordNotice"
          role="status"
          class="alert alert-success py-2 text-xs"
        >
          {{ passwordNotice }}
        </div>

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

    <section class="dash-card">
      <div class="dash-card-header">
        <h2 class="dash-card-title">{{ t("profile.mfa.title") }}</h2>
        <span
          class="badge badge-sm"
          :class="mfaEnabled ? 'badge-success' : 'badge-neutral'"
        >
          {{
            mfaEnabled === null
              ? t("profile.mfa.statusUnknown")
              : mfaEnabled
                ? t("profile.mfa.statusOn")
                : t("profile.mfa.statusOff")
          }}
        </span>
      </div>
      <p class="dash-field-hint">{{ t("profile.mfa.description") }}</p>
      <p v-if="mfaEnabled === null" class="dash-field-hint">
        {{ t("profile.mfa.statusHint") }}
      </p>

      <div v-if="mfaSetup" class="mt-4 space-y-4">
        <template v-if="mfaSetup.method === 'totp'">
          <p>{{ t("profile.mfa.scan") }}</p>
          <img
            v-if="mfaQrCode"
            :src="mfaQrCode"
            :alt="t('profile.mfa.qrAlt')"
            width="240"
            height="240"
            class="rounded bg-white p-3"
          />
          <div>
            <p class="dash-field-hint">{{ t("profile.mfa.manual") }}</p>
            <code class="break-all select-all">{{ mfaSetup.secret }}</code>
          </div>
        </template>
        <p v-else>
          {{ t("profile.mfa.emailSetup", { email: auth.user?.email }) }}
        </p>
        <form class="dash-form" novalidate @submit.prevent="enableMfa">
          <OtpInput
            v-model="mfaCode"
            id="mfa-enable-code"
            :label="
              mfaSetup.method === 'email'
                ? t('profile.mfa.emailCode')
                : t('profile.mfa.code')
            "
            :error="!!mfaError && !mfaCode"
            :error-message="mfaError"
          />
          <div class="dash-form-actions">
            <button type="submit" class="btn btn-primary" :disabled="mfaBusy">
              <span v-if="mfaBusy" class="loading loading-spinner loading-xs" />
              {{ t("profile.mfa.confirm") }}
            </button>
            <button
              v-if="mfaSetup.method === 'email'"
              type="button"
              class="btn btn-ghost"
              :disabled="mfaBusy || mfaResendCooldown > 0"
              @click="sendMfaEmailCode"
            >
              {{
                mfaResendCooldown > 0
                  ? t("auth.verify.resendIn", { seconds: mfaResendCooldown })
                  : t("auth.verify.resend")
              }}
            </button>
            <button
              type="button"
              class="btn btn-ghost"
              :disabled="mfaBusy"
              @click="cancelMfaSetup"
            >
              {{ t("profile.mfa.cancel") }}
            </button>
          </div>
        </form>
      </div>

      <div v-if="recoveryCodes.length" class="mt-4 space-y-3" role="status">
        <h3 class="font-semibold">{{ t("profile.mfa.recoveryTitle") }}</h3>
        <p class="dash-field-hint">
          {{ t("profile.mfa.recoveryDescription") }}
        </p>
        <ul class="grid grid-cols-2 gap-2 font-mono text-sm">
          <li
            v-for="recoveryCode in recoveryCodes"
            :key="recoveryCode"
            class="rounded border border-base-300 px-3 py-2"
          >
            {{ recoveryCode }}
          </li>
        </ul>
        <button
          type="button"
          class="btn btn-primary"
          @click="dismissRecoveryCodes"
        >
          {{ t("profile.mfa.closeRecovery") }}
        </button>
      </div>

      <div
        v-if="mfaEnabled !== true && !mfaSetup && !recoveryCodes.length"
        class="mt-4 flex flex-wrap gap-2"
      >
        <button
          type="button"
          class="btn btn-primary"
          :disabled="mfaBusy"
          @click="startMfaSetup('totp')"
        >
          <span v-if="mfaBusy" class="loading loading-spinner loading-xs" />
          {{ t("profile.mfa.setup") }}
        </button>
        <button
          type="button"
          class="btn btn-outline"
          :disabled="mfaBusy"
          @click="startMfaSetup('email')"
        >
          {{ t("profile.mfa.setupEmail") }}
        </button>
      </div>

      <form
        v-if="mfaEnabled !== false && !mfaSetup && !recoveryCodes.length"
        class="dash-form mt-4"
        novalidate
        @submit.prevent="turnOffMfa"
      >
        <FormField
          v-model="mfaCode"
          id="mfa-disable-code"
          :label="t('profile.mfa.disableCode')"
          autocomplete="one-time-code"
          :placeholder="t('profile.mfa.codePlaceholder')"
          :error="!!mfaError && !mfaCode"
          :error-message="mfaError"
        />
        <div class="dash-form-actions">
          <button type="submit" class="btn btn-outline" :disabled="mfaBusy">
            {{ t("profile.mfa.disable") }}
          </button>
          <button
            v-if="!usesAuthenticatorApp"
            type="button"
            class="btn btn-ghost"
            :disabled="mfaBusy || mfaResendCooldown > 0"
            @click="sendMfaEmailCode"
          >
            {{
              mfaResendCooldown > 0
                ? t("auth.verify.resendIn", { seconds: mfaResendCooldown })
                : mfaCodeSent
                  ? t("auth.verify.resend")
                  : t("profile.mfa.sendEmailCode")
            }}
          </button>
        </div>
      </form>

      <div
        v-if="mfaError"
        role="alert"
        class="alert alert-error mt-4 py-2 text-xs"
      >
        {{ mfaError }}
      </div>
      <div
        v-else-if="mfaNotice"
        role="status"
        class="alert alert-success mt-4 py-2 text-xs"
      >
        {{ mfaNotice }}
      </div>
    </section>

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
  </DashboardShell>
</template>
