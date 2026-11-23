<script setup lang="ts">
import { Plus } from 'lucide-vue-next';
import { computed } from 'vue';
import { useTaskView } from '@/composables/useTaskView';
import { type BoardColumn, buildBoardColumns } from './task-board/boardColumns';
import TaskBoardCard from './task-board/TaskBoardCard.vue';
import { useBoardDragAndDrop } from './task-board/useBoardDragAndDrop';

const {
  tasks,
  lists,
  selectedBoardId,
  selectedTaskId,
  isBoardScoped,
  canMoveTask,
  openTask,
  openCreateTask,
  toggleTaskComplete,
  moveTaskToList,
} = useTaskView();

const columns = computed<BoardColumn[]>(() =>
  buildBoardColumns(lists.value, tasks.value, selectedBoardId.value),
);

const {
  draggedTaskId,
  dragOverColumnId,
  handleDragStart,
  handleDragEnd,
  handleDragOver,
  handleCardDragOver,
  handleDragLeave,
  isDropSlotActive,
  handleDrop,
} = useBoardDragAndDrop({
  isBoardScoped: () => isBoardScoped.value,
  canMoveTask,
  findTaskById: (taskId) => tasks.value.find((task) => task.id === taskId),
  onDropTask: (taskId, targetListId, targetPos) => {
    void moveTaskToList(taskId, targetListId, targetPos);
  },
});
</script>

<template>
  <div class="h-full overflow-x-auto p-6 bg-gray-100 flex gap-4">
    <section
      v-for="col in columns"
      :key="col.id"
      :aria-label="col.title"
      @dragover.prevent="handleDragOver($event, col.id, col.tasks.length)"
      @dragenter.prevent="handleDragOver($event, col.id, col.tasks.length)"
      @dragleave="handleDragLeave($event, col.id)"
      @drop.prevent="handleDrop($event, col.id, col.tasks)"
      class="w-80 shrink-0 flex flex-col rounded-xl max-h-full border shadow-sm transition-colors"
      :class="[
        col.topColor ? `border-t-4 ${col.topColor}` : '',
        dragOverColumnId === col.id
          ? 'bg-indigo-50/80 border-indigo-400 ring-2 ring-indigo-300'
          : 'bg-gray-200/70 border-gray-300/60',
      ]"
    >
      <!-- Column Header -->
      <div class="p-3 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <h3 class="text-xs font-bold text-gray-800 tracking-tight">{{ col.title }}</h3>
          <span
            class="text-[11px] font-semibold px-1.5 py-0.2 rounded-full bg-gray-300/80 text-gray-700"
          >
            {{ col.tasks.length }}
          </span>
        </div>
        <button
          type="button"
          @click="openCreateTask(col)"
          class="p-1 hover:bg-gray-300 rounded text-gray-600 hover:text-gray-900 transition-colors"
          title="Add task in this column"
        >
          <Plus class="w-3.5 h-3.5" />
        </button>
      </div>

      <!-- Column Cards List -->
      <div class="flex-1 overflow-y-auto px-2.5 pb-2.5 space-y-2.5">
        <div
          v-if="col.tasks.length === 0 && dragOverColumnId === col.id"
          class="border-2 border-dashed border-indigo-300 rounded-lg p-4 text-center text-xs font-medium text-indigo-600 bg-white/60"
        >
          Drop card here
        </div>

        <template v-for="(task, idx) in col.tasks" :key="task.id">
          <div
            v-if="isDropSlotActive(col.id, idx, col.tasks)"
            class="h-0.5 bg-indigo-500 rounded-full mx-0.5 pointer-events-none"
          />
          <TaskBoardCard
            :task="task"
            :draggable="canMoveTask(task)"
            :is-dragging="draggedTaskId === task.id"
            :is-selected="selectedTaskId === task.id"
            @open="openTask"
            @toggle-complete="toggleTaskComplete"
            @drag-start="handleDragStart"
            @drag-end="handleDragEnd"
            @dragover.prevent.stop="handleCardDragOver($event, col.id, idx)"
          />
        </template>

        <div
          v-if="col.tasks.length > 0 && isDropSlotActive(col.id, col.tasks.length, col.tasks)"
          class="h-0.5 bg-indigo-500 rounded-full mx-0.5 pointer-events-none"
        />
      </div>
    </section>
  </div>
</template>
