<script setup lang="ts">
const props = defineProps<{
  label: string;
  value: string;
}>();

const { t } = useI18n();
const copied = ref(false);
let resetTimer: number | undefined;

async function copy() {
  try {
    await navigator.clipboard.writeText(props.value);
    copied.value = true;
    window.clearTimeout(resetTimer);
    resetTimer = window.setTimeout(() => (copied.value = false), 1600);
  } catch {
    // Clipboard can be blocked (insecure origin, permissions); the value stays selectable.
    copied.value = false;
  }
}

onBeforeUnmount(() => window.clearTimeout(resetTimer));
</script>

<template>
  <div class="copy-field">
    <span class="copy-field-label">{{ label }}</span>
    <div class="copy-field-row">
      <code class="copy-field-value">{{ value }}</code>
      <button type="button" class="btn btn-ghost btn-xs" @click="copy">
        {{ copied ? t("clients.copied") : t("clients.copy") }}
      </button>
    </div>
  </div>
</template>
