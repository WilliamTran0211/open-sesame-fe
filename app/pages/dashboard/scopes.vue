<script setup lang="ts">
definePageMeta({
  middleware: ["superuser"],
});

import type { OAuthScope } from "~/utils/oauth";

const scopesStore = useScopesStore();
const { t } = useI18n();

const SCOPE_NAME = /^[A-Za-z0-9:._-]{1,100}$/;

const name = ref("");
const description = ref("");
const submitted = ref(false);
const editing = ref<string | null>(null);
const editDescription = ref("");
const toDeactivate = ref<OAuthScope | null>(null);

const errors = computed(() => ({
  name: !name.value.trim()
    ? t("scopes.nameRequired")
    : !SCOPE_NAME.test(name.value.trim())
      ? t("scopes.nameInvalid")
      : "",
  description: description.value.trim() ? "" : t("scopes.descriptionRequired"),
}));

async function create() {
  submitted.value = true;

  if (errors.value.name || errors.value.description) {
    return;
  }

  if (await scopesStore.createScope(name.value.trim(), description.value.trim())) {
    name.value = "";
    description.value = "";
    submitted.value = false;
  }
}

function startEdit(scope: OAuthScope) {
  scopesStore.error = "";
  editing.value = scope.name;
  editDescription.value = scope.description;
}

async function saveEdit(scopeName: string) {
  if (!editDescription.value.trim()) {
    return;
  }

  if (await scopesStore.updateScope(scopeName, editDescription.value.trim())) {
    editing.value = null;
  }
}

async function confirmDeactivate() {
  if (toDeactivate.value) {
    await scopesStore.deactivateScope(toDeactivate.value.name);
  }

  toDeactivate.value = null;
}

onMounted(() => {
  scopesStore.error = "";
  scopesStore.fetchScopes(true);
});
</script>

<template>
  <DashboardShell>
    <div class="dash-page-header">
      <div class="dashboard-intro">
        <h1>{{ t("scopes.title") }}</h1>
        <p>{{ t("scopes.description") }}</p>
      </div>
    </div>

    <section class="dash-card">
      <h2 class="dash-card-title">{{ t("scopes.new") }}</h2>
      <form class="dash-form" novalidate @submit.prevent="create">
        <div class="dash-field">
          <label for="scope-name">{{ t("scopes.name") }}</label>
          <input
            id="scope-name"
            v-model="name"
            type="text"
            class="input w-full"
            :class="{ 'input-error': submitted && errors.name }"
            :placeholder="t('scopes.namePlaceholder')"
            maxlength="100"
            autocomplete="off"
          />
          <p v-if="submitted && errors.name" class="dash-field-error">{{ errors.name }}</p>
        </div>
        <div class="dash-field">
          <label for="scope-description">{{ t("scopes.descriptionLabel") }}</label>
          <input
            id="scope-description"
            v-model="description"
            type="text"
            class="input w-full"
            :class="{ 'input-error': submitted && errors.description }"
            :placeholder="t('scopes.descriptionPlaceholder')"
            autocomplete="off"
          />
          <p v-if="submitted && errors.description" class="dash-field-error">
            {{ errors.description }}
          </p>
        </div>
        <div class="dash-form-actions">
          <button type="submit" class="btn btn-primary" :disabled="scopesStore.isSaving">
            <span v-if="scopesStore.isSaving" class="loading loading-spinner loading-xs" />
            {{ t("scopes.create") }}
          </button>
        </div>
      </form>
    </section>

    <div v-if="scopesStore.error" role="alert" class="alert alert-error mb-4 py-2 text-sm">
      {{ scopesStore.error }}
    </div>

    <ul
      v-if="scopesStore.isLoading && !scopesStore.scopes.length"
      class="client-list"
      :aria-label="t('common.loading')"
    >
      <li v-for="row in 3" :key="row" class="client-row scope-row" aria-hidden="true">
        <span class="client-row-main">
          <span class="skeleton h-3 w-28" />
          <span class="skeleton h-4 w-56" />
        </span>
      </li>
    </ul>

    <div v-else-if="!scopesStore.scopes.length" class="dash-empty">
      <p>{{ t("scopes.empty") }}</p>
    </div>

    <ul v-else class="client-list">
      <li v-for="scope in scopesStore.scopes" :key="scope.name" class="client-row scope-row">
        <span class="client-row-main">
          <code>{{ scope.name }}</code>
          <input
            v-if="editing === scope.name"
            v-model="editDescription"
            type="text"
            class="input input-sm w-full"
            :aria-label="t('scopes.descriptionLabel')"
            @keyup.enter="saveEdit(scope.name)"
            @keyup.esc="editing = null"
          />
          <strong v-else>{{ scope.description }}</strong>
        </span>
        <span class="client-row-meta">
          <template v-if="editing === scope.name">
            <button
              type="button"
              class="btn btn-primary btn-sm"
              :disabled="scopesStore.isSaving || !editDescription.trim()"
              @click="saveEdit(scope.name)"
            >
              {{ t("scopes.save") }}
            </button>
            <button type="button" class="btn btn-ghost btn-sm" @click="editing = null">
              {{ t("scopes.cancel") }}
            </button>
          </template>
          <template v-else>
            <button type="button" class="btn btn-ghost btn-sm" @click="startEdit(scope)">
              {{ t("scopes.edit") }}
            </button>
            <button
              type="button"
              class="btn btn-outline btn-error btn-sm"
              @click="toDeactivate = scope"
            >
              {{ t("scopes.deactivate.confirm") }}
            </button>
          </template>
        </span>
      </li>
    </ul>

    <ConfirmDialog
      :open="!!toDeactivate"
      :title="t('scopes.deactivate.title')"
      :message="t('scopes.deactivate.message', { name: toDeactivate?.name || '' })"
      :confirm-label="t('scopes.deactivate.confirm')"
      danger
      :loading="scopesStore.isSaving"
      @confirm="confirmDeactivate"
      @cancel="toDeactivate = null"
    />
  </DashboardShell>
</template>
