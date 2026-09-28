<script setup lang="ts">
definePageMeta({
  middleware: ["auth"],
});

import moonIcon from "~/assets/icons/moon.svg";
import sunIcon from "~/assets/icons/sun.svg";

const isDark = useState<boolean>("theme.isDark");

onMounted(() => {
  window.setTimeout(() => navigateTo("/dashboard"), 1200);
});
</script>

<template>
  <main class="login-page">
    <label class="theme-toggle" title="Toggle dark mode">
      <input
        id="theme-toggle"
        v-model="isDark"
        type="checkbox"
        class="toggle toggle-sm toggle-primary"
        aria-label="Toggle dark mode"
      />
      <span class="theme-toggle-icons" aria-hidden="true">
        <img class="theme-icon theme-icon-sun" :src="sunIcon" alt="" />
        <img class="theme-icon theme-icon-moon" :src="moonIcon" alt="" />
      </span>
    </label>

    <AuthPanel
      heading-id="success-title"
      eyebrow="ACCESS GRANTED"
      title="You're in."
      description="Your workspace is ready. Taking you there now."
      card-class="success-card"
    >
      <div class="success-state" role="status" aria-live="polite">
        <span class="loading loading-spinner loading-md" />
        <span>Opening your workspace...</span>
      </div>
    </AuthPanel>
  </main>
</template>
