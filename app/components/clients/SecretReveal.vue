<script setup lang="ts">
defineProps<{
  secret: string;
}>();

const emit = defineEmits<{
  dismiss: [];
}>();

const { t } = useI18n();
</script>

<template>
  <div class="secret-reveal" role="status">
    <div>
      <p class="secret-reveal-title">{{ t("clients.secret.title") }}</p>
      <p class="secret-reveal-copy">{{ t("clients.secret.warning") }}</p>
    </div>
    <CopyField :label="t('clients.secret.label')" :value="secret" />
    <button
      type="button"
      class="btn btn-sm btn-outline self-start"
      @click="emit('dismiss')"
    >
      {{ t("clients.secret.dismiss") }}
    </button>
  </div>
</template>
