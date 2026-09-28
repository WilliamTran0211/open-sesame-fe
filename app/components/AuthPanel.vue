<script setup lang="ts">
import lockIcon from "~/assets/icons/lock.svg";

const { t } = useI18n();

defineProps<{
  headingId: string;
  eyebrow: string;
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
      aria-label="Loading"
    >
      <span class="loading loading-spinner loading-md" />
    </div>
    <div class="login-brand">
      <div class="brand-mark" aria-hidden="true">
        <img :src="lockIcon" alt="" />
      </div>
      <div>
        <p class="brand-name">{{ t("brand.name") }}</p>
        <p class="brand-kicker">{{ t("brand.kicker") }}</p>
      </div>
    </div>

    <div class="section-heading">
      <p class="eyebrow">{{ eyebrow }}</p>
      <h1 :id="headingId">{{ title }}</h1>
      <p>{{ description }}</p>
    </div>

    <slot />
  </section>
</template>
