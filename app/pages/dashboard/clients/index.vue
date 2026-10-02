<script setup lang="ts">
definePageMeta({
  middleware: ["auth"],
});

import { PhCaretRight, PhPlus } from "@phosphor-icons/vue";

type StatusFilter = "all" | "active" | "inactive";

const clientsStore = useClientsStore();
const { t } = useI18n();
const filter = ref<StatusFilter>("all");
const search = ref("");

const filteredClients = computed(() => {
  const query = search.value.trim().toLowerCase();

  return clientsStore.clients.filter((client) => {
    if (filter.value === "active" && !client.is_active) return false;
    if (filter.value === "inactive" && client.is_active) return false;

    return (
      !query ||
      client.name.toLowerCase().includes(query) ||
      client.client_id.toLowerCase().includes(query)
    );
  });
});

const counts = computed(() => ({
  all: clientsStore.clients.length,
  active: clientsStore.clients.filter((client) => client.is_active).length,
  inactive: clientsStore.clients.filter((client) => !client.is_active).length,
}));

onMounted(() => {
  clientsStore.fetchClients();
});
</script>

<template>
  <DashboardShell>
    <div class="dash-page-header">
      <div class="dashboard-intro">
        <h1>{{ t("clients.title") }}</h1>
        <p>{{ t("clients.description") }}</p>
      </div>
      <NuxtLink to="/dashboard/clients/new" class="btn btn-primary">
        <PhPlus :size="16" weight="bold" aria-hidden="true" />
        {{ t("clients.new") }}
      </NuxtLink>
    </div>

    <div class="dash-toolbar">
      <div role="tablist" class="tabs tabs-box tabs-sm">
        <button
          v-for="option in (['all', 'active', 'inactive'] as const)"
          :key="option"
          type="button"
          role="tab"
          class="tab"
          :class="{ 'tab-active': filter === option }"
          :aria-selected="filter === option"
          @click="filter = option"
        >
          {{ t(`clients.filters.${option}`) }}
          <span class="dash-count">{{ counts[option] }}</span>
        </button>
      </div>
      <input
        v-model="search"
        type="search"
        class="input input-sm dash-search"
        :placeholder="t('clients.search')"
        :aria-label="t('clients.search')"
      />
    </div>

    <div v-if="clientsStore.error" role="alert" class="alert alert-error text-sm">
      <span>{{ clientsStore.error }}</span>
      <button type="button" class="btn btn-sm" @click="clientsStore.fetchClients()">
        {{ t("clients.retry") }}
      </button>
    </div>

    <ul
      v-else-if="clientsStore.isLoading && !clientsStore.clients.length"
      class="client-list"
      :aria-label="t('common.loading')"
    >
      <li v-for="row in 3" :key="row" class="client-row" aria-hidden="true">
        <span class="skeleton h-[38px] w-[38px]" />
        <span class="client-row-main">
          <span class="skeleton h-4 w-40" />
          <span class="skeleton h-3 w-56" />
        </span>
      </li>
    </ul>

    <div v-else-if="!clientsStore.clients.length" class="dash-empty">
      <p class="dash-empty-title">{{ t("clients.empty.title") }}</p>
      <p>{{ t("clients.empty.description") }}</p>
      <NuxtLink to="/dashboard/clients/new" class="btn btn-primary btn-sm">
        {{ t("clients.new") }}
      </NuxtLink>
    </div>

    <div v-else-if="!filteredClients.length" class="dash-empty">
      <p>{{ t("clients.noMatch") }}</p>
    </div>

    <ul v-else class="client-list">
      <li v-for="client in filteredClients" :key="client.client_id">
        <NuxtLink
          :to="`/dashboard/clients/${encodeURIComponent(client.client_id)}`"
          class="client-row"
          :class="{ 'is-inactive': !client.is_active }"
        >
          <span class="client-monogram" aria-hidden="true">
            {{ client.name.charAt(0).toUpperCase() }}
          </span>
          <span class="client-row-main">
            <strong>{{ client.name }}</strong>
            <code>{{ client.client_id }}</code>
          </span>
          <span class="client-row-meta">
            <span class="badge badge-ghost badge-sm">
              {{ t(`clients.types.${client.client_type}.title`) }}
            </span>
            <span
              class="badge badge-sm"
              :class="client.is_active ? 'badge-success' : 'badge-neutral'"
            >
              {{ client.is_active ? t("clients.status.active") : t("clients.status.inactive") }}
            </span>
            <small>{{ new Date(client.created_at).toLocaleDateString() }}</small>
          </span>
          <PhCaretRight class="client-row-caret" :size="16" aria-hidden="true" />
        </NuxtLink>
      </li>
    </ul>
  </DashboardShell>
</template>
