<script setup lang="ts">
definePageMeta({
  middleware: ["auth"],
});

import moonIcon from "~/assets/icons/moon.svg";
import sunIcon from "~/assets/icons/sun.svg";
import {
  buildAuthorizeUrl,
  buildDeniedUrl,
  getUrlHost,
  isRegisteredRedirect,
  parseAuthorizeRequest,
} from "~/utils/oauth";

type ConsentState = "ready" | "redirecting" | "cancelled";

const auth = useAuthStore();
const route = useRoute();
const config = useRuntimeConfig();
const { t } = useI18n();
const isDark = useState<boolean>("theme.isDark");
const { client, isLoading: isClientLoading, load: loadClient } = useOAuthClient();

const parsed = computed(() => parseAuthorizeRequest(route.query));
const request = computed(() => parsed.value.request);
const consentState = ref<ConsentState>("ready");
const appName = computed(
  () => client.value?.name || request.value?.clientId || "",
);
const userName = computed(() => auth.getDisplayName(auth.user));
const clientInactive = computed(() => client.value?.is_active === false);

function allow() {
  if (!request.value) {
    return;
  }

  consentState.value = "redirecting";
  window.location.assign(buildAuthorizeUrl(config.public.apiBaseUrl, request.value));
}

function deny() {
  if (!request.value) {
    return;
  }

  // Only bounce back to a redirect we could confirm is registered for this client;
  // otherwise this page would be an open redirect.
  if (isRegisteredRedirect(client.value, request.value.redirectUri)) {
    consentState.value = "redirecting";
    window.location.assign(buildDeniedUrl(request.value));
    return;
  }

  consentState.value = "cancelled";
}

async function switchAccount() {
  const returnTo = route.fullPath;
  await auth.signOut();
  await navigateTo({ path: "/login", query: { redirect: returnTo } });
}

onMounted(() => {
  if (request.value) {
    loadClient(request.value.clientId);
  }
});
</script>

<template>
  <main class="login-page">
    <label class="theme-toggle" title="Toggle dark mode">
      <input
        id="theme-toggle"
        v-model="isDark"
        type="checkbox"
        class="toggle toggle-sm toggle-primary"
        aria-label="Toggle dark mode"
      />
      <span class="theme-toggle-icons" aria-hidden="true">
        <img class="theme-icon theme-icon-sun" :src="sunIcon" alt="" />
        <img class="theme-icon theme-icon-moon" :src="moonIcon" alt="" />
      </span>
    </label>

    <AuthPanel
      v-if="!request"
      heading-id="consent-title"
      :eyebrow="t('oauth.eyebrow')"
      :title="t('oauth.invalid.title')"
      :description="t(`oauth.invalid.${parsed.error}`)"
      card-class="oauth-card"
    >
      <NuxtLink to="/dashboard" class="btn btn-outline w-full">
        {{ t("oauth.backToDashboard") }}
      </NuxtLink>
    </AuthPanel>

    <AuthPanel
      v-else-if="consentState === 'cancelled'"
      heading-id="consent-title"
      :eyebrow="t('oauth.eyebrow')"
      :title="t('oauth.cancelled.title')"
      :description="t('oauth.cancelled.description', { app: appName })"
      card-class="oauth-card"
    >
      <NuxtLink to="/dashboard" class="btn btn-outline w-full">
        {{ t("oauth.backToDashboard") }}
      </NuxtLink>
    </AuthPanel>

    <AuthPanel
      v-else
      heading-id="consent-title"
      :eyebrow="t('oauth.eyebrow')"
      :title="t('oauth.title', { app: appName })"
      :description="t('oauth.description')"
      card-class="oauth-card"
      :loading="consentState === 'redirecting'"
    >
      <div class="oauth-consent">
        <OAuthClientSummary
          :client-id="request.clientId"
          :redirect-uri="request.redirectUri"
          :client="client"
          :loading="isClientLoading"
        />

        <OAuthAccountChip
          :name="userName"
          :email="auth.user?.email"
          @switch="switchAccount"
        />

        <div>
          <p class="oauth-section-label">
            {{ t("oauth.permissionsLabel", { app: appName }) }}
          </p>
          <OAuthScopeList :scopes="request.scopes" />
        </div>

        <div
          v-if="clientInactive"
          role="alert"
          class="alert alert-error py-2 text-xs"
        >
          {{ t("oauth.client.inactive") }}
        </div>

        <p class="oauth-fine-print">
          {{
            t("oauth.finePrint", {
              app: appName,
              host: getUrlHost(request.redirectUri),
            })
          }}
        </p>

        <div class="oauth-actions">
          <button
            type="button"
            class="btn btn-outline"
            :disabled="consentState === 'redirecting'"
            @click="deny"
          >
            {{ t("oauth.deny") }}
          </button>
          <button
            type="button"
            class="btn btn-primary"
            :disabled="consentState === 'redirecting' || clientInactive"
            @click="allow"
          >
            {{ t("oauth.allow") }} <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </AuthPanel>

    <footer class="login-footer">
      <span>© 2026 Open Sesame</span>
      <span><a href="#">Privacy</a><a href="#">Status</a></span>
    </footer>
  </main>
</template>
