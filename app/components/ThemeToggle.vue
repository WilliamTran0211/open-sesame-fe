<script setup lang="ts">
import { PhMoon, PhSun } from "@phosphor-icons/vue";

const { t } = useI18n();
const { isDark, toggle } = useTheme();
const label = computed(() =>
  isDark.value ? t("theme.useLight") : t("theme.useDark"),
);
</script>

<template>
  <button
    type="button"
    class="theme-toggle btn btn-ghost btn-sm btn-circle"
    :aria-label="label"
    :title="label"
    @click="toggle"
  >
    <PhSun v-if="isDark" :size="18" aria-hidden="true" />
    <PhMoon v-else :size="18" aria-hidden="true" />
  </button>
</template>
