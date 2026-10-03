<script setup lang="ts">
defineProps<{
  title?: string;
  description?: string;
}>();
</script>

<template>
  <div class="dash-empty">
    <p v-if="title" class="dash-empty-title">{{ title }}</p>
    <p v-if="description">{{ description }}</p>
    <slot />
  </div>
</template>
