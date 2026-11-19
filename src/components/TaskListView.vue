<script setup lang="ts">
import { computed, ref } from 'vue';
import { useTaskPagination, useTaskView } from '@/composables/useTaskView';
import PaginationBar from './PaginationBar.vue';
import TaskListGroupSection from './task-list/TaskListGroupSection.vue';
import TaskListTableHeader from './task-list/TaskListTableHeader.vue';
import TaskListToolbar from './task-list/TaskListToolbar.vue';
import { groupTasksForList } from './task-list/taskGrouping';
import type { TaskListGroup, TaskListGroupBy } from './task-list/types';

const {
  lists,
  selectedBoardId,
  selectedTaskId,
  showAccountBadge,
  openTask,
  openCreateTask,
  toggleTaskComplete,
} = useTaskView();

const {
  paginatedTasks,
  totalTasks,
  currentPage,
  pageSize,
  totalPages,
  handlePageUpdate,
  handlePageSizeUpdate,
} = useTaskPagination();

const groupBy = ref<TaskListGroupBy>('list');
const collapsedSections = ref<Record<string, boolean>>({});

function toggleSectionCollapse(key: string) {
  collapsedSections.value[key] = !collapsedSections.value[key];
}

const groupedTasks = computed<TaskListGroup[]>(() =>
  groupTasksForList(paginatedTasks.value, groupBy.value, lists.value, selectedBoardId.value),
);
</script>

<template>
  <div class="h-full overflow-y-auto bg-white flex flex-col">
    <TaskListToolbar
      v-model:group-by="groupBy"
      :total-tasks="totalTasks"
      :current-page="currentPage"
      :total-pages="totalPages"
      @add-task="openCreateTask"
    />

    <TaskListTableHeader />

    <!-- List Body -->
    <div class="flex-1 overflow-y-auto divide-y divide-gray-100 pb-6">
      <div v-if="groupedTasks.length === 0" class="py-16 text-center text-gray-400 text-xs">
        No tasks match your current filter or search criteria.
      </div>

      <TaskListGroupSection
        v-for="group in groupedTasks"
        :key="group.key"
        :group="group"
        :collapsed="Boolean(collapsedSections[group.key])"
        :selected-task-id="selectedTaskId"
        :show-account-badge="showAccountBadge"
        @toggle-collapse="toggleSectionCollapse"
        @open-task="openTask"
        @toggle-complete="toggleTaskComplete"
      />
    </div>

    <PaginationBar
      :current-page="currentPage"
      :total-pages="totalPages"
      :page-size="pageSize"
      :total-items="totalTasks"
      @update:current-page="handlePageUpdate"
      @update:page-size="handlePageSizeUpdate"
    />
  </div>
</template>
