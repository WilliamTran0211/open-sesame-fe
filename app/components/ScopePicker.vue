<script setup lang="ts">
const model = defineModel<string[]>({ required: true });

const { t } = useI18n();
const scopesStore = useScopesStore();

// Scopes already on the client but since deactivated/removed: keep them visible so
// the owner can drop them (the API rejects inactive scopes on save).
const staleScopes = computed(() =>
  model.value.filter((name) => !scopesStore.findScope(name)),
);

onMounted(() => scopesStore.fetchScopes());
</script>

<template>
  <div class="scope-picker">
    <div v-if="scopesStore.isLoading" class="grid gap-3" :aria-label="t('common.loading')">
      <span v-for="row in 3" :key="row" class="skeleton h-9 w-full" aria-hidden="true" />
    </div>

    <div v-else-if="scopesStore.error" role="alert" class="alert alert-error py-2 text-xs">
      {{ scopesStore.error }}
      <button type="button" class="btn btn-ghost btn-xs" @click="scopesStore.fetchScopes(true)">
        {{ t("clients.retry") }}
      </button>
    </div>

    <template v-else>
      <p v-if="!scopesStore.scopes.length && !staleScopes.length" class="dash-field-hint">
        {{ t("scopes.empty") }}
      </p>

      <label v-for="scope in scopesStore.scopes" :key="scope.name" class="dash-check">
        <input
          v-model="model"
          type="checkbox"
          class="checkbox checkbox-primary checkbox-sm"
          :value="scope.name"
        />
        <span>
          <code>{{ scope.name }}</code>
          <small>{{ scope.description }}</small>
        </span>
      </label>

      <label v-for="name in staleScopes" :key="name" class="dash-check is-stale">
        <input
          v-model="model"
          type="checkbox"
          class="checkbox checkbox-warning checkbox-sm"
          :value="name"
        />
        <span>
          <code>{{ name }}</code>
          <small>{{ t("scopes.stale") }}</small>
        </span>
      </label>
    </template>
  </div>
</template>
