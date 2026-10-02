<script setup lang="ts">
import {
  siDocker,
  siFastapi,
  siJsonwebtokens,
  siNuxt,
  siPostgresql,
  siRedis,
} from "simple-icons";

const { t } = useI18n();

// What the API and this frontend actually run on (see be/docker-compose.yml).
const logos = [siFastapi, siPostgresql, siRedis, siDocker, siJsonwebtokens, siNuxt];
</script>

<template>
  <section id="stack" class="landing-section landing-stack" aria-labelledby="stack-title">
    <div>
      <h2 id="stack-title" class="landing-heading">{{ t("landing.stack.title") }}</h2>
      <p class="landing-lede">{{ t("landing.stack.description") }}</p>
      <pre class="landing-command"><code>docker compose up -d</code></pre>
    </div>

    <ul class="landing-logos" :aria-label="t('landing.stack.logosLabel')">
      <li v-for="logo in logos" :key="logo.slug">
        <svg
          role="img"
          viewBox="0 0 24 24"
          width="40"
          height="40"
          fill="currentColor"
          :aria-label="logo.title"
        >
          <title>{{ logo.title }}</title>
          <path :d="logo.path" />
        </svg>
      </li>
    </ul>
  </section>
</template>
