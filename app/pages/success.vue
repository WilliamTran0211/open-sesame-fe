<script setup lang="ts">
definePageMeta({
  middleware: ["auth"],
});



onMounted(() => {
  window.setTimeout(() => navigateTo("/dashboard"), 1200);
});
</script>

<template>
  <main class="login-page">
    <ThemeToggle class="auth-theme-toggle" />

    <AuthPanel
      heading-id="success-title"
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
