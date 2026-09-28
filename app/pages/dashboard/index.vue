<script setup lang="ts">
definePageMeta({
  middleware: ["auth"],
});

const auth = useAuthStore();
const clientsStore = useClientsStore();
const { t } = useI18n();
const userName = computed(() => auth.getDisplayName(auth.user));
const userEmail = computed(() => auth.user?.email || "No email available");
const activeCount = computed(
  () => clientsStore.clients.filter((client) => client.is_active).length,
);

onMounted(() => {
  clientsStore.fetchClients();
});
</script>

<template>
  <DashboardShell>
    <div class="dashboard-intro">
      <p class="eyebrow">PROFILE</p>
      <h1>Good to see you, {{ userName }}.</h1>
      <p>{{ userEmail }}</p>
    </div>

    <div class="workspace-list">
      <NuxtLink to="/dashboard/clients" class="btn btn-outline workspace-item">
        <span class="workspace-icon" aria-hidden="true">⚿</span>
        <span class="workspace-copy">
          <strong>{{ t("dashboard.clientsCard.title") }}</strong>
          <small>{{ t("dashboard.clientsCard.description") }}</small>
        </span>
        <span class="workspace-status">
          <template v-if="clientsStore.isLoading">…</template>
          <template v-else>
            {{ t("dashboard.clientsCard.count", { count: activeCount }) }}
          </template>
        </span>
        <span class="workspace-arrow" aria-hidden="true">→</span>
      </NuxtLink>
    </div>

    <p class="dashboard-note">
      Protected by Open-sesame identity infrastructure.
    </p>
  </DashboardShell>
</template>
