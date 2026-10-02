<script setup lang="ts">
import lockIcon from "~/assets/icons/lock.svg";

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

async function signOut() {
  await auth.signOut();
  await navigateTo("/login");
}
</script>

<template>
  <main class="dashboard-shell">
    <header class="dashboard-header">
      <NuxtLink to="/dashboard" class="dashboard-brand">
        <div class="brand-mark" aria-hidden="true">
          <img :src="lockIcon" alt="" />
        </div>
        <span>OPEN-SESAME</span>
      </NuxtLink>

      <nav class="dashboard-nav" :aria-label="t('dashboard.nav.label')">
        <NuxtLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          :class="{ 'is-active': isActive(link) }"
        >
          {{ link.label }}
        </NuxtLink>
      </nav>

      <div class="dashboard-header-actions">
        <ThemeToggle />
        <button class="btn btn-ghost btn-sm" type="button" @click="signOut">
          {{ t("dashboard.signOut") }}
        </button>
      </div>
    </header>

    <section class="dashboard-content">
      <slot />
    </section>
  </main>
</template>
