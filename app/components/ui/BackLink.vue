<script setup lang="ts">
import { ArrowLeft } from "lucide";

defineProps<{ to: string }>();
</script>

<template>
  <NuxtLink :to="to" class="dash-back">
    <AppIcon :icon="ArrowLeft" :size="14" />
    <slot />
  </NuxtLink>
</template>
