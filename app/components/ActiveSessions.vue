<script setup lang="ts">
import type { UserSession } from "~/stores/auth";
import { getErrorMessage, getErrorStatus } from "~/utils/api";

const auth = useAuthStore();
const { t, locale } = useI18n();

const sessions = ref<UserSession[]>([]);
const isLoading = ref(false);
const loadError = ref("");
const confirmRevoke = ref(false);
const isRevoking = ref(false);
const revokeError = ref("");

// Enough to tell devices apart; the full string is kept in the title attribute.
function describeAgent(userAgent: string | null) {
  if (!userAgent) {
    return t("profile.sessions.unknownDevice");
  }

  const browser =
    [
      ["Edg/", "Edge"],
      ["OPR/", "Opera"],
      ["Firefox/", "Firefox"],
      ["Chrome/", "Chrome"],
      ["Safari/", "Safari"],
    ].find(([token]) => userAgent.includes(token!))?.[1] || "";
  const os =
    [
      ["Windows", "Windows"],
      ["Android", "Android"],
      ["iPhone", "iOS"],
      ["iPad", "iPadOS"],
      ["Mac OS", "macOS"],
      ["Linux", "Linux"],
    ].find(([token]) => userAgent.includes(token!))?.[1] || "";

  return [browser, os].filter(Boolean).join(" · ") || userAgent;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString(locale.value, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

async function load() {
  isLoading.value = true;
  loadError.value = "";

  try {
    const result = await auth.listSessions();
    sessions.value = [...result].sort(
      (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
    );
  } catch (requestError) {
    // apiFetch already sends an expired session to sign-in; don't flash an error meanwhile.
    if (getErrorStatus(requestError) === 401) {
      return;
    }

    loadError.value = getErrorMessage(
      requestError,
      t("profile.sessions.errors.load"),
    );
  } finally {
    isLoading.value = false;
  }
}

async function revokeAll() {
  isRevoking.value = true;
  revokeError.value = (await auth.revokeAllSessions()) || "";
  isRevoking.value = false;
  confirmRevoke.value = false;

  if (!revokeError.value) {
    // This session was revoked too.
    await navigateTo("/login");
  }
}

onMounted(load);
</script>

<template>
  <section class="dash-card">
    <div class="dash-card-header">
      <h2 class="dash-card-title">{{ t("profile.sessions.title") }}</h2>
      <span v-if="!isLoading && !loadError" class="badge badge-sm">
        {{ t("profile.sessions.count", { count: sessions.length }) }}
      </span>
    </div>
    <p class="dash-field-hint">{{ t("profile.sessions.description") }}</p>

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
        <button type="button" class="btn btn-ghost btn-sm" @click="load">
          {{ t("clients.reload") }}
        </button>
      </template>
    </AlertMessage>

    <ul v-else class="session-list">
      <li v-for="session in sessions" :key="session.session_id" class="session-row">
        <div class="session-main">
          <strong :title="session.user_agent || undefined">
            {{ describeAgent(session.user_agent) }}
          </strong>
          <small>
            {{ session.ip_address || t("profile.sessions.unknownIp") }}
          </small>
        </div>
        <div class="session-meta">
          <small>
            {{ t("profile.sessions.signedIn", { date: formatDate(session.created_at) }) }}
          </small>
          <small>
            {{ t("profile.sessions.expires", { date: formatDate(session.expires_at) }) }}
          </small>
        </div>
      </li>
    </ul>

    <AlertMessage v-if="revokeError">
      {{ revokeError }}
    </AlertMessage>

    <div class="dash-danger-row session-revoke">
      <div>
        <strong>{{ t("profile.sessions.revokeAll.title") }}</strong>
        <p>{{ t("profile.sessions.revokeAll.description") }}</p>
      </div>
      <button
        type="button"
        class="btn btn-outline btn-error btn-sm"
        :disabled="isRevoking || isLoading"
        @click="confirmRevoke = true"
      >
        {{ t("profile.sessions.revokeAll.confirm") }}
      </button>
    </div>

    <ConfirmDialog
      :open="confirmRevoke"
      :title="t('profile.sessions.revokeAll.title')"
      :message="t('profile.sessions.revokeAll.message')"
      :confirm-label="t('profile.sessions.revokeAll.confirm')"
      :loading="isRevoking"
      danger
      @confirm="revokeAll"
      @cancel="confirmRevoke = false"
    />
  </section>
</template>
