<script setup lang="ts">
import { LockKeyhole } from "lucide";

type Variant = "dark" | "gold";

// Self-contained markup with inline styles, so it looks the same on any site.
const VARIANTS: Record<Variant, { background: string; color: string; icon: string }> = {
  dark: { background: "#1e1b15", color: "#fcfbf9", icon: "#efd38c" },
  gold: { background: "#ffc21a", color: "#231a02", icon: "#231a02" },
};

const { t } = useI18n();
const variant = ref<Variant>("dark");

function lockSvg(stroke: string) {
  const shapes = LockKeyhole.map(
    ([tag, attrs]) =>
      `<${tag} ${Object.entries(attrs)
        .map(([key, value]) => `${key}="${value}"`)
        .join(" ")}/>`,
  ).join("");

  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes}</svg>`;
}

const snippet = computed(() => {
  const { background, color, icon } = VARIANTS[variant.value];
  const style = [
    "display:inline-flex",
    "align-items:center",
    "gap:10px",
    "height:44px",
    "padding:0 18px",
    "border-radius:10px",
    `background:${background}`,
    `color:${color}`,
    "font:600 15px/1 system-ui,-apple-system,'Segoe UI',sans-serif",
    "text-decoration:none",
  ].join(";");

  return [
    "<!-- Sign in with Open Sesame. Point href at the route on your server",
    "     that starts the sign-in. -->",
    `<a href="/login/open-sesame" style="${style}">`,
    `  ${lockSvg(icon)}`,
    "  Sign in with Open Sesame",
    "</a>",
  ].join("\n");
});
</script>

<template>
  <div class="sign-in-button">
    <div class="sign-in-button-header">
      <div>
        <h3 class="dash-label">{{ t("clients.integration.button.title") }}</h3>
        <p class="dash-field-hint">{{ t("clients.integration.button.description") }}</p>
      </div>
      <div class="sign-in-button-variants" role="group" :aria-label="t('clients.integration.button.style')">
        <button
          v-for="option in (['dark', 'gold'] as const)"
          :key="option"
          type="button"
          class="btn btn-xs"
          :class="variant === option ? 'btn-primary' : 'btn-ghost'"
          :aria-pressed="variant === option"
          @click="variant = option"
        >
          {{ t(`clients.integration.button.${option}`) }}
        </button>
      </div>
    </div>

    <!-- Built only from the constants above, never from user input. Inert so the
         sample link can't be followed from here. -->
    <div class="sign-in-button-preview" inert v-html="snippet" />

    <CodeBlock :code="snippet" />
  </div>
</template>
