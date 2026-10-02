<script setup lang="ts">
import { PhCheck, PhEye, PhEyeSlash, PhX } from "@phosphor-icons/vue";
import { getPasswordChecks } from "~/utils/password";

const props = withDefaults(
  defineProps<{
    id: string;
    label: string;
    modelValue: string;
    fullName?: string;
    autocomplete?: string;
    placeholder?: string;
    error?: boolean;
  }>(),
  {
    fullName: "",
    autocomplete: "new-password",
    placeholder: "",
    error: false,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const { t } = useI18n();
const isPasswordVisible = ref(false);
const isFocused = ref(false);
const checks = computed(() => getPasswordChecks(props.modelValue));
const strength = computed(() => checks.value.filter(Boolean).length);
const strengthLevel = computed(() => {
  if (strength.value === 0) return 0;
  if (strength.value <= 1) return 1;
  if (strength.value <= 2) return 2;
  if (strength.value <= 4) return 3;
  return 4;
});
const strengthLabel = computed(() => {
  if (strength.value === 5) return t("auth.strength.strong");
  if (strength.value >= 3) return t("auth.strength.medium");
  return t("auth.strength.weak");
});
const showStrength = computed(
  () => isFocused.value && props.modelValue.length > 0,
);
const requirements = computed(() => [
  t("auth.requirements.length"),
  t("auth.requirements.number"),
  t("auth.requirements.lowercase"),
  t("auth.requirements.uppercase"),
  t("auth.requirements.special"),
]);

function hideStrength() {
  window.setTimeout(() => {
    isFocused.value = false;
  }, 0);
}
</script>

<template>
  <div class="field password-strength-field">
    <div class="field-label-row">
      <label :for="id">{{ label }}</label>
    </div>
    <div class="password-input-wrap">
      <label
        class="input input-ghost flex w-full items-center gap-2"
        :class="{ 'input-error': error }"
      >
        <input
          :id="id"
          :value="modelValue"
          :type="isPasswordVisible ? 'text' : 'password'"
          :autocomplete="autocomplete"
          :placeholder="placeholder"
          class="grow"
          :aria-invalid="error || undefined"
          :aria-describedby="`${id}-strength`"
          @focus="isFocused = true"
          @blur="hideStrength"
          @input="
            emit('update:modelValue', ($event.target as HTMLInputElement).value)
          "
        />
        <button
          type="button"
          class="password-toggle"
          :aria-label="
            isPasswordVisible ? t('auth.hidePassword') : t('auth.showPassword')
          "
          @mousedown.prevent
          @click="isPasswordVisible = !isPasswordVisible"
        >
          <PhEyeSlash v-if="isPasswordVisible" :size="17" aria-hidden="true" />
          <PhEye v-else :size="17" aria-hidden="true" />
        </button>
      </label>

      <div
        :id="`${id}-strength`"
        class="password-strength-popover"
        :class="{ 'password-strength-popover-visible': showStrength }"
        aria-live="polite"
      >
        <div class="password-strength-heading">{{ strengthLabel }}</div>
        <div class="password-strength-track" aria-hidden="true">
          <span
            v-for="segment in 4"
            :key="segment"
            :class="[
              'strength-segment',
              `strength-segment-${segment}`,
              { 'is-active': strengthLevel >= segment },
            ]"
          />
        </div>
        <ul class="password-requirements">
          <li v-for="(requirement, index) in requirements" :key="requirement">
            <span
              class="requirement-state"
              :class="checks[index] ? 'is-met' : 'is-unmet'"
              aria-hidden="true"
            >
              <PhCheck v-if="checks[index]" :size="14" weight="bold" />
              <PhX v-else :size="14" />
            </span>
            <span>{{ requirement }}</span>
          </li>
        </ul>
      </div>
    </div>
    <p class="field-error" :class="{ 'field-error-visible': error }" />
  </div>
</template>
