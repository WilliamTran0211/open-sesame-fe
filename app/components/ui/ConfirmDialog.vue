<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    danger?: boolean;
    loading?: boolean;
  }>(),
  {
    danger: false,
    loading: false,
  },
);

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();

const { t } = useI18n();
const dialog = ref<HTMLDialogElement | null>(null);

// Native <dialog> gives focus trapping and Esc-to-close for free.
watch(
  () => props.open,
  (open) => {
    if (open) {
      dialog.value?.showModal();
    } else {
      dialog.value?.close();
    }
  },
);
</script>

<template>
  <dialog ref="dialog" class="modal" @cancel.prevent="emit('cancel')">
    <div class="modal-box">
      <h3 class="text-lg font-bold">{{ title }}</h3>
      <p class="py-3 text-sm opacity-75">{{ message }}</p>
      <div class="modal-action">
        <button
          type="button"
          class="btn btn-ghost"
          :disabled="loading"
          @click="emit('cancel')"
        >
          {{ t("clients.cancel") }}
        </button>
        <button
          type="button"
          class="btn"
          :class="danger ? 'btn-error' : 'btn-primary'"
          :disabled="loading"
          @click="emit('confirm')"
        >
          <span v-if="loading" class="loading loading-spinner loading-xs" />
          {{ confirmLabel }}
        </button>
      </div>
    </div>
    <div class="modal-backdrop" @click="!loading && emit('cancel')" />
  </dialog>
</template>
