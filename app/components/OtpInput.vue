<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    id: string;
    label: string;
    modelValue: string;
    length?: number;
    error?: boolean;
    errorMessage?: string;
  }>(),
  {
    length: 6,
    error: false,
    errorMessage: "",
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

function updateCode(event: Event) {
  const input = event.target as HTMLInputElement;
  const value = input.value.replace(/\D/g, "").slice(0, props.length);

  input.value = value;
  emit("update:modelValue", value);
}
</script>

<template>
  <div class="field otp-field">
    <label :for="id">{{ label }}</label>
    <input
      :id="id"
      :value="modelValue"
      class="input input-ghost otp-input"
      :class="{ 'input-error': error }"
      :aria-invalid="error || undefined"
      :aria-describedby="error ? `${id}-error` : undefined"
      inputmode="numeric"
      autocomplete="one-time-code"
      :maxlength="length"
      :placeholder="'0'.repeat(length)"
      @input="updateCode"
    />
    <p
      :id="`${id}-error`"
      class="field-error"
      :class="{ 'field-error-visible': error }"
      :aria-hidden="!error"
    >
      {{ errorMessage }}
    </p>
  </div>
</template>
