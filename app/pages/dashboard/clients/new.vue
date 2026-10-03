<script setup lang="ts">
definePageMeta({
  layout: "dashboard",
  middleware: ["auth"],
});


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
  <BackLink to="/dashboard/clients">{{ t("clients.back") }}</BackLink>

  <PageHeader
    :title="t('clients.createTitle')"
    :description="t('clients.createDescription')"
  />

  <div class="dash-card">
    <ClientForm
      mode="create"
      :loading="clientsStore.isSaving"
      :error="clientsStore.error"
      @submit="create"
      @cancel="navigateTo('/dashboard/clients')"
    />
  </div>
</template>
