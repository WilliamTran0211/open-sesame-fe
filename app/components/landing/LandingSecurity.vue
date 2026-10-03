<script setup lang="ts">
import {
  PhClockCountdown,
  PhDeviceMobile,
  PhEnvelopeSimple,
  PhKey,
  PhShieldCheck,
  PhWarningCircle,
} from "@phosphor-icons/vue";

const { t } = useI18n();

const mfaMethods = [
  { key: "app", icon: PhDeviceMobile },
  { key: "email", icon: PhEnvelopeSimple },
  { key: "recovery", icon: PhKey },
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
        <PhShieldCheck class="bento-icon" :size="26" aria-hidden="true" />
        <h3>{{ t("landing.security.mfa.title") }}</h3>
        <p>{{ t("landing.security.mfa.description") }}</p>
        <ul class="bento-chips">
          <li v-for="method in mfaMethods" :key="method.key">
            <component :is="method.icon" :size="16" aria-hidden="true" />
            {{ t(`landing.security.mfa.methods.${method.key}`) }}
          </li>
        </ul>
      </article>

      <article class="bento-cell">
        <PhWarningCircle class="bento-icon" :size="26" aria-hidden="true" />
        <h3>{{ t("landing.security.consent.title") }}</h3>
        <p>{{ t("landing.security.consent.description") }}</p>
      </article>

      <article class="bento-cell bento-dotted">
        <PhClockCountdown class="bento-icon" :size="26" aria-hidden="true" />
        <h3>{{ t("landing.security.recovery.title") }}</h3>
        <p>{{ t("landing.security.recovery.description") }}</p>
      </article>

      <article class="bento-cell bento-wide">
        <PhKey class="bento-icon" :size="26" aria-hidden="true" />
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
