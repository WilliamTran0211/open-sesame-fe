<script setup lang="ts">
definePageMeta({
  layout: "dashboard",
  middleware: ["auth"],
});

import { ChevronRight, Plus, RotateCw } from "lucide";

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

useHead({ title: () => t("titles.clients") });
</script>

<template>
  <PageHeader :title="t('clients.title')" :description="t('clients.description')">
    <template #actions>
      <button
        type="button"
        class="btn btn-ghost"
        :disabled="clientsStore.isLoading"
        @click="clientsStore.fetchClients()"
      >
        <span v-if="clientsStore.isLoading" class="loading loading-spinner loading-xs" />
        <AppIcon :icon="RotateCw" v-else :size="16" strong />
        {{ t("clients.reload") }}
      </button>
      <NuxtLink to="/dashboard/clients/new" class="btn btn-primary">
        <AppIcon :icon="Plus" :size="16" strong />
        {{ t("clients.new") }}
      </NuxtLink>
    </template>
  </PageHeader>

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

  <!-- A failed load still shows the (empty) list; Reload above tries again. -->
  <AlertMessage v-if="clientsStore.error" class="mb-4">
    {{ clientsStore.error }}
  </AlertMessage>

  <SkeletonRows v-if="clientsStore.isLoading && !clientsStore.clients.length" avatar />

  <EmptyState
    v-else-if="!clientsStore.clients.length"
    :title="t('clients.empty.title')"
    :description="t('clients.empty.description')"
  >
    <NuxtLink to="/dashboard/clients/new" class="btn btn-primary btn-sm">
      {{ t("clients.new") }}
    </NuxtLink>
  </EmptyState>

  <EmptyState v-else-if="!filteredClients.length" :description="t('clients.noMatch')" />

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
        <AppIcon :icon="ChevronRight" class="client-row-caret" :size="16" />
      </NuxtLink>
    </li>
  </ul>
</template>
