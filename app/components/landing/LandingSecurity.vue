<script setup lang="ts">
import { CircleAlert, Hourglass, KeyRound, Mail, ShieldCheck, Smartphone } from "lucide";

const { t } = useI18n();

const mfaMethods = [
  { key: "app", icon: Smartphone },
  { key: "email", icon: Mail },
  { key: "recovery", icon: KeyRound },
];

// Real endpoints, shown as the developer-facing surface of this feature.
const endpoints = [
  "POST /api/v1/oauth/token",
  "POST /api/v1/oauth/token/revoke",
  "POST /api/v1/clients/{client_id}/rotate-secret",
];
</script>

<template>
  <section id="security" class="landing-section" aria-labelledby="security-title">
    <h2 id="security-title" class="landing-heading">
      {{ t("landing.security.title") }}
    </h2>
    <p class="landing-lede">{{ t("landing.security.description") }}</p>

    <div class="landing-bento">
      <article class="bento-cell bento-wide bento-tinted">
        <AppIcon :icon="ShieldCheck" class="bento-icon" :size="26" />
        <h3>{{ t("landing.security.mfa.title") }}</h3>
        <p>{{ t("landing.security.mfa.description") }}</p>
        <ul class="bento-chips">
          <li v-for="method in mfaMethods" :key="method.key">
            <AppIcon :icon="method.icon" :size="16" />
            {{ t(`landing.security.mfa.methods.${method.key}`) }}
          </li>
        </ul>
      </article>

      <article class="bento-cell">
        <AppIcon :icon="CircleAlert" class="bento-icon" :size="26" />
        <h3>{{ t("landing.security.consent.title") }}</h3>
        <p>{{ t("landing.security.consent.description") }}</p>
      </article>

      <article class="bento-cell bento-dotted">
        <AppIcon :icon="Hourglass" class="bento-icon" :size="26" />
        <h3>{{ t("landing.security.recovery.title") }}</h3>
        <p>{{ t("landing.security.recovery.description") }}</p>
      </article>

      <article class="bento-cell bento-wide">
        <AppIcon :icon="KeyRound" class="bento-icon" :size="26" />
        <h3>{{ t("landing.security.tokens.title") }}</h3>
        <p>{{ t("landing.security.tokens.description") }}</p>
        <ul class="bento-endpoints">
          <li v-for="endpoint in endpoints" :key="endpoint">
            <code>{{ endpoint }}</code>
          </li>
        </ul>
      </article>
    </div>
  </section>
</template>
