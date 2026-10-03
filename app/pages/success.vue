<script setup lang="ts">
definePageMeta({
  layout: "auth",
  middleware: ["auth"],
});



const { t } = useI18n();
let redirectTimer: number | undefined;

onMounted(() => {
  redirectTimer = window.setTimeout(() => navigateTo("/dashboard"), 1200);
});

onBeforeUnmount(() => window.clearTimeout(redirectTimer));

useHead({ title: () => t("titles.success") });
</script>

<template>
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
</template>
