<script setup lang="ts">
definePageMeta({
  middleware: ["guest"],
});

import { PhArrowRight, PhLockKey } from "@phosphor-icons/vue";
import type { OAuthClientInfo } from "~/utils/oauth";

const { t } = useI18n();

useSeoMeta({
  title: () => t("landing.meta.title"),
  description: () => t("landing.description"),
  ogTitle: () => t("landing.meta.title"),
  ogDescription: () => t("landing.description"),
});

// Sample data for the consent preview, rendered with the real consent components.
const exampleClient: OAuthClientInfo = {
  client_id: "ledgerline-web",
  name: "Ledgerline",
  client_type: "confidential",
  redirect_uris: ["https://app.ledgerline.io/callback"],
  is_active: true,
};
</script>

<template>
  <main class="landing">
    <header class="landing-nav">
      <NuxtLink to="/" class="dashboard-brand">
        <span class="brand-mark" aria-hidden="true">
          <PhLockKey :size="16" weight="bold" />
        </span>
        <span>{{ t("brand.name") }}</span>
      </NuxtLink>
      <nav class="landing-links" :aria-label="t('landing.nav.label')">
        <a href="#flow">{{ t("landing.nav.flow") }}</a>
        <a href="#security">{{ t("landing.nav.security") }}</a>
        <a href="#stack">{{ t("landing.nav.stack") }}</a>
      </nav>
      <div class="landing-nav-actions">
        <ThemeToggle />
        <NuxtLink to="/login" class="btn btn-ghost btn-sm">
          {{ t("auth.signIn") }}
        </NuxtLink>
      </div>
    </header>

    <section class="landing-hero" aria-labelledby="landing-title">
      <div class="landing-copy">
        <h1 id="landing-title">{{ t("landing.title") }}</h1>
        <p>{{ t("landing.description") }}</p>
        <div class="landing-actions">
          <NuxtLink to="/register" class="btn btn-primary">
            {{ t("auth.createAccount") }}
            <PhArrowRight :size="16" weight="bold" aria-hidden="true" />
          </NuxtLink>
          <NuxtLink to="/login" class="btn btn-ghost">
            {{ t("auth.signIn") }}
          </NuxtLink>
        </div>
      </div>

      <figure class="landing-preview">
        <div class="login-card oauth-card" inert>
          <div class="section-heading">
            <h2>{{ t("oauth.title", { app: exampleClient.name }) }}</h2>
          </div>
          <div class="oauth-consent">
            <OAuthClientSummary
              :client-id="exampleClient.client_id"
              :redirect-uri="exampleClient.redirect_uris[0]!"
              :client="exampleClient"
            />
            <div>
              <p class="oauth-section-label">
                {{ t("oauth.permissionsLabel", { app: exampleClient.name }) }}
              </p>
              <OAuthScopeList :scopes="['email', 'offline_access']" />
            </div>
            <div class="oauth-actions" aria-hidden="true">
              <span class="btn btn-outline">{{ t("oauth.deny") }}</span>
              <span class="btn btn-primary">{{ t("oauth.allow") }}</span>
            </div>
          </div>
        </div>
        <figcaption>{{ t("landing.previewCaption") }}</figcaption>
      </figure>
    </section>

    <AuthFooter />
  </main>
</template>
