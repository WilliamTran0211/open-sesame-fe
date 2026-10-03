<script setup lang="ts">
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide";

const props = withDefaults(
  defineProps<{
    tone?: "error" | "warning" | "success" | "info";
    // Smaller version for a message under a single field.
    compact?: boolean;
  }>(),
  {
    tone: "error",
    compact: false,
  },
);

const ICONS = {
  error: CircleAlert,
  warning: TriangleAlert,
  success: CircleCheck,
  info: Info,
};

// Problems interrupt screen readers; confirmations wait their turn.
const role = computed(() =>
  props.tone === "error" || props.tone === "warning" ? "alert" : "status",
);
</script>

<template>
  <div
    :role="role"
    class="alert-message"
    :class="[`is-${tone}`, { 'is-compact': compact }]"
  >
    <AppIcon
      :icon="ICONS[tone]"
      class="alert-message-icon"
      :size="compact ? 15 : 18"
      strong
    />
    <div class="alert-message-body">
      <slot />
    </div>
    <div v-if="$slots.action" class="alert-message-action">
      <slot name="action" />
    </div>
  </div>
</template>
