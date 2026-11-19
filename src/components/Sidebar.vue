<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAccountsStore, useFiltersStore, useProvidersStore, useUIStore } from '@/stores';
import type { FilterSection } from '@/types/domain';
import SidebarAccountsSection from './sidebar/SidebarAccountsSection.vue';
import SidebarBoardsSection from './sidebar/SidebarBoardsSection.vue';
import SidebarHeader from './sidebar/SidebarHeader.vue';
import SidebarPagesNav from './sidebar/SidebarPagesNav.vue';
import SidebarSmartFilters from './sidebar/SidebarSmartFilters.vue';

const route = useRoute();
const router = useRouter();

const accountsStore = useAccountsStore();
const filtersStore = useFiltersStore();
const providersStore = useProvidersStore();
const uiStore = useUIStore();

const { enabledAccounts } = storeToRefs(accountsStore);
const { selectedAccountId, visibleBoards, globalMetrics } = storeToRefs(filtersStore);
const { openNewTaskModal } = uiStore;
const { getProviderName } = providersStore;

const isDashboardActive = computed(() => route.name === 'dashboard');
const isTasksAllActive = computed(
  () => route.name === 'tasks' && (!route.query.filter || route.query.filter === 'all'),
);
const currentFilter = computed(() =>
  route.name === 'tasks' ? String(route.query.filter || 'all') : '',
);
const activeBoardId = computed(() =>
  route.name === 'board' ? String(route.params.boardId || '') : null,
);
const isAllBoardsActive = computed(() => activeBoardId.value === null && route.name === 'tasks');
const uncompletedCount = computed(() => globalMetrics.value.total - globalMetrics.value.completed);

function goToFilter(filter: FilterSection) {
  router.push({
    name: 'tasks',
    query: {
      view: 'list',
      filter,
    },
  });
}
</script>

<template>
  <aside
    class="w-64 bg-modern-sidebar text-gray-300 flex flex-col h-full border-r border-[#2d2e32] select-none shrink-0"
  >
    <SidebarHeader :is-settings-active="route.name === 'settings'" @add-task="openNewTaskModal()" />

    <!-- Main Navigation Section -->
    <div class="flex-1 overflow-y-auto px-2 space-y-6 text-xs">
      <SidebarPagesNav
        :is-dashboard-active="isDashboardActive"
        :is-tasks-all-active="isTasksAllActive"
        :total-tasks-count="globalMetrics.total"
        :uncompleted-count="uncompletedCount"
      />

      <SidebarSmartFilters
        :current-filter="currentFilter"
        :metrics="globalMetrics"
        @select-filter="goToFilter"
      />

      <SidebarBoardsSection
        :boards="visibleBoards"
        :active-board-id="activeBoardId"
        :is-all-boards-active="isAllBoardsActive"
        :total-tasks-count="globalMetrics.total"
        :get-provider-name="getProviderName"
      />
    </div>

    <div
      v-if="enabledAccounts.length"
      class="p-3 border-t border-[#2d2e32] bg-[#1a1b1d] space-y-2 text-xs"
    >
      <SidebarAccountsSection
        :accounts="enabledAccounts"
        :selected-account-id="selectedAccountId"
        @select-account="selectedAccountId = $event"
      />
    </div>
  </aside>
</template>
