<script setup lang="ts">
import eyeIcon from "~/assets/icons/eye.svg";
import eyeOffIcon from "~/assets/icons/eye-off.svg";

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

const isPasswordVisible = ref(false);
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
    <label class="input input-ghost flex w-full items-center gap-2">
      <input
        :id="id"
        :value="modelValue"
        :type="inputType"
        :autocomplete="autocomplete"
        :placeholder="placeholder"
        class="grow"
        :class="{ 'text-error': error }"
        @input="
          emit('update:modelValue', ($event.target as HTMLInputElement).value)
        "
      />
      <button
        v-if="showPasswordToggle"
        type="button"
        class="password-toggle"
        :aria-label="isPasswordVisible ? 'Hide password' : 'Show password'"
        @click="isPasswordVisible = !isPasswordVisible"
      >
        <img :src="isPasswordVisible ? eyeOffIcon : eyeIcon" alt="" />
      </button>
    </label>
    <p
      class="field-error"
      :class="{ 'field-error-visible': error && errorMessage }"
    >
      {{ errorMessage }}
    </p>
  </div>
</template>
