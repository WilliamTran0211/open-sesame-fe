<script setup lang="ts">
definePageMeta({
  layout: "auth",
  middleware: ["auth"],
});

import { ArrowRight } from "lucide";
import { oauthApi } from "~/services/oauth";
import { apiErrorMessage } from "~/utils/api";
import {
  buildDeniedUrl,
  getRedirectLabel,
  isRegisteredRedirect,
  parseAuthorizeRequest,
} from "~/utils/oauth";

type ConsentState = "ready" | "redirecting" | "cancelled";

const auth = useAuthStore();
const route = useRoute();
const { t } = useI18n();
const {
  client,
  isLoading: isClientLoading,
  unavailable: clientUnavailable,
  load: loadClient,
} = useOAuthClient();

const scopesStore = useScopesStore();

const parsed = computed(() => parseAuthorizeRequest(route.query));
const request = computed(() => parsed.value.request);
const consentState = ref<ConsentState>("ready");
const consentError = ref("");
const appName = computed(
  () => client.value?.name || request.value?.clientId || "",
);
const userName = computed(() => auth.getDisplayName(auth.user));
// The API grants only requested ∩ allowed. Show exactly what will be granted
// instead of what was asked for.
const grantedScopes = computed(() => {
  const requested = request.value?.scopes || [];
  const allowed = client.value?.allowed_scopes;

  return allowed ? requested.filter((scope) => allowed.includes(scope)) : requested;
});
const scopesNarrowed = computed(
  () => grantedScopes.value.length < (request.value?.scopes.length || 0),
);

// The API appends ?code=...&state=... (or &code=... when the URI has a query) to
// the redirect URI it validated. Check that anyway, so Allow can only ever send the
// browser back to the app that asked.
function isRedirectFor(redirectTo: string, redirectUri: string) {
  return (
    redirectTo.startsWith(redirectUri) &&
    /^[?&]/.test(redirectTo.slice(redirectUri.length))
  );
}

async function allow() {
  if (!request.value || consentState.value === "redirecting") {
    return;
  }

  consentError.value = "";
  consentState.value = "redirecting";

  let redirectTo: string;
  try {
    ({ redirect_to: redirectTo } = await oauthApi.consent(request.value));
  } catch (requestError) {
    // The session ended: apiFetch has cleared the user and is reloading to sign-in,
    // which brings people back here afterwards.
    if (!auth.user) {
      return;
    }

    consentState.value = "ready";
    consentError.value = apiErrorMessage(requestError, "oauth.errors.allow");
    return;
  }

  if (!isRedirectFor(redirectTo, request.value.redirectUri)) {
    consentState.value = "ready";
    consentError.value = t("oauth.errors.allow");
    return;
  }

  window.location.assign(redirectTo);
}

function deny() {
  if (!request.value) {
    return;
  }

  // Only bounce back to a redirect the API confirmed is registered for this client;
  // otherwise this page would be an open redirect.
  if (isRegisteredRedirect(client.value)) {
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
    loadClient(request.value.clientId, request.value.redirectUri);
  }
});

useHead({ title: () => appName.value ? t("titles.consent", { app: appName.value }) : t("titles.consentGeneric") });
</script>

<template>
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
        <p v-if="scopesNarrowed" class="dash-field-hint mt-3">
          {{ t("oauth.scopesNarrowed", { app: appName }) }}
        </p>
      </div>

      <AlertMessage v-if="clientUnavailable">
        {{ t("oauth.client.unavailable") }}
      </AlertMessage>

      <AlertMessage v-if="consentError">
        {{ consentError }}
      </AlertMessage>

      <p class="oauth-fine-print">
        {{
          t("oauth.finePrint", {
            app: appName,
            host: getRedirectLabel(request.redirectUri),
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
          :disabled="consentState === 'redirecting' || clientUnavailable"
          @click="allow"
        >
          {{ t("oauth.allow") }}
          <AppIcon :icon="ArrowRight" :size="16" strong />
        </button>
      </div>
    </div>
  </AuthPanel>
</template>
