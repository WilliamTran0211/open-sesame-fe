<script setup lang="ts">
definePageMeta({
  middleware: ["auth"],
});

import { PhArrowLeft } from "@phosphor-icons/vue";

import type { OAuthClientPayload } from "~/utils/oauth";

const clientsStore = useClientsStore();
const { t } = useI18n();

async function create(payload: OAuthClientPayload) {
  const client = await clientsStore.createClient(payload);

  if (client) {
    // The detail page picks up the one-time secret from the store.
    await navigateTo(
      `/dashboard/clients/${encodeURIComponent(client.client_id)}`,
    );
  }
}

onMounted(() => {
  clientsStore.error = "";
});
</script>

<template>
  <DashboardShell>
    <NuxtLink to="/dashboard/clients" class="dash-back">
      <PhArrowLeft :size="14" aria-hidden="true" />
      {{ t("clients.back") }}
    </NuxtLink>

    <div class="dashboard-intro">
      <h1>{{ t("clients.createTitle") }}</h1>
      <p>{{ t("clients.createDescription") }}</p>
    </div>

    <div class="dash-card">
      <ClientForm
        mode="create"
        :loading="clientsStore.isSaving"
        :error="clientsStore.error"
        @submit="create"
        @cancel="navigateTo('/dashboard/clients')"
      />
    </div>
  </DashboardShell>
</template>
