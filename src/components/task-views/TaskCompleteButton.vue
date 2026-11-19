<script setup lang="ts">
import { Check } from 'lucide-vue-next';

withDefaults(
  defineProps<{
    completed: boolean;
    size?: 'sm' | 'md';
    label?: string;
  }>(),
  {
    size: 'md',
    label: 'Toggle task completion',
  },
);

const emit = defineEmits<{
  toggle: [];
}>();
</script>

<template>
  <button
    type="button"
    :aria-label="label"
    :aria-pressed="completed"
    @click.stop="emit('toggle')"
    :class="[
      'rounded-full border flex items-center justify-center transition-all modern-check-btn shrink-0',
      size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5',
      completed
        ? 'bg-emerald-500 border-emerald-500 text-white'
        : 'border-gray-300 hover:border-emerald-500 text-transparent hover:text-emerald-500 bg-white',
    ]"
  >
    <Check :class="[size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3', 'stroke-[3]']" />
  </button>
</template>
