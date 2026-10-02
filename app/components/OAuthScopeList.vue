<script setup lang="ts">
import { PhPuzzlePiece, PhUserCircle, PhWarningCircle } from "@phosphor-icons/vue";
import { SCOPE_CATALOG } from "~/utils/oauth";

// The icon carries the risk level, so it isn't conveyed by color alone.
const LEVEL_ICONS = {
  basic: PhUserCircle,
  sensitive: PhWarningCircle,
  custom: PhPuzzlePiece,
};

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
const scopesStore = useScopesStore();

const items = computed(() => {
  const requested = props.scopes.map((scope) => {
    const known = SCOPE_CATALOG[scope];

    const defined = scopesStore.findScope(scope);

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
          // Scopes registered on the server carry their own user-facing description.
          description: defined?.description || t("oauth.scopes.custom.description"),
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
      <component
        :is="LEVEL_ICONS[item.level]"
        class="oauth-scope-icon"
        :size="18"
        aria-hidden="true"
      />
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
