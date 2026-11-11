<script setup lang="ts">
import QRCode from "qrcode";
import { Check, Copy, Download } from "lucide";
import { mfaApi, type MfaMethod, type MfaSetup, type MfaStatus } from "~/services/mfa";
import { apiErrorMessage, getErrorStatus, getRetryAfter, isApiError } from "~/utils/api";
import { DEFAULT_RETRY_AFTER, SETUP_RESEND_COOLDOWN } from "~/utils/mfa";

// One panel at a time. Email codes for setup and turning off share a single slot on the API
// (a new one cancels the last), so only the most recent request is ever asked for.
type Panel =
  | { kind: "setup"; method: MfaMethod; setup: MfaSetup; qr: string }
  | { kind: "disable"; method: MfaMethod }
  | { kind: "recovery"; codes: string[] };

const METHODS: MfaMethod[] = ["totp", "email"];
const SIX_DIGITS = /^\d{6}$/;

const auth = useAuthStore();
const { t } = useI18n();

const status = ref<MfaStatus | null>(null);
const isLoading = ref(false);
const loadError = ref("");
const panel = ref<Panel | null>(null);
const code = ref("");
const busy = ref(false);
const error = ref("");
const notice = ref("");
const qrExpired = ref(false);
const confirmLast = ref(false);
const recoveryCopied = ref(false);
const { remaining: resendCooldown, start: startResendCooldown } = useCooldown(
  SETUP_RESEND_COOLDOWN,
);
const { remaining: rateWait, start: startRateWait } = useCooldown(DEFAULT_RETRY_AFTER);

const enabledMethods = computed(() => status.value?.methods ?? []);
const isLastMethod = computed(() => enabledMethods.value.length === 1);
const blocked = computed(() => busy.value || rateWait.value > 0);
const userEmail = computed(() => auth.user?.email ?? "");

function methodLabel(method: MfaMethod) {
  return t(`profile.mfa.methods.${method}`);
}

function begin() {
  error.value = "";
  notice.value = "";
}

// A 429 pauses the actions for as long as the API says; anything else shows its message.
function fail(requestError: unknown, fallbackKey: string) {
  if (getErrorStatus(requestError) === 429) {
    startRateWait(getRetryAfter(requestError) ?? DEFAULT_RETRY_AFTER);
    return;
  }

  error.value = apiErrorMessage(requestError, fallbackKey);
}

function focusCode() {
  nextTick(() => document.getElementById("mfa-panel-code")?.focus());
}

// `quiet` refreshes the status without swapping the list for a skeleton.
async function load(quiet = false) {
  if (!quiet) {
    isLoading.value = true;
  }

  loadError.value = "";

  try {
    status.value = await mfaApi.status();
  } catch (requestError) {
    // The session ended: apiFetch is already sending people to sign in.
    if (!auth.user) {
      return;
    }

    loadError.value = apiErrorMessage(requestError, "profile.mfa.errors.load");
  } finally {
    isLoading.value = false;
  }
}

async function qrFor(uri: string | null | undefined) {
  try {
    return await QRCode.toDataURL(uri || "", { errorCorrectionLevel: "M", margin: 2, width: 240 });
  } catch {
    error.value = t("profile.mfa.errors.qr");
    return "";
  }
}

// Calling setup again renews: a fresh QR code or a fresh email code, the old one stops working.
async function setup(method: MfaMethod, renew = false) {
  begin();
  qrExpired.value = false;
  busy.value = true;

  try {
    const result = await mfaApi.setup(method);
    const qr = method === "totp" ? await qrFor(result.provisioning_uri) : "";

    panel.value = { kind: "setup", method, setup: result, qr };
    code.value = "";

    if (method === "email") {
      startResendCooldown();
      notice.value = renew ? t("profile.mfa.emailSent", { email: userEmail.value }) : "";
    }

    focusCode();
  } catch (requestError) {
    if (isApiError(requestError, "conflict")) {
      panel.value = null;
      await load(true);
    } else {
      fail(requestError, "profile.mfa.errors.setup");
    }
  } finally {
    busy.value = false;
  }
}

