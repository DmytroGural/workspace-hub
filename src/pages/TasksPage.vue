<script setup lang="ts">
import { AlertCircle, ArrowLeft, RefreshCw } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import TaskBoardView from '@/components/TaskBoardView.vue';
import TaskCalendarView from '@/components/TaskCalendarView.vue';
import TaskListView from '@/components/TaskListView.vue';
import { useAutoRefresh } from '@/composables/useAutoRefresh';
import { useFiltersStore, useSyncStore, useTasksStore, useUIStore } from '@/stores';
import type { FilterSection } from '@/types/domain';
import { resolveVisibleViewMode, type TaskDisplayView } from '@/utils/taskSections';

const route = useRoute();

const tasksStore = useTasksStore();
const filtersStore = useFiltersStore();
const syncStore = useSyncStore();
const uiStore = useUIStore();

const { boards, selectedTaskId } = storeToRefs(tasksStore);
const { selectedBoardId, filterSection, viewMode } = storeToRefs(filtersStore);
const { isLoading } = storeToRefs(syncStore);
const { isNewTaskModalOpen } = storeToRefs(uiStore);

const { refreshBoard, refreshTasks } = syncStore;

const TASKS_AUTO_REFRESH_MS = 30_000;
const BOARD_AUTO_REFRESH_MS = 15_000;

const VALID_FILTERS: readonly FilterSection[] = [
  'all',
  'my-tasks',
  'today',
  'upcoming',
  'overdue',
  'completed',
];

const boardId = computed(() => (route.params.boardId ? String(route.params.boardId) : null));

const currentBoard = computed(() => {
  if (!boardId.value) return null;
  return boards.value.find((board) => board.id === boardId.value) || null;
});

const activeView = computed<TaskDisplayView>(() => resolveVisibleViewMode(route.query.view));

const autoRefresh = useAutoRefresh({
  getIntervalMs: () => (boardId.value ? BOARD_AUTO_REFRESH_MS : TASKS_AUTO_REFRESH_MS),
  shouldSkip: () => Boolean(selectedTaskId.value || isNewTaskModalOpen.value || isLoading.value),
  onTick: async () => {
    if (boardId.value) {
      await refreshBoard(boardId.value);
    } else {
      await refreshTasks();
    }
  },
});

watch(
  () => [route.params.boardId, route.query.filter] as const,
  ([rawBoardId, rawFilter]) => {
    const id = rawBoardId ? String(rawBoardId) : null;
    if (id) {
      selectedBoardId.value = id;
      filterSection.value = 'all';
      void refreshBoard(id);
      return;
    }

    selectedBoardId.value = null;
    const candidateFilter = String(rawFilter || 'all') as FilterSection;
    filterSection.value = VALID_FILTERS.includes(candidateFilter) ? candidateFilter : 'all';
    void refreshTasks({ minIntervalMs: 1500 });
  },
  { immediate: true },
);

watch(
  activeView,
  (view) => {
    viewMode.value = view;
  },
  { immediate: true },
);

watch(boardId, () => {
  autoRefresh.restart();
});
</script>

<template>
  <div
    v-if="boardId && !currentBoard && isLoading"
    class="h-full flex flex-col items-center justify-center p-8 text-center bg-modern-bg"
  >
    <RefreshCw class="w-6 h-6 text-modern-primary animate-spin mb-3" />
    <p class="text-xs font-medium text-gray-500">Syncing board data...</p>
  </div>

  <div
    v-else-if="boardId && !currentBoard"
    class="h-full flex flex-col items-center justify-center p-8 text-center bg-modern-bg"
  >
    <div class="p-3 rounded-full bg-rose-50 text-rose-600 mb-3">
      <AlertCircle class="w-6 h-6" />
    </div>
    <h2 class="text-base font-bold text-gray-900">Board not found</h2>
    <p class="text-xs text-gray-500 mt-1 mb-4">
      The requested board could not be found or is no longer connected.
    </p>
    <RouterLink
      :to="{ name: 'dashboard' }"
      class="flex items-center gap-1.5 px-4 py-2 bg-modern-primary text-white text-xs font-semibold rounded-lg hover:bg-modern-hover transition-colors"
    >
      <ArrowLeft class="w-3.5 h-3.5" />
      <span>Back to Dashboard</span>
    </RouterLink>
  </div>

  <template v-else>
    <TaskListView v-if="activeView === 'list'" />
    <TaskCalendarView v-else-if="activeView === 'calendar'" />
    <TaskBoardView v-else />
  </template>
</template>
