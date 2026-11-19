<script setup lang="ts">
import { ChevronDown, ChevronRight } from 'lucide-vue-next';
import type { TaskInterface } from '@/types/domain';
import TaskListRow from './TaskListRow.vue';
import type { TaskListGroup } from './types';

defineProps<{
  group: TaskListGroup;
  collapsed: boolean;
  selectedTaskId: string | null;
  showAccountBadge: boolean;
}>();

const emit = defineEmits<{
  toggleCollapse: [groupKey: string];
  openTask: [taskId: string];
  toggleComplete: [task: TaskInterface];
}>();
</script>

<template>
  <div class="border-b border-gray-100 last:border-b-0">
    <!-- Group Section Header -->
    <button
      type="button"
      @click="emit('toggleCollapse', group.key)"
      class="w-full px-6 py-2 bg-gray-50/70 hover:bg-gray-100/70 cursor-pointer flex items-center justify-between transition-colors select-none text-left"
    >
      <div class="flex items-center gap-2 font-bold text-xs text-gray-800">
        <component :is="collapsed ? ChevronRight : ChevronDown" class="w-3.5 h-3.5 text-gray-400" />
        <span
          v-if="group.color"
          class="w-2 h-2 rounded-sm shrink-0"
          :style="{ backgroundColor: group.color }"
        />
        <span :class="group.badgeColor || 'text-gray-800'">{{ group.title }}</span>
        <span class="text-[11px] font-normal text-gray-400">({{ group.tasks.length }})</span>
      </div>
    </button>

    <!-- Group Task Rows -->
    <div v-if="!collapsed">
      <TaskListRow
        v-for="task in group.tasks"
        :key="task.id"
        :task="task"
        :is-selected="selectedTaskId === task.id"
        :show-account-badge="showAccountBadge"
        @open="emit('openTask', $event)"
        @toggle-complete="emit('toggleComplete', $event)"
      />
    </div>
  </div>
</template>
