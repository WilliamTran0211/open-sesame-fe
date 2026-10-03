<script setup lang="ts">
import { Moon, Sun } from "lucide";

const { t } = useI18n();
const { isDark, toggle } = useTheme();
const label = computed(() =>
  isDark.value ? t("theme.useLight") : t("theme.useDark"),
);

// The theme is only known in the browser. Until mount, CSS picks one of two static
// icons from <html data-theme> (set before hydration); after that a single icon
// morphs between sun and moon.
const mounted = ref(false);
const dark = ref(false);

onMounted(() => {
  dark.value = document.documentElement.dataset.theme === "dark";
  mounted.value = true;
});

watch(isDark, (value) => (dark.value = value));
</script>

<template>
  <button
    type="button"
    class="theme-toggle btn btn-ghost btn-sm btn-circle"
    :aria-label="label"
    :title="label"
    @click="toggle"
  >
    <AppIcon v-if="mounted" :icon="dark ? Sun : Moon" :size="18" />
    <template v-else>
      <AppIcon class="theme-icon-sun" :icon="Sun" :size="18" />
      <AppIcon class="theme-icon-moon" :icon="Moon" :size="18" />
    </template>
  </button>
</template>
