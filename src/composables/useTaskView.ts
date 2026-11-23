import { storeToRefs } from 'pinia';
import { computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  useAccountsStore,
  useFiltersStore,
  useProvidersStore,
  useTasksStore,
  useUIStore,
} from '@/stores';
import type { TaskInterface } from '@/types/domain';

/**
 * Shared state and actions for all task presentation views (List, Board, Calendar).
 */
export function useTaskView() {
  const accountsStore = useAccountsStore();
  const tasksStore = useTasksStore();
  const filtersStore = useFiltersStore();
  const providersStore = useProvidersStore();
  const uiStore = useUIStore();

  const { enabledAccounts } = storeToRefs(accountsStore);
  const { lists, selectedTaskId } = storeToRefs(tasksStore);
  const { selectedBoardId, filteredTasks, sortedFilteredTasks } = storeToRefs(filtersStore);

  const { toggleTaskComplete, updateTask } = tasksStore;
  const { getTaskCapabilities } = providersStore;

  const isBoardScoped = computed(() => Boolean(selectedBoardId.value));
  const showAccountBadge = computed(() => enabledAccounts.value.length > 1);

  function openTask(taskId: string) {
    selectedTaskId.value = taskId;
  }

  function openCreateTask(target?: { id?: string; idBoard?: string; idList?: string } | string) {
    if (!target) {
      uiStore.openNewTaskModal({ idBoard: selectedBoardId.value });
      return;
    }

    if (typeof target === 'string') {
      const matched = lists.value.find((l) => l.id === target);
      uiStore.openNewTaskModal({
        idBoard: matched?.idBoard || selectedBoardId.value,
        idList: target,
      });
      return;
    }

    const listId =
      target.idList || (lists.value.some((l) => l.id === target.id) ? target.id : undefined);
    const matched = listId ? lists.value.find((l) => l.id === listId) : undefined;
    const boardId = target.idBoard || matched?.idBoard || selectedBoardId.value;

    uiStore.openNewTaskModal({
      idBoard: boardId,
      idList: listId,
    });
  }

  function canMoveTask(task: TaskInterface): boolean {
    return isBoardScoped.value && getTaskCapabilities(task).canMoveBetweenLists;
  }

  async function moveTaskToList(
    taskId: string,
    targetListId: string,
    targetPos?: number,
  ): Promise<void> {
    if (!isBoardScoped.value || !taskId) return;
    const task = filteredTasks.value.find((item) => item.id === taskId);
    if (!task || !canMoveTask(task)) return;

    const listChanged = task.idList !== targetListId;
    const posChanged = targetPos !== undefined && targetPos !== task.pos;
    if (!listChanged && !posChanged) return;

    const updates: Partial<TaskInterface> = {};
    if (listChanged) updates.idList = targetListId;
    if (targetPos !== undefined && (listChanged || posChanged)) {
      updates.pos = targetPos;
    }
    await updateTask(task.id, updates);
  }

  return {
    tasks: filteredTasks,
    sortedTasks: sortedFilteredTasks,
    lists,
    selectedBoardId,
    selectedTaskId,
    isBoardScoped,
    showAccountBadge,
    openTask,
    openCreateTask,
    toggleTaskComplete,
    canMoveTask,
    moveTaskToList,
  };
}

/**
 * Route-synchronized pagination state for paginated task views.
 */
export function useTaskPagination() {
  const route = useRoute();
  const router = useRouter();
  const filtersStore = useFiltersStore();

  const { sortedFilteredTasks, paginatedTasks, currentPage, pageSize, totalPages } =
    storeToRefs(filtersStore);
  const { setPage, setPageSize } = filtersStore;

  watch(
    () => route.query.page,
    (val) => {
      const num = Number(val);
      if (num && num >= 1 && num !== currentPage.value) {
        setPage(num);
      }
    },
    { immediate: true },
  );

  function handlePageUpdate(page: number) {
    setPage(page);
    router.replace({ query: { ...route.query, page: String(page) } });
  }

  function handlePageSizeUpdate(size: number) {
    setPageSize(size);
    router.replace({ query: { ...route.query, page: '1' } });
  }

  const totalTasks = computed(() => sortedFilteredTasks.value.length);

  return {
    paginatedTasks,
    totalTasks,
    currentPage,
    pageSize,
    totalPages,
    handlePageUpdate,
    handlePageSizeUpdate,
  };
}
