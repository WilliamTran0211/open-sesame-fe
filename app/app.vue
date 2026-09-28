<script setup lang="ts">
const isDark = useState<boolean>("theme.isDark", () => false);
const route = useRoute();
const showPageSpinner = computed(
  () => !["/login", "/register"].includes(route.path),
);

function applyTheme() {
  if (!import.meta.client) {
    return;
  }

  document.documentElement.dataset.theme = isDark.value ? "dark" : "light";
  localStorage.setItem("open-sesame-theme", isDark.value ? "dark" : "light");
}

onMounted(() => {
  isDark.value = localStorage.getItem("open-sesame-theme") === "dark";
  applyTheme();
});

watch(isDark, applyTheme);
</script>

<template>
  <div
    v-if="showPageSpinner"
    class="global-page-spinner"
    role="status"
    aria-label="Loading page"
  >
    <span class="loading loading-spinner loading-sm" />
  </div>
  <NuxtPage />
</template>
