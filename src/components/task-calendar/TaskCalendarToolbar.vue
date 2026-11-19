<script setup lang="ts">
import { ChevronLeft, ChevronRight, Plus } from 'lucide-vue-next';

defineProps<{
  monthLabel: string;
}>();

const emit = defineEmits<{
  prevMonth: [];
  nextMonth: [];
  today: [];
  addTask: [];
}>();
</script>

<template>
  <div
    class="px-6 py-3 border-b border-gray-100 flex items-center justify-between text-xs shrink-0"
  >
    <div class="flex items-center gap-3">
      <h2 class="text-sm font-bold text-gray-900">{{ monthLabel }}</h2>
      <div class="flex items-center gap-1">
        <button
          type="button"
          @click="emit('prevMonth')"
          class="p-1 rounded hover:bg-gray-100 text-gray-600 transition-colors"
          title="Previous month"
        >
          <ChevronLeft class="w-4 h-4" />
        </button>
        <button
          type="button"
          @click="emit('today')"
          class="px-2 py-0.5 rounded border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium"
        >
          Today
        </button>
        <button
          type="button"
          @click="emit('nextMonth')"
          class="p-1 rounded hover:bg-gray-100 text-gray-600 transition-colors"
          title="Next month"
        >
          <ChevronRight class="w-4 h-4" />
        </button>
      </div>
    </div>

    <div class="flex items-center gap-3">
      <span class="text-xs text-gray-400">Deadlines from all connected boards</span>
      <button
        type="button"
        @click="emit('addTask')"
        class="flex items-center gap-1 px-2.5 py-1 bg-modern-primary text-white font-semibold rounded-md hover:bg-modern-hover transition-colors"
      >
        <Plus class="w-3.5 h-3.5" />
        <span>Add Task</span>
      </button>
    </div>
  </div>
</template>
