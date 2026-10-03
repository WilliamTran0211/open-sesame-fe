<script setup lang="ts">
const props = defineProps<{
  name: string;
  email?: string;
}>();

const emit = defineEmits<{
  switch: [];
}>();

const { t } = useI18n();
const initial = computed(() => props.name.charAt(0).toUpperCase());
</script>

<template>
  <div class="oauth-account">
    <span class="oauth-account-avatar" aria-hidden="true">{{ initial }}</span>
    <div class="oauth-account-copy">
      <strong>{{ name }}</strong>
      <small v-if="email">{{ email }}</small>
    </div>
    <button
      type="button"
      class="btn btn-ghost btn-xs"
      @click="emit('switch')"
    >
      {{ t("oauth.account.switch") }}
    </button>
  </div>
</template>
