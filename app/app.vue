<script setup lang="ts">
import { THEME_STORAGE_KEY } from "~/composables/useTheme";

const { isDark } = useTheme();

// Set the theme before first paint so dark-mode users don't see a light flash.
useHead({
  script: [
    {
      tagPosition: "head",
      innerHTML: `try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");document.documentElement.dataset.theme=t||(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light")}catch(e){}`,
    },
  ],
});

function storedTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    return null;
  }
}

function applyTheme() {
  document.documentElement.dataset.theme = isDark.value ? "dark" : "light";
}

let systemTheme: MediaQueryList | undefined;

function followSystem(event: MediaQueryListEvent) {
  if (!storedTheme()) {
    isDark.value = event.matches;
  }
}

onMounted(() => {
  systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
  const stored = storedTheme();
  isDark.value = stored ? stored === "dark" : systemTheme.matches;
  applyTheme();
  systemTheme.addEventListener("change", followSystem);
});

onBeforeUnmount(() => systemTheme?.removeEventListener("change", followSystem));

watch(isDark, applyTheme);
</script>

<template>
  <!-- Shows only while a route is loading, unlike a permanent spinner. -->
  <NuxtLoadingIndicator color="var(--color-primary-ink)" :height="2" />
  <NuxtPage />
</template>
