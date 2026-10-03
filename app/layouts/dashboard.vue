<script setup lang="ts">
import { LogOut } from "lucide";

const auth = useAuthStore();
const route = useRoute();
const { t } = useI18n();

const links = computed(() => [
  { to: "/dashboard", label: t("dashboard.nav.overview"), exact: true },
  { to: "/dashboard/clients", label: t("dashboard.nav.clients"), exact: false },
  ...(auth.user?.is_superuser
    ? [{ to: "/dashboard/scopes", label: t("dashboard.nav.scopes"), exact: false }]
    : []),
  { to: "/dashboard/profile", label: t("dashboard.nav.profile"), exact: true },
]);

function isActive(link: { to: string; exact: boolean }) {
  return link.exact
    ? route.path === link.to
    : route.path.startsWith(link.to);
}

// A full reload, not a route change: nothing from this account stays in memory
// (clients, scopes, cached profile) for whoever uses the browser next.
async function signOut() {
  await auth.signOut();
  reloadNuxtApp({ path: "/login", force: true });
}
</script>

<template>
  <main class="dashboard-shell">
    <header class="dashboard-header">
      <NuxtLink to="/dashboard" class="dashboard-brand">
        <BrandMark />
        <span>{{ t("brand.name") }}</span>
      </NuxtLink>

      <nav class="dashboard-nav" :aria-label="t('dashboard.nav.label')">
        <NuxtLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          :class="{ 'is-active': isActive(link) }"
          :aria-current="isActive(link) ? 'page' : undefined"
        >
          {{ link.label }}
        </NuxtLink>
      </nav>

      <div class="dashboard-header-actions">
        <ThemeToggle />
        <button class="btn btn-ghost btn-sm" type="button" @click="signOut">
          <AppIcon :icon="LogOut" :size="16" />
          {{ t("dashboard.signOut") }}
        </button>
      </div>
    </header>

    <section class="dashboard-content">
      <slot />
    </section>
  </main>
</template>
