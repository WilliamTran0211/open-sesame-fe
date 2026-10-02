<script setup lang="ts">
definePageMeta({
  middleware: ["auth"],
});

import {
  PhAppWindow,
  PhCaretRight,
  PhListChecks,
  PhUserCircle,
} from "@phosphor-icons/vue";

const auth = useAuthStore();
const clientsStore = useClientsStore();
const { t } = useI18n();
const userName = computed(() => auth.getDisplayName(auth.user));
const activeCount = computed(
  () => clientsStore.clients.filter((client) => client.is_active).length,
);

const sections = computed(() => [
  {
    to: "/dashboard/clients",
    icon: PhAppWindow,
    title: t("dashboard.clientsCard.title"),
    description: t("dashboard.clientsCard.description"),
    count: true,
  },
  ...(auth.user?.is_superuser
    ? [
        {
          to: "/dashboard/scopes",
          icon: PhListChecks,
          title: t("dashboard.scopesCard.title"),
          description: t("dashboard.scopesCard.description"),
          count: false,
        },
      ]
    : []),
  {
    to: "/dashboard/profile",
    icon: PhUserCircle,
    title: t("dashboard.profileCard.title"),
    description: t("dashboard.profileCard.description"),
    count: false,
  },
]);

onMounted(() => {
  clientsStore.fetchClients();
});
</script>

<template>
  <DashboardShell>
    <div class="dashboard-intro">
      <h1>{{ t("dashboard.greeting", { name: userName }) }}</h1>
      <p v-if="auth.user?.email">{{ auth.user.email }}</p>
    </div>

    <ul class="client-list">
      <li v-for="section in sections" :key="section.to">
        <NuxtLink :to="section.to" class="client-row">
          <span class="client-monogram" aria-hidden="true">
            <component :is="section.icon" :size="20" />
          </span>
          <span class="client-row-main">
            <strong>{{ section.title }}</strong>
            <small>{{ section.description }}</small>
          </span>
          <span v-if="section.count" class="client-row-meta">
            <span
              v-if="clientsStore.isLoading && !clientsStore.clients.length"
              class="skeleton h-5 w-16"
              :aria-label="t('common.loading')"
            />
            <span v-else class="badge badge-sm badge-ghost">
              {{ t("dashboard.clientsCard.count", { count: activeCount }) }}
            </span>
          </span>
          <PhCaretRight class="client-row-caret" :size="16" aria-hidden="true" />
        </NuxtLink>
      </li>
    </ul>
  </DashboardShell>
</template>
