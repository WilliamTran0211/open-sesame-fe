<script setup lang="ts">
import { LockKeyhole } from "lucide";

withDefaults(defineProps<{ size?: number }>(), { size: 16 });
</script>

<template>
  <span class="brand-mark" aria-hidden="true">
    <AppIcon :icon="LockKeyhole" :size="size" strong />
  </span>
</template>
