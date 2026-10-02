<script setup lang="ts">
definePageMeta({
  middleware: ["auth"],
});

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
const { client, isLoading: isClientLoading, load: loadClient } = useOAuthClient();

const scopesStore = useScopesStore();

const parsed = computed(() => parseAuthorizeRequest(route.query));
const request = computed(() => parsed.value.request);
const consentState = ref<ConsentState>("ready");
const appName = computed(
  () => client.value?.name || request.value?.clientId || "",
);
const userName = computed(() => auth.getDisplayName(auth.user));
// The API grants only requested ∩ allowed. When we can see the client's allow-list
// (its owner), show exactly what will be granted instead of what was asked for.
const grantedScopes = computed(() => {
  const requested = request.value?.scopes || [];
  const allowed = client.value?.allowed_scopes;

  return allowed ? requested.filter((scope) => allowed.includes(scope)) : requested;
});
const scopesNarrowed = computed(
  () => grantedScopes.value.length < (request.value?.scopes.length || 0),
);
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
  scopesStore.fetchScopes();

  if (request.value) {
    loadClient(request.value.clientId);
  }
});
</script>

<template>
  <main class="login-page">
    <ThemeToggle class="auth-theme-toggle" />

    <AuthPanel
      v-if="!request"
      heading-id="consent-title"
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
          <OAuthScopeList :scopes="grantedScopes" />
          <p v-if="scopesNarrowed" class="dash-field-hint">
            {{ t("oauth.scopesNarrowed", { app: appName }) }}
          </p>
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
