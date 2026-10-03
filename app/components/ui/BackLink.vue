<script setup lang="ts">
import { PhArrowLeft } from "@phosphor-icons/vue";

defineProps<{ to: string }>();
</script>

<template>
  <NuxtLink :to="to" class="dash-back">
    <PhArrowLeft :size="14" aria-hidden="true" />
    <slot />
  </NuxtLink>
</template>
