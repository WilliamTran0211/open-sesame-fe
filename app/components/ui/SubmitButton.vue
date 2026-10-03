<script setup lang="ts">
import { ArrowRight } from "lucide";

// Full-width primary submit for the sign-in style forms: a spinner while busy,
// an arrow otherwise.
defineProps<{ loading?: boolean }>();
</script>

<template>
  <button type="submit" class="btn btn-primary w-full" :disabled="loading">
    <span v-if="loading" class="loading loading-spinner loading-xs" />
    <slot />
    <AppIcon :icon="ArrowRight" v-if="!loading" :size="16" strong />
  </button>
</template>
