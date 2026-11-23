<script setup lang="ts">
import { useDismissibleLayer } from '@/composables/useDismissibleLayer';

const props = withDefaults(
  defineProps<{
    open: boolean;
    labelledBy: string;
    closeAriaLabel?: string;
    panelClass?: string;
    backdropClass?: string;
  }>(),
  {
    closeAriaLabel: 'Close modal dialog',
    panelClass: 'max-w-lg',
    backdropClass: 'bg-black/40',
  },
);

const emit = defineEmits<{
  close: [];
}>();

useDismissibleLayer({
  isActive: () => props.open,
  onDismiss: () => emit('close'),
  dismissOnOutsideClick: false,
  dismissOnEscape: true,
});
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <button
      type="button"
      :class="['fixed inset-0 backdrop-blur-sm cursor-default border-0', backdropClass]"
      :aria-label="closeAriaLabel"
      @click="emit('close')"
    />
    <div
      role="dialog"
      aria-modal="true"
      :aria-labelledby="labelledBy"
      :class="[
        'relative z-10 bg-white rounded-2xl w-full shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150',
        panelClass,
      ]"
    >
      <slot />
    </div>
  </div>
</template>
