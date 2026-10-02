<script setup lang="ts">
import { PhLockKey } from "@phosphor-icons/vue";

const { t } = useI18n();

defineProps<{
  headingId: string;
  title: string;
  description: string;
  cardClass?: string;
  loading?: boolean;
}>();
</script>

<template>
  <section
    :class="['login-card', cardClass]"
    :aria-labelledby="headingId"
    :aria-busy="loading"
  >
    <div
      v-if="loading"
      class="auth-card-overlay"
      role="status"
      :aria-label="t('common.loading')"
    >
      <span class="loading loading-spinner loading-md" />
    </div>
    <div class="login-brand">
      <div class="brand-mark" aria-hidden="true">
        <PhLockKey :size="20" weight="bold" />
      </div>
      <div>
        <p class="brand-name">{{ t("brand.name") }}</p>
        <p class="brand-kicker">{{ t("brand.kicker") }}</p>
      </div>
    </div>

    <div class="section-heading">
      <h1 :id="headingId">{{ title }}</h1>
      <p>{{ description }}</p>
    </div>

    <slot />
  </section>
</template>
