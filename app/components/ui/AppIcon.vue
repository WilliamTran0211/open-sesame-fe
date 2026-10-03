<script setup lang="ts">
import { MorphIcon, type IconNode } from "morphicons/vue";

// Every icon in the app: Lucide data drawn by morphicons. Changing `icon` morphs
// to the new one (eye to eye-off, copy to check, sun to moon) instead of swapping.
// Decorative by default (aria-hidden); pass `label` when the icon carries meaning.
withDefaults(
  defineProps<{
    icon: IconNode;
    size?: number;
    strong?: boolean;
    label?: string;
  }>(),
  { size: 16, strong: false, label: undefined },
);
</script>

<template>
  <MorphIcon
    :icon="icon"
    :size="size"
    :stroke-width="strong ? 2.5 : 2"
    :label="label"
    spring="snappy"
    reduced-motion="user"
  />
</template>