async function confirm() {
  if (panel.value?.kind !== "setup") {
    return;
  }

  const { method } = panel.value;
  begin();

  if (!SIX_DIGITS.test(code.value)) {
    error.value = t("profile.mfa.errors.code");
    return;
  }

  busy.value = true;

  try {
    const { recovery_codes: codes } = await mfaApi.confirm(method, code.value);
    code.value = "";

    // Codes only come with the first method; another method keeps the ones already issued.
    if (codes.length) {
      panel.value = { kind: "recovery", codes };
    } else {
      panel.value = null;
      notice.value = t("profile.mfa.methodAdded");
    }

    await load(true);
  } catch (requestError) {
    if (isApiError(requestError, "validation_error", "Start 2FA setup first")) {
      qrExpired.value = true;
      error.value = t("profile.mfa.errors.qrExpired");
    } else if (isApiError(requestError, "validation_error", "Invalid authentication code")) {
      error.value =
        method === "email"
          ? t("profile.mfa.errors.wrongOrExpired")
          : t("profile.mfa.errors.wrongCode");
      code.value = "";
    } else if (isApiError(requestError, "conflict")) {
      panel.value = null;
      await load(true);
    } else {
      fail(requestError, "profile.mfa.errors.confirm");
    }
  } finally {
    busy.value = false;
  }
}

// Turning any method off, TOTP included, needs a code the API emails first.
async function sendDisableCode(resend = false) {
  begin();
  busy.value = true;

  try {
    await mfaApi.requestDisableCode();
    startResendCooldown();
    notice.value = resend ? t("profile.mfa.disable.sent", { email: userEmail.value }) : "";
  } catch (requestError) {
    if (isApiError(requestError, "validation_error", "Two-factor authentication is not enabled")) {
      panel.value = null;
      await load(true);
    } else {
      fail(requestError, "profile.mfa.errors.sendCode");
    }
  } finally {
    busy.value = false;
  }
}

async function openDisable(method: MfaMethod) {
  begin();
  panel.value = { kind: "disable", method };
  code.value = "";
  focusCode();
  await sendDisableCode();
}

function submitDisable() {
  begin();

  if (!SIX_DIGITS.test(code.value)) {
    error.value = t("profile.mfa.errors.code");
    return;
  }

  // The last method switches two-factor off completely; make sure that is meant.
  if (isLastMethod.value) {
    confirmLast.value = true;
    return;
  }

  return runDisable();
}

async function runDisable() {
  confirmLast.value = false;

  if (panel.value?.kind !== "disable") {
    return;
  }

  const { method } = panel.value;
  const wasLast = isLastMethod.value;
  begin();
  busy.value = true;

  try {
    await mfaApi.disable(method, code.value);
    code.value = "";
    panel.value = null;
    notice.value = wasLast
      ? t("profile.mfa.disable.allOff")
      : t("profile.mfa.disable.done", { method: methodLabel(method) });
    await load(true);
  } catch (requestError) {
    if (isApiError(requestError, "validation_error", "Invalid authentication code")) {
      error.value = t("profile.mfa.errors.wrongOrExpired");
      code.value = "";
    } else if (isApiError(requestError, "validation_error", "This two-factor method is not enabled")) {
      panel.value = null;
      await load(true);
    } else {
      fail(requestError, "profile.mfa.errors.disable");
    }
  } finally {
    busy.value = false;
  }
}

function closePanel() {
  panel.value = null;
  code.value = "";
  begin();
}

// --- Recovery codes ----------------------------------------------------------
function recoveryCodesText(codes: string[]) {
  return [
    t("profile.mfa.recoveryFileHeading", { email: userEmail.value }),
    t("profile.mfa.recoveryFileNote"),
    "",
    ...codes,
    "",
  ].join("\n");
}

async function copyRecoveryCodes(codes: string[]) {
  try {
    await navigator.clipboard.writeText(codes.join("\n"));
    recoveryCopied.value = true;
    window.setTimeout(() => (recoveryCopied.value = false), 2000);
  } catch {
    // Clipboard refused (permissions); the codes stay on screen to copy by hand.
  }
}

