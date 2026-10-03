<script setup lang="ts">
// Placeholder rows shaped like the list that is loading.
withDefaults(
  defineProps<{
    rows?: number;
    // Rows that start with a square monogram (clients) or not (scopes).
    avatar?: boolean;
  }>(),
  {
    rows: 3,
    avatar: false,
  },
);

const { t } = useI18n();
</script>

<template>
  <ul class="client-list" :aria-label="t('common.loading')">
    <li
      v-for="row in rows"
      :key="row"
      class="client-row"
      :class="{ 'scope-row': !avatar }"
      aria-hidden="true"
    >
      <span v-if="avatar" class="skeleton h-[38px] w-[38px]" />
      <span class="client-row-main">
        <span class="skeleton h-4 w-40" />
        <span class="skeleton h-3 w-56" />
      </span>
    </li>
  </ul>
</template>
