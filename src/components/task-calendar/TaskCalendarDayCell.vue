<script setup lang="ts">
import TaskCompleteButton from '@/components/task-views/TaskCompleteButton.vue';
import type { TaskInterface } from '@/types/domain';
import type { CalendarDay } from './calendarGrid';

defineProps<{
  day: CalendarDay;
  selectedTaskId: string | null;
}>();

const emit = defineEmits<{
  openTask: [taskId: string];
  toggleComplete: [task: TaskInterface];
}>();
</script>

<template>
  <div
    :class="[
      'p-1.5 flex flex-col border-b border-gray-200 min-h-[90px] overflow-hidden transition-colors',
      day.isCurrentMonth ? 'bg-white' : 'bg-gray-50/70',
      day.isToday ? 'bg-indigo-50/20' : '',
    ]"
  >
    <!-- Day Number Header -->
    <div class="flex items-center justify-between text-xs mb-1">
      <span
        :class="[
          'w-5 h-5 flex items-center justify-center rounded-full text-[11px]',
          day.isToday
            ? 'bg-modern-primary text-white font-bold'
            : day.isCurrentMonth
              ? 'text-gray-700 font-medium'
              : 'text-gray-300',
        ]"
      >
        {{ day.dayNumber }}
      </span>
      <span v-if="day.tasks.length > 0" class="text-[10px] text-gray-400 font-medium">
        {{ day.tasks.length }}
      </span>
    </div>

    <!-- Task Pills in cell -->
    <div class="flex-1 overflow-y-auto space-y-1">
      <div
        v-for="task in day.tasks"
        :key="task.id"
        role="button"
        tabindex="0"
        @click="emit('openTask', task.id)"
        @keydown.enter.prevent="emit('openTask', task.id)"
        @keydown.space.prevent="emit('openTask', task.id)"
        :class="[
          'px-1.5 py-1 rounded text-[10px] truncate cursor-pointer font-medium border flex items-center gap-1 group shadow-xs transition-transform hover:scale-[1.02]',
          selectedTaskId === task.id ? 'ring-1 ring-indigo-300 border-indigo-400' : '',
          task.dueComplete
            ? 'bg-gray-100 text-gray-400 border-gray-200 line-through'
            : 'bg-white text-gray-800 border-gray-200 hover:border-indigo-400',
        ]"
      >
        <TaskCompleteButton
          size="sm"
          :completed="task.dueComplete"
          @toggle="emit('toggleComplete', task)"
        />
        <span
          class="w-1.5 h-1.5 rounded-full shrink-0"
          :style="{ backgroundColor: task.boardColor }"
        />
        <span class="truncate flex-1">{{ task.name }}</span>
      </div>
    </div>
  </div>
</template>
