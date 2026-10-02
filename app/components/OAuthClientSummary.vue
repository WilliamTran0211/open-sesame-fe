<script setup lang="ts">
import { PhLockKey } from "@phosphor-icons/vue";
import { getUrlHost, type OAuthClientInfo } from "~/utils/oauth";

const props = defineProps<{
  clientId: string;
  redirectUri: string;
  client: OAuthClientInfo | null;
  loading?: boolean;
}>();

const { t } = useI18n();
const appName = computed(() => props.client?.name || props.clientId);
const monogram = computed(() => appName.value.charAt(0).toUpperCase());
const redirectHost = computed(() => getUrlHost(props.redirectUri));
</script>

<template>
  <div class="oauth-handshake" :aria-busy="loading">
    <div class="oauth-parties" aria-hidden="true">
      <span class="oauth-app-mark">
        <span v-if="loading" class="loading loading-spinner loading-xs" />
        <template v-else>{{ monogram }}</template>
      </span>
      <span class="oauth-link-line" />
      <span class="oauth-app-mark oauth-app-mark-self">
        <PhLockKey :size="18" weight="bold" />
      </span>
    </div>

    <div class="oauth-client-copy">
      <p class="oauth-client-name">
        <strong>{{ appName }}</strong>
        <span
          v-if="!loading && !client"
          class="badge badge-warning badge-xs"
          :title="t('oauth.client.unverifiedHint')"
        >
          {{ t("oauth.client.unverified") }}
        </span>
      </p>
      <p class="oauth-client-meta">
        {{ t("oauth.client.redirectsTo") }}
        <span class="oauth-mono">{{ redirectHost }}</span>
      </p>
    </div>
  </div>
</template>
