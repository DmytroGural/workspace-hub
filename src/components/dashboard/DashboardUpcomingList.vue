<script setup lang="ts">
import { Calendar } from 'lucide-vue-next';
import type { TaskInterface } from '@/types/domain';
import { formatShortDueDate } from '@/utils/dateUtils';

defineProps<{
  tasks: TaskInterface[];
}>();

const emit = defineEmits<{
  openTask: [taskId: string];
  seeAll: [];
}>();

function formatDue(dateStr: string | null): string {
  return formatShortDueDate(dateStr, 'No due date');
}
</script>

<template>
  <div class="bg-white rounded-xl border border-modern-border p-6 shadow-sm">
    <div class="flex items-center justify-between pb-4 border-b border-gray-100">
      <div class="flex items-center gap-2">
        <Calendar class="w-4 h-4 text-blue-500" />
        <h3 class="text-sm font-bold text-gray-900">Upcoming This Week</h3>
      </div>
      <button
        type="button"
        @click="emit('seeAll')"
        class="text-xs text-modern-primary hover:underline"
      >
        See all
      </button>
    </div>

    <div v-if="tasks.length === 0" class="py-6 text-center text-gray-400 text-xs">
      No upcoming tasks scheduled for the next 7 days.
    </div>

    <div v-else class="mt-4 space-y-2.5">
      <button
        type="button"
        v-for="task in tasks"
        :key="task.id"
        @click="emit('openTask', task.id)"
        class="w-full text-left flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 cursor-pointer transition-all"
      >
        <div class="flex items-center gap-3 min-w-0">
          <span
            class="w-2.5 h-2.5 rounded-full shrink-0"
            :style="{ backgroundColor: task.boardColor }"
          />
          <span class="text-xs text-gray-800 font-medium truncate">{{ task.name }}</span>
        </div>
        <div class="text-[11px] text-gray-500 shrink-0">
          {{ formatDue(task.due) }}
        </div>
      </button>
    </div>
  </div>
</template>