function downloadRecoveryCodes(codes: string[]) {
  const url = URL.createObjectURL(new Blob([recoveryCodesText(codes)], { type: "text/plain" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "open-sesame-recovery-codes.txt";
  link.click();
  // Revoking in the same tick can cancel the download in some browsers.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function dismissRecoveryCodes() {
  panel.value = null;
  notice.value = t("profile.mfa.enabled");
}

onMounted(load);
</script>

<template>
  <section class="dash-card">
    <div class="dash-card-header">
      <h2 class="dash-card-title">{{ t("profile.mfa.title") }}</h2>
      <span
        v-if="status"
        class="badge badge-sm"
        :class="status.enabled ? 'badge-success' : 'badge-neutral'"
      >
        {{ status.enabled ? t("profile.mfa.statusOn") : t("profile.mfa.statusOff") }}
      </span>
    </div>
    <p class="dash-field-hint">{{ t("profile.mfa.description") }}</p>

    <ul v-if="isLoading" class="session-list" :aria-label="t('common.loading')">
      <li v-for="row in 2" :key="row" class="session-row" aria-hidden="true">
        <div class="session-main">
          <span class="skeleton h-4 w-40" />
          <span class="skeleton h-3 w-24" />
        </div>
      </li>
    </ul>

    <AlertMessage v-else-if="loadError">
      {{ loadError }}
      <template #action>
        <button type="button" class="btn btn-ghost btn-sm" @click="load()">
          {{ t("clients.reload") }}
        </button>
      </template>
    </AlertMessage>

    <ul v-else-if="status" class="session-list mt-4">
      <li v-for="method in METHODS" :key="method" class="session-row">
        <div class="session-main">
          <strong>{{ methodLabel(method) }}</strong>
          <small>{{ t(`profile.mfa.hints.${method}`) }}</small>
        </div>
        <div class="session-meta">
          <span
            class="badge badge-sm"
            :class="enabledMethods.includes(method) ? 'badge-success' : 'badge-neutral'"
          >
            {{ enabledMethods.includes(method) ? t("profile.mfa.statusOn") : t("profile.mfa.statusOff") }}
          </span>
          <button
            v-if="!panel && enabledMethods.includes(method)"
            type="button"
            class="btn btn-outline btn-xs"
            :disabled="blocked"
            :aria-label="t('profile.mfa.turnOffLabel', { method: methodLabel(method) })"
            @click="openDisable(method)"
          >
            {{ t("profile.mfa.turnOff") }}
          </button>
          <button
            v-else-if="!panel"
            type="button"
            class="btn btn-primary btn-xs"
            :disabled="blocked"
            :aria-label="t('profile.mfa.turnOnLabel', { method: methodLabel(method) })"
            @click="setup(method)"
          >
            {{ t("profile.mfa.turnOn") }}
          </button>
        </div>
      </li>
    </ul>

    <!-- Turning a method on -->
    <div v-if="panel?.kind === 'setup'" class="mt-4 space-y-4">
      <template v-if="panel.method === 'totp'">
        <p>{{ t("profile.mfa.setup.scan") }}</p>
        <img
          v-if="panel.qr"
          :src="panel.qr"
          :alt="t('profile.mfa.setup.qrAlt')"
          width="240"
          height="240"
          class="rounded bg-white p-3"
        />
        <div>
          <p class="dash-field-hint">{{ t("profile.mfa.setup.manual") }}</p>
          <code class="break-all select-all">{{ panel.setup.secret }}</code>
        </div>
        <p class="dash-field-hint">{{ t("profile.mfa.setup.qrValid") }}</p>
      </template>
      <p v-else>{{ t("profile.mfa.setup.emailIntro", { email: userEmail }) }}</p>

      <form class="dash-form" novalidate @submit.prevent="confirm">
        <OtpInput
          v-model="code"
          id="mfa-panel-code"
          :label="
            panel.method === 'email'
              ? t('profile.mfa.setup.emailCode')
              : t('profile.mfa.setup.appCode')
          "
          :error="!!error && !code"
        />
        <div class="dash-form-actions">
          <button type="submit" class="btn btn-primary" :disabled="blocked">
            <span v-if="busy" class="loading loading-spinner loading-xs" />
            {{ t("profile.mfa.setup.confirm") }}
          </button>
          <button
            v-if="panel.method === 'totp'"
            type="button"
            class="btn btn-ghost"
            :disabled="blocked"
            @click="setup('totp', true)"
          >
            {{ t("profile.mfa.setup.newQr") }}
          </button>
          <button
            v-else
            type="button"
            class="btn btn-ghost"
            :disabled="blocked || resendCooldown > 0"
            @click="setup('email', true)"
          >
            {{
              resendCooldown > 0
                ? t("auth.verify.resendIn", { seconds: resendCooldown })
                : t("auth.verify.resend")
            }}
          </button>
          <button type="button" class="btn btn-ghost" :disabled="busy" @click="closePanel">
            {{ t("profile.mfa.cancel") }}
          </button>
        </div>
      </form>
    </div>

    <!-- Turning a method off: always with a code emailed to the account -->
    <div v-else-if="panel?.kind === 'disable'" class="mt-4 space-y-4">
      <p>{{ t("profile.mfa.disable.intro", { email: userEmail }) }}</p>
      <AlertMessage v-if="isLastMethod" tone="warning">
        {{ t("profile.mfa.disable.lastWarning") }}
      </AlertMessage>

      <form class="dash-form" novalidate @submit.prevent="submitDisable">
        <OtpInput
          v-model="code"
          id="mfa-panel-code"
          :label="t('profile.mfa.disable.code')"
          :error="!!error && !code"
        />
        <div class="dash-form-actions">
          <button type="submit" class="btn btn-outline" :disabled="blocked">
            <span v-if="busy" class="loading loading-spinner loading-xs" />
            {{ isLastMethod ? t("profile.mfa.disable.confirmLast") : t("profile.mfa.disable.confirm") }}
          </button>
          <button
            type="button"
            class="btn btn-ghost"
            :disabled="blocked || resendCooldown > 0"
            @click="sendDisableCode(true)"
          >
            {{
              resendCooldown > 0
                ? t("auth.verify.resendIn", { seconds: resendCooldown })
                : t("auth.verify.resend")
            }}
          </button>
          <button type="button" class="btn btn-ghost" :disabled="busy" @click="closePanel">
            {{ t("profile.mfa.cancel") }}
          </button>
        </div>
      </form>
    </div>

    <!-- Recovery codes: shown once, with the first method -->
    <div v-else-if="panel?.kind === 'recovery'" class="mt-4 space-y-3" role="status">
      <h3 class="font-semibold">{{ t("profile.mfa.recoveryTitle") }}</h3>
      <p class="dash-field-hint">{{ t("profile.mfa.recoveryDescription") }}</p>
      <ul class="grid grid-cols-2 gap-2 font-mono text-sm">
        <li
          v-for="recoveryCode in panel.codes"
          :key="recoveryCode"
          class="rounded border border-base-300 px-3 py-2"
        >
          {{ recoveryCode }}
        </li>
      </ul>
      <div class="flex flex-wrap gap-2">
        <button type="button" class="btn btn-ghost" @click="copyRecoveryCodes(panel.codes)">
          <AppIcon :icon="recoveryCopied ? Check : Copy" :size="16" />
          {{ recoveryCopied ? t("clients.copied") : t("profile.mfa.copyRecovery") }}
        </button>
        <button type="button" class="btn btn-ghost" @click="downloadRecoveryCodes(panel.codes)">
          <AppIcon :icon="Download" :size="16" />
          {{ t("profile.mfa.downloadRecovery") }}
        </button>
        <button type="button" class="btn btn-primary" @click="dismissRecoveryCodes">
          {{ t("profile.mfa.closeRecovery") }}
        </button>
      </div>
    </div>

    <AlertMessage v-if="rateWait > 0" tone="warning" class="mt-4">
      {{ t("profile.mfa.errors.rateLimited", { seconds: rateWait }) }}
    </AlertMessage>
    <AlertMessage v-else-if="error" class="mt-4">
      {{ error }}
    </AlertMessage>
    <AlertMessage v-else-if="notice" tone="success" class="mt-4">
      {{ notice }}
    </AlertMessage>

    <ConfirmDialog
      :open="confirmLast"
      :title="t('profile.mfa.disable.dialogTitle')"
      :message="t('profile.mfa.disable.dialogMessage')"
      :confirm-label="t('profile.mfa.disable.confirmLast')"
      :loading="busy"
      danger
      @confirm="runDisable"
      @cancel="confirmLast = false"
    />
  </section>
</template>
