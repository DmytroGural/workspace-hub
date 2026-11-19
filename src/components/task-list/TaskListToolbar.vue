<script setup lang="ts">
import { ArrowUpDown, Plus } from 'lucide-vue-next';
import type { TaskListGroupBy } from './types';

defineProps<{
  groupBy: TaskListGroupBy;
  totalTasks: number;
  currentPage: number;
  totalPages: number;
}>();

const emit = defineEmits<{
  'update:groupBy': [value: TaskListGroupBy];
  addTask: [];
}>();

function handleGroupChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value as TaskListGroupBy;
  emit('update:groupBy', value);
}
</script>

<template>
  <div
    class="px-6 py-3 border-b border-gray-100 flex items-center justify-between text-xs text-gray-500 bg-gray-50/50 shrink-0"
  >
    <div class="flex items-center gap-3">
      <button
        type="button"
        @click="emit('addTask')"
        class="flex items-center gap-1.5 px-3 py-1 bg-modern-primary text-white font-semibold rounded-md hover:bg-modern-hover transition-colors"
      >
        <Plus class="w-3.5 h-3.5" />
        <span>Add Task</span>
      </button>
      <span class="text-gray-300">|</span>
      <div class="flex items-center gap-1.5">
        <ArrowUpDown class="w-3.5 h-3.5 text-gray-400" />
        <span>Group by:</span>
        <select
          :value="groupBy"
          @change="handleGroupChange"
          class="bg-white border border-gray-200 rounded px-2 py-0.5 text-gray-700 text-xs focus:outline-none focus:border-modern-primary font-medium"
        >
          <option value="list">Lists / Sections</option>
          <option value="section">Smart Sections (Today / Upcoming / Overdue)</option>
          <option value="board">Board / Project</option>
          <option value="account">Account / Workspace</option>
          <option value="label">Labels</option>
          <option value="none">Flat List (No grouping)</option>
        </select>
      </div>
    </div>

    <div class="text-xs text-gray-400 font-medium">
      {{ totalTasks }} tasks · Page {{ currentPage }} of {{ totalPages }}
    </div>
  </div>
</template>
