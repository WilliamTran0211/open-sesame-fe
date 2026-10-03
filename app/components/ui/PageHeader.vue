<script setup lang="ts">
// Title block at the top of a dashboard page, with optional actions on the right.
// Use the description slot for rich content such as status badges.
defineProps<{
  title: string;
  description?: string;
}>();
</script>

<template>
  <div class="dash-page-header">
    <div class="dashboard-intro">
      <h1>{{ title }}</h1>
      <p v-if="description || $slots.description">
        <slot name="description">{{ description }}</slot>
      </p>
    </div>
    <div v-if="$slots.actions" class="dash-page-actions">
      <slot name="actions" />
    </div>
  </div>
</template>
