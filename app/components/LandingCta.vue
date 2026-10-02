<script setup lang="ts">
import { PhArrowRight } from "@phosphor-icons/vue";

const { t } = useI18n();
</script>

<template>
  <section class="landing-section" aria-labelledby="cta-title">
    <div class="landing-cta">
      <h2 id="cta-title" class="landing-heading">{{ t("landing.cta.title") }}</h2>
      <p class="landing-lede">{{ t("landing.cta.description") }}</p>
      <NuxtLink to="/register" class="btn btn-primary">
        {{ t("auth.createAccount") }}
        <PhArrowRight :size="16" weight="bold" aria-hidden="true" />
      </NuxtLink>
    </div>
  </section>
</template>
