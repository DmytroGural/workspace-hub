<script setup lang="ts">
import { AlertCircle, Calendar } from 'lucide-vue-next';
import { computed } from 'vue';
import type { TaskTimeSection } from '@/types/domain';
import { formatShortDueDate } from '@/utils/dateUtils';
import { getTaskDueTone, type TaskDueTone } from '@/utils/taskPresentation';

const props = withDefaults(
  defineProps<{
    due: string | null;
    dueComplete: boolean;
    section: TaskTimeSection;
    variant?: 'pill' | 'inline';
    emptyText?: string;
  }>(),
  {
    variant: 'inline',
    emptyText: '',
  },
);

const tone = computed<TaskDueTone>(() => getTaskDueTone(props));
const formattedDue = computed(() => formatShortDueDate(props.due, props.emptyText));

const TONE_CLASSES: Record<'pill' | 'inline', Record<TaskDueTone, string>> = {
  pill: {
    overdue: 'bg-rose-100 text-rose-700 font-bold',
    today: 'bg-amber-100 text-amber-800 font-semibold',
    default: 'text-gray-600',
  },
  inline: {
    overdue: 'text-rose-600 font-bold',
    today: 'text-amber-600 font-semibold',
    default: 'text-gray-500',
  },
};
</script>

<template>
  <span
    :class="[
      variant === 'pill'
        ? 'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium'
        : 'flex items-center gap-1 font-medium',
      TONE_CLASSES[variant][tone],
    ]"
  >
    <AlertCircle v-if="tone === 'overdue'" class="w-3 h-3 text-rose-600" />
    <Calendar v-else class="w-3 h-3 text-gray-400" />
    <span>{{ formattedDue }}</span>
  </span>
</template>
