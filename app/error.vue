<script setup lang="ts">
import type { NuxtError } from "#app";
import { ArrowRight } from "lucide";

const props = defineProps<{ error: NuxtError }>();

const { t } = useI18n();
const auth = useAuthStore();

const notFound = computed(() => props.error.statusCode === 404);
const homePath = computed(() => (auth.isAuthenticated ? "/dashboard" : "/"));
// Details help while developing; production visitors only get the friendly message.
const detail = computed(() =>
  import.meta.dev && !notFound.value ? props.error.message : "",
);

useHead({
  title: () => (notFound.value ? t("errorPage.notFound.title") : t("errorPage.generic.title")),
});

function goHome() {
  clearError({ redirect: homePath.value });
}
</script>

<template>
  <NuxtLayout name="auth">
    <AuthPanel
      heading-id="error-title"
      :title="notFound ? t('errorPage.notFound.title') : t('errorPage.generic.title')"
      :description="
        notFound
          ? t('errorPage.notFound.description')
          : t('errorPage.generic.description')
      "
    >
      <p class="error-status">
        {{ t("errorPage.status", { status: error.statusCode }) }}
      </p>
      <pre v-if="detail" class="error-detail">{{ detail }}</pre>

      <button type="button" class="btn btn-primary w-full" @click="goHome">
        {{ auth.isAuthenticated ? t("errorPage.toDashboard") : t("errorPage.toHome") }}
        <AppIcon :icon="ArrowRight" :size="16" strong />
      </button>
    </AuthPanel>
  </NuxtLayout>
</template>
