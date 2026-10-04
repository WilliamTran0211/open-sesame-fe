<script setup lang="ts">
import { Plus, X } from "lucide";
import { isValidRedirectUri } from "~/utils/oauth";

const props = withDefaults(
  defineProps<{
    modelValue: string[];
    showErrors?: boolean;
  }>(),
  {
    showErrors: false,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string[]];
}>();

const { t } = useI18n();

function update(index: number, value: string) {
  const next = [...props.modelValue];
  next[index] = value;
  emit("update:modelValue", next);
}

function add() {
  emit("update:modelValue", [...props.modelValue, ""]);
}

function remove(index: number) {
  emit(
    "update:modelValue",
    props.modelValue.filter((_, itemIndex) => itemIndex !== index),
  );
}

function rowError(value: string) {
  if (!props.showErrors) {
    return "";
  }

  // A blank row is an unused slot and is dropped on save; the form says when at
  // least one URI is needed.
  if (!value.trim()) {
    return "";
  }

  if (!isValidRedirectUri(value.trim())) {
    return t("clients.form.redirectInvalid");
  }

  const isDuplicate =
    props.modelValue.filter((item) => item.trim() === value.trim()).length > 1;
  return isDuplicate ? t("clients.form.redirectDuplicate") : "";
}
</script>

<template>
  <div class="redirect-list">
    <div
      v-for="(uri, index) in modelValue"
      :key="index"
      class="redirect-row"
    >
      <div class="redirect-input">
        <input
          :value="uri"
          type="url"
          class="input w-full font-mono text-sm"
          :class="{ 'input-error': rowError(uri) }"
          placeholder="https://app.example.com/callback"
          :aria-label="t('clients.form.redirectUri', { index: index + 1 })"
          @input="update(index, ($event.target as HTMLInputElement).value)"
        />
        <AlertMessage v-if="rowError(uri)" compact>{{ rowError(uri) }}</AlertMessage>
      </div>
      <button
        type="button"
        class="btn btn-ghost btn-square btn-sm"
        :aria-label="t('clients.form.removeRedirect')"
        @click="remove(index)"
      >
        <AppIcon :icon="X" :size="16" />
      </button>
    </div>

    <button type="button" class="btn btn-ghost btn-sm self-start" @click="add">
      <AppIcon :icon="Plus" :size="14" strong />
      {{ t("clients.form.addRedirect") }}
    </button>
  </div>
</template>
