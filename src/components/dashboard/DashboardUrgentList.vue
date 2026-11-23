<script setup lang="ts">
import { ArrowUpRight, Clock, Flame } from 'lucide-vue-next';
import TaskCompleteButton from '@/components/task-views/TaskCompleteButton.vue';
import TaskLabelsList from '@/components/task-views/TaskLabelsList.vue';
import type { TaskInterface } from '@/types/domain';
import { formatShortDueDate } from '@/utils/dateUtils';

defineProps<{
  tasks: TaskInterface[];
}>();

const emit = defineEmits<{
  openTask: [taskId: string];
  toggleComplete: [task: TaskInterface];
  viewAll: [];
}>();

function formatDue(dateStr: string | null): string {
  return formatShortDueDate(dateStr, 'No due date');
}
</script>

<template>
  <div class="bg-white rounded-xl border border-modern-border overflow-hidden shadow-sm">
    <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <Flame class="w-4 h-4 text-rose-500" />
        <h3 class="text-sm font-bold text-gray-900">Urgent & Today's Action Items</h3>
        <span class="text-xs px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-semibold">
          {{ tasks.length }}
          urgent
        </span>
      </div>
      <button
        type="button"
        @click="emit('viewAll')"
        class="text-xs font-medium text-modern-primary hover:underline flex items-center gap-1"
      >
        <span>View all list</span>
        <ArrowUpRight class="w-3.5 h-3.5" />
      </button>
    </div>

    <div v-if="tasks.length === 0" class="p-8 text-center text-gray-400 text-xs">
      🎉 Amazing job! No overdue or urgent tasks pending today.
    </div>

    <div v-else class="divide-y divide-gray-100">
      <div
        v-for="task in tasks"
        :key="task.id"
        role="button"
        tabindex="0"
        @click="emit('openTask', task.id)"
        @keydown.enter.prevent="emit('openTask', task.id)"
        @keydown.space.prevent="emit('openTask', task.id)"
        class="px-6 py-3.5 hover:bg-gray-50 flex items-center justify-between gap-4 cursor-pointer transition-colors group"
      >
        <div class="flex items-center gap-3.5 min-w-0 flex-1">
          <TaskCompleteButton
            :completed="task.dueComplete"
            @toggle="emit('toggleComplete', task)"
          />

          <div class="min-w-0">
            <div
              :class="[
                'text-xs font-medium text-gray-800 truncate group-hover:text-modern-primary transition-colors',
                task.dueComplete ? 'line-through text-gray-400' : '',
              ]"
            >
              {{ task.name }}
            </div>
            <div class="flex items-center gap-2 mt-1">
              <span
                class="text-[10px] px-1.5 py-0.5 rounded font-medium text-white shrink-0"
                :style="{ backgroundColor: task.boardColor }"
              >
                {{ task.boardName }}
              </span>
              <span class="text-[10px] text-gray-400 truncate"> • {{ task.listName }} </span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <TaskLabelsList :labels="task.labels" :max-visible="2" max-width-class="max-w-[100px]" />

          <div
            :class="[
              'text-[11px] font-medium flex items-center gap-1',
              task.section === 'overdue' ? 'text-rose-600 font-bold' : 'text-gray-500',
            ]"
          >
            <Clock class="w-3.5 h-3.5" />
            <span>{{ formatDue(task.due) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
