<script setup lang="ts">
definePageMeta({
  middleware: ["auth"],
});



const { t } = useI18n();
let redirectTimer: number | undefined;

onMounted(() => {
  redirectTimer = window.setTimeout(() => navigateTo("/dashboard"), 1200);
});

onBeforeUnmount(() => window.clearTimeout(redirectTimer));
</script>

<template>
  <main class="login-page">
    <ThemeToggle class="auth-theme-toggle" />

    <AuthPanel
      heading-id="success-title"
      :title="t('auth.success.title')"
      :description="t('auth.success.description')"
      card-class="success-card"
    >
      <div class="success-state" role="status" aria-live="polite">
        <span class="loading loading-spinner loading-md" />
        <span>{{ t("auth.success.opening") }}</span>
      </div>
    </AuthPanel>
  </main>
</template>
