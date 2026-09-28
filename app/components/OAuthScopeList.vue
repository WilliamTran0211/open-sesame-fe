<script setup lang="ts">
import { SCOPE_CATALOG } from "~/utils/oauth";

const props = withDefaults(
  defineProps<{
    scopes: string[];
    // Every authorization reveals who the user is, even with an empty scope.
    showIdentity?: boolean;
  }>(),
  {
    showIdentity: true,
  },
);

const { t } = useI18n();

const items = computed(() => {
  const requested = props.scopes.map((scope) => {
    const known = SCOPE_CATALOG[scope];

    return known
      ? {
          key: scope,
          level: known.level,
          title: t(`oauth.scopes.${scope}.title`),
          description: t(`oauth.scopes.${scope}.description`),
        }
      : {
          key: scope,
          level: "custom" as const,
          title: t("oauth.scopes.custom.title", { scope }),
          description: t("oauth.scopes.custom.description"),
        };
  });

  if (!props.showIdentity) {
    return requested;
  }

  return [
    {
      key: "__identity",
      level: "basic" as const,
      title: t("oauth.scopes.identity.title"),
      description: t("oauth.scopes.identity.description"),
    },
    ...requested,
  ];
});
</script>

<template>
  <ul class="oauth-scope-list">
    <li
      v-for="item in items"
      :key="item.key"
      class="oauth-scope-item"
      :class="`oauth-scope-${item.level}`"
    >
      <span class="oauth-scope-dot" aria-hidden="true" />
      <div>
        <p class="oauth-scope-title">
          {{ item.title }}
          <span
            v-if="item.level === 'sensitive'"
            class="badge badge-warning badge-xs"
          >
            {{ t("oauth.scopes.sensitiveBadge") }}
          </span>
        </p>
        <p class="oauth-scope-description">{{ item.description }}</p>
      </div>
    </li>
  </ul>
</template>
