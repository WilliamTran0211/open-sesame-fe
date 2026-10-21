<script setup lang="ts">
import { Check, Copy } from "lucide";

const props = defineProps<{
  code: string;
  label?: string;
}>();

const { t } = useI18n();
const copied = ref(false);
let resetTimer: number | undefined;

async function copy() {
  try {
    await navigator.clipboard.writeText(props.code);
    copied.value = true;
    window.clearTimeout(resetTimer);
    resetTimer = window.setTimeout(() => (copied.value = false), 1600);
  } catch {
    // Clipboard blocked; the code stays selectable.
  }
}

onBeforeUnmount(() => window.clearTimeout(resetTimer));
</script>

<template>
  <figure class="code-block">
    <figcaption v-if="label">{{ label }}</figcaption>
    <div class="code-block-body">
      <button
        type="button"
        class="code-block-copy btn btn-ghost btn-xs"
        :aria-label="copied ? t('clients.copied') : t('common.copyCode')"
        @click="copy"
      >
        <AppIcon :icon="copied ? Check : Copy" :size="14" />
      </button>
      <pre><code>{{ code }}</code></pre>
    </div>
  </figure>
</template>
