<script setup lang="ts">
import { computed } from 'vue';
import type { TaskLabel } from '@/types/domain';
import { getLabelDisplayName, getLabelPillClass, getLabelPillStyle } from '@/utils/labelColors';

const props = withDefaults(
  defineProps<{
    labels: TaskLabel[];
    maxVisible: number;
    maxWidthClass?: string;
    overflowPaddingClass?: string;
    showEmptyPlaceholder?: boolean;
  }>(),
  {
    maxWidthClass: 'max-w-[120px]',
    overflowPaddingClass: 'px-1.5 py-0.5',
    showEmptyPlaceholder: false,
  },
);

const visibleLabels = computed(() => props.labels.slice(0, props.maxVisible));
const overflowCount = computed(() => Math.max(0, props.labels.length - props.maxVisible));
</script>

<template>
  <template v-if="labels.length > 0">
    <span
      v-for="label in visibleLabels"
      :key="label.id"
      :class="[
        'text-[10px] font-semibold px-1.5 py-0.5 rounded border truncate',
        maxWidthClass,
        getLabelPillClass(label.color),
      ]"
      :style="getLabelPillStyle(label.color)"
    >
      {{ getLabelDisplayName(label) }}
    </span>
    <span
      v-if="overflowCount > 0"
      :class="['text-[10px] font-semibold rounded bg-gray-100 text-gray-600', overflowPaddingClass]"
    >
      +{{ overflowCount }}
    </span>
  </template>
  <span v-else-if="showEmptyPlaceholder" class="text-[10px] text-gray-300">-</span>
</template>
