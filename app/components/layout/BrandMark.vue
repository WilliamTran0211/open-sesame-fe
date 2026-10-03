<script setup lang="ts">
import { PhLockKey } from "@phosphor-icons/vue";

withDefaults(defineProps<{ size?: number }>(), { size: 16 });
</script>

<template>
  <span class="brand-mark" aria-hidden="true">
    <PhLockKey :size="size" weight="bold" />
  </span>
</template>
