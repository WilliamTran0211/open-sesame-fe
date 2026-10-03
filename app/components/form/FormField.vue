<script setup lang="ts">
import { CircleAlert, Eye, EyeOff } from "lucide";

type InputType = "email" | "password" | "text";

const props = withDefaults(
  defineProps<{
    id: string;
    label: string;
    modelValue: string;
    type?: InputType;
    placeholder?: string;
    autocomplete?: string;
    error?: boolean;
    errorMessage?: string;
    showPasswordToggle?: boolean;
  }>(),
  {
    type: "text",
    placeholder: "",
    autocomplete: "off",
    error: false,
    errorMessage: "",
    showPasswordToggle: false,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const { t } = useI18n();
const isPasswordVisible = ref(false);
const errorId = computed(() => `${props.id}-error`);
const inputType = computed(() => {
  if (props.type === "password" && !isPasswordVisible.value) {
    return "password";
  }

  return props.type === "password" ? "text" : props.type;
});
</script>

<template>
  <div class="field">
    <div class="field-label-row">
      <label :for="id">{{ label }}</label>
      <slot name="label-action" />
    </div>
    <label
      class="input input-ghost flex w-full items-center gap-2"
      :class="{ 'input-error': error }"
    >
      <input
        :id="id"
        :value="modelValue"
        :type="inputType"
        :autocomplete="autocomplete"
        :placeholder="placeholder"
        :aria-invalid="error || undefined"
        :aria-describedby="error && errorMessage ? errorId : undefined"
        class="grow"
        @input="
          emit('update:modelValue', ($event.target as HTMLInputElement).value)
        "
      />
      <button
        v-if="showPasswordToggle"
        type="button"
        class="password-toggle"
        :aria-label="
          isPasswordVisible ? t('auth.hidePassword') : t('auth.showPassword')
        "
        @click="isPasswordVisible = !isPasswordVisible"
      >
        <AppIcon :icon="isPasswordVisible ? EyeOff : Eye" :size="17" />
      </button>
    </label>
    <p v-if="error && errorMessage" :id="errorId" class="field-error">
      <AppIcon :icon="CircleAlert" :size="14" strong />
      {{ errorMessage }}
    </p>
  </div>
</template>
