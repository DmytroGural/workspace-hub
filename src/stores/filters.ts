import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { storageService } from '@/services/StorageService';
import { taskService } from '@/services/TaskService';
import type { FilterSection, ViewMode } from '@/types/domain';
import { useAccountsStore } from './accounts';
import { useTasksStore } from './tasks';

export const useFiltersStore = defineStore('filters', () => {
  const accountsStore = useAccountsStore();
  const tasksStore = useTasksStore();

  const viewMode = ref<ViewMode>('dashboard');
  const selectedAccountId = ref<string | null>(null);
  const selectedBoardId = ref<string | null>(null);
  const filterSection = ref<FilterSection>('all');
  const searchQuery = ref<string>('');
  const labelFilter = ref<string>('all');
  const onlyAssignedToMe = ref<boolean>(storageService.loadOnlyAssignedToMe(true));

  const currentPage = ref<number>(1);
  const pageSize = ref<number>(storageService.loadPageSize(10));

  const visibleBoards = computed(() => {
    const accId = selectedAccountId.value;
    if (!accId) return tasksStore.boards;
    return tasksStore.boards.filter(
      (b) => b.accountId === accId || Boolean(b.accountIds?.includes(accId)),
    );
  });

  const filteredTasks = computed(() =>
    taskService.filterTasks(tasksStore.tasks, {
      selectedAccountId: selectedAccountId.value,
      selectedBoardId: selectedBoardId.value,
      filterSection: filterSection.value,
      labelFilter: labelFilter.value,
      searchQuery: searchQuery.value,
      onlyAssignedToMe: onlyAssignedToMe.value,
      myMemberIds: accountsStore.myMemberIds,
      myUsernames: accountsStore.myUsernames,
    }),
  );

  const sortedFilteredTasks = computed(() => taskService.sortTasks(filteredTasks.value));

  const totalPages = computed(() =>
    Math.max(1, Math.ceil(sortedFilteredTasks.value.length / pageSize.value)),
  );

  const paginatedTasks = computed(() =>
    taskService.paginateTasks(sortedFilteredTasks.value, currentPage.value, pageSize.value),
  );

  const metrics = computed(() =>
    taskService.computeMetrics(tasksStore.tasks, visibleBoards.value, {
      selectedAccountId: selectedAccountId.value,
      selectedBoardId: selectedBoardId.value,
      onlyAssignedToMe: onlyAssignedToMe.value,
      myMemberIds: accountsStore.myMemberIds,
      myUsernames: accountsStore.myUsernames,
    }),
  );

  const globalMetrics = computed(() =>
    taskService.computeGlobalMetrics(tasksStore.tasks, {
      selectedAccountId: selectedAccountId.value,
      onlyAssignedToMe: onlyAssignedToMe.value,
      myMemberIds: accountsStore.myMemberIds,
      myUsernames: accountsStore.myUsernames,
    }),
  );

  watch(
    [
      selectedAccountId,
      selectedBoardId,
      filterSection,
      searchQuery,
      labelFilter,
      onlyAssignedToMe,
      pageSize,
    ],
    () => {
      currentPage.value = 1;
    },
  );

  watch(totalPages, (newTotal) => {
    if (currentPage.value > newTotal) {
      currentPage.value = newTotal;
    }
  });

  watch(onlyAssignedToMe, (val) => {
    storageService.saveOnlyAssignedToMe(val);
  });

  function setPage(page: number) {
    currentPage.value = Math.min(Math.max(1, page), totalPages.value);
  }

  function setPageSize(size: number) {
    pageSize.value = size;
    storageService.savePageSize(size);
    currentPage.value = 1;
  }

  function toggleOnlyAssignedToMe() {
    onlyAssignedToMe.value = !onlyAssignedToMe.value;
  }

  function resetFilters() {
    selectedAccountId.value = null;
    selectedBoardId.value = null;
    filterSection.value = 'all';
    searchQuery.value = '';
    labelFilter.value = 'all';
    onlyAssignedToMe.value = storageService.loadOnlyAssignedToMe(true);
    currentPage.value = 1;
  }

  return {
    viewMode,
    selectedAccountId,
    selectedBoardId,
    filterSection,
    searchQuery,
    labelFilter,
    onlyAssignedToMe,
    currentPage,
    pageSize,
    visibleBoards,
    filteredTasks,
    sortedFilteredTasks,
    totalPages,
    paginatedTasks,
    metrics,
    globalMetrics,
    setPage,
    setPageSize,
    toggleOnlyAssignedToMe,
    resetFilters,
  };
});
