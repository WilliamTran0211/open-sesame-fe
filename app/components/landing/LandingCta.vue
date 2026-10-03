<script setup lang="ts">
import { ArrowRight } from "lucide";

const { t } = useI18n();
</script>

<template>
  <section class="landing-section" aria-labelledby="cta-title">
    <div class="landing-cta">
      <h2 id="cta-title" class="landing-heading">{{ t("landing.cta.title") }}</h2>
      <p class="landing-lede">{{ t("landing.cta.description") }}</p>
      <NuxtLink to="/register" class="btn btn-primary">
        {{ t("auth.createAccount") }}
        <AppIcon :icon="ArrowRight" :size="16" strong />
      </NuxtLink>
    </div>
  </section>
</template>
