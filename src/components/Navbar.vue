<script setup lang="ts">
import {
  Calendar,
  Info,
  Kanban,
  Layers,
  LayoutDashboard,
  ListFilter,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  UserCheck,
  Users,
  X,
} from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { type Component, computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import LexicalMarkdownEditor from '@/components/editor/LexicalMarkdownEditor.vue';
import { useDismissibleLayer } from '@/composables/useDismissibleLayer';
import {
  useAccountsStore,
  useFiltersStore,
  useSyncStore,
  useTasksStore,
  useUIStore,
} from '@/stores';
import type { ViewMode } from '@/types/domain';
import { stripMarkdownToPlainText } from '@/utils/markdownUtils';

const route = useRoute();
const router = useRouter();

// const accountsStore = useAccountsStore();
const tasksStore = useTasksStore();
const filtersStore = useFiltersStore();
const syncStore = useSyncStore();
const uiStore = useUIStore();

// const { enabledAccounts } = storeToRefs(accountsStore);
const { boards, availableLabels } = storeToRefs(tasksStore);
const {
  // selectedAccountId,
  selectedBoardId,
  filterSection,
  searchQuery,
  labelFilter,
  onlyAssignedToMe,
} = storeToRefs(filtersStore);
const { isLoading } = storeToRefs(syncStore);

const { refreshTasks } = syncStore;
const { openNewTaskModal } = uiStore;

const activeTab = computed<ViewMode | ''>(() => {
  if (route.name === 'dashboard') return 'dashboard';
  if (route.name === 'tasks' || route.name === 'board') {
    const q = String(route.query.view || 'list') as ViewMode;
    return ['list', 'board', 'calendar'].includes(q) ? q : 'list';
  }
  return '';
});

function navigateTab(tabId: ViewMode) {
  if (tabId === 'dashboard') {
    router.push({ name: 'dashboard' });
    return;
  }

  if (route.name === 'board' && route.params.boardId) {
    router.push({
      name: 'board',
      params: { boardId: route.params.boardId },
      query: { ...route.query, view: tabId, page: '1' },
    });
    return;
  }

  router.push({
    name: 'tasks',
    query: {
      filter: route.name === 'tasks' ? route.query.filter || 'all' : 'all',
      view: tabId,
      page: '1',
    },
  });
}

const currentBoard = computed(() => {
  if (route.name !== 'board' || !selectedBoardId.value) return null;
  return boards.value.find((item) => item.id === selectedBoardId.value) || null;
});

const boardDescription = computed(() => (currentBoard.value?.desc || '').trim());
const boardDescriptionPreview = computed(() => stripMarkdownToPlainText(boardDescription.value));

const showDescriptionPopover = ref(false);
const descriptionPopoverRef = ref<HTMLElement | null>(null);

useDismissibleLayer({
  containerRef: descriptionPopoverRef,
  isActive: () => showDescriptionPopover.value,
  onDismiss: () => {
    showDescriptionPopover.value = false;
  },
});

watch(
  () => [route.name, selectedBoardId.value],
  () => {
    showDescriptionPopover.value = false;
  },
);

const currentTitle = computed(() => {
  if (route.name === 'settings') {
    return 'Settings & Integrations';
  }
  if (route.name === 'board' && selectedBoardId.value) {
    return currentBoard.value ? currentBoard.value.name : 'Board Tasks';
  }
  if (route.name === 'dashboard') {
    return 'Unified Cross-Board Dashboard';
  }
  if (filterSection.value === 'today') return 'Due Today across all boards';
  if (filterSection.value === 'overdue') return 'Overdue Tasks across all boards';
  if (filterSection.value === 'upcoming') return 'Upcoming Tasks (Next 7 Days)';
  if (filterSection.value === 'completed') return 'Completed Tasks archive';
  return 'All My Tasks (Cross-Board)';
});

const viewTabs: { id: ViewMode; label: string; icon: Component }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'list', label: 'List', icon: ListFilter },
  { id: 'board', label: 'Board', icon: Kanban },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
];
</script>

<template>
  <header class="bg-white border-b border-modern-border shrink-0 select-none">
    <!-- Top Row: Title, Global Search & Quick Actions -->
    <div class="px-6 py-3 flex items-center justify-between gap-4">
      <div class="flex items-center gap-3 min-w-0">
        <div
          class="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 shrink-0"
        >
          <Layers class="w-5 h-5" />
        </div>
        <div class="min-w-0">
          <h1
            class="text-lg font-bold text-gray-900 tracking-tight truncate flex items-center gap-2"
          >
            <span>{{ currentTitle }}</span>
          </h1>
          <div v-if="boardDescription" ref="descriptionPopoverRef" class="relative min-w-0">
            <button
              type="button"
              :aria-expanded="showDescriptionPopover"
              aria-label="Show full board description"
              :title="boardDescriptionPreview"
              @click="showDescriptionPopover = !showDescriptionPopover"
              class="group flex items-center gap-1 max-w-full text-left text-xs text-gray-500 hover:text-gray-800 transition-colors"
            >
              <span class="truncate">{{ boardDescriptionPreview }}</span>
              <Info
                class="w-3 h-3 shrink-0 text-gray-400 group-hover:text-modern-primary transition-colors"
              />
            </button>

            <div
              v-if="showDescriptionPopover"
              role="dialog"
              aria-label="Board description"
              class="absolute left-0 top-full mt-2 z-40 w-96 max-w-[min(28rem,calc(100vw-4rem))] bg-white border border-gray-200 rounded-xl shadow-xl p-4 select-text"
            >
              <div
                class="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-gray-100"
              >
                <span class="text-xs font-semibold text-gray-900 truncate">
                  {{ currentTitle }}
                  — Description
                </span>
                <button
                  type="button"
                  aria-label="Close board description"
                  @click="showDescriptionPopover = false"
                  class="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <X class="w-3.5 h-3.5" />
                </button>
              </div>
              <div class="max-h-64 overflow-y-auto">
                <LexicalMarkdownEditor
                  :model-value="boardDescription"
                  :reset-key="`${currentBoard?.id || ''}-${boardDescription}`"
                  :editable="false"
                  borderless
                />
              </div>
            </div>
          </div>
          <p v-else class="text-xs text-gray-500 truncate">
            Unified modern-style workspace across your connected providers
          </p>
        </div>
      </div>

      <!-- Search & Controls -->
      <div class="flex items-center gap-2.5 shrink-0">
        <!-- Search bar -->
        <div class="relative w-64">
          <Search class="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search cards, labels, boards..."
            class="w-full pl-8 pr-7 py-1.5 text-xs bg-gray-50 hover:bg-gray-100 focus:bg-white border border-gray-200 focus:border-modern-primary focus:ring-1 focus:ring-modern-primary rounded-lg transition-all outline-none"
          >
          <button
            type="button"
            v-if="searchQuery"
            @click="searchQuery = ''"
            class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X class="w-3.5 h-3.5" />
          </button>
        </div>

        <!-- Account filter (shown when multiple accounts enabled) -->
        <!--
        <select
          v-if="enabledAccounts.length > 1"
          :value="selectedAccountId || ''"
          @change="selectedAccountId = ($event.target as HTMLSelectElement).value || null"
          class="text-xs bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 font-medium focus:outline-none focus:border-modern-primary max-w-[160px]"
          title="Filter by account"
        >
          <option value="">All Accounts ({{ enabledAccounts.length }})</option>
          <option v-for="acc in enabledAccounts" :key="acc.id" :value="acc.id">
            {{ acc.label }}
          </option>
        </select>
        -->

        <!-- Filter: "Assigned to me" toggle -->
        <button
          type="button"
          @click="onlyAssignedToMe = !onlyAssignedToMe"
          :class="[
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors',
            onlyAssignedToMe
              ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-semibold'
              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50',
          ]"
          title="Toggle between only your cards vs all cards from boards"
        >
          <UserCheck v-if="onlyAssignedToMe" class="w-3.5 h-3.5 text-indigo-600" />
          <Users v-else class="w-3.5 h-3.5 text-gray-400" />
          <span>{{ onlyAssignedToMe ? 'My Cards Only' : 'All Board Cards' }}</span>
        </button>

        <!-- Refresh button -->
        <button
          type="button"
          @click="refreshTasks"
          :disabled="isLoading"
          class="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-50"
          title="Refresh cross-board tasks"
        >
          <RefreshCw :class="['w-4 h-4', isLoading ? 'animate-spin text-modern-primary' : '']" />
        </button>

        <!-- Add Task Primary Button -->
        <button
          type="button"
          @click="openNewTaskModal()"
          class="flex items-center gap-1.5 px-3 py-1.5 bg-modern-primary hover:bg-modern-hover active:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
        >
          <Plus class="w-4 h-4" />
          <span>Add Task</span>
        </button>
      </div>
    </div>

    <!-- Bottom Row: Asana View Tabs & Quick Filters -->
    <div
      v-if="route.name !== 'settings'"
      class="px-6 flex items-center justify-between border-t border-gray-100"
    >
      <!-- Tabs -->
      <nav class="flex space-x-1 -mb-px">
        <button
          type="button"
          v-for="tab in viewTabs"
          :key="tab.id"
          @click="navigateTab(tab.id)"
          :class="[
            'flex items-center gap-2 py-2.5 px-3 text-xs font-medium border-b-2 transition-all',
            activeTab === tab.id
              ? 'border-modern-primary text-modern-primary font-semibold'
              : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300',
          ]"
        >
          <component :is="tab.icon" class="w-3.5 h-3.5" />
          <span>{{ tab.label }}</span>
        </button>
      </nav>

      <!-- Label Filter Chip -->
      <div class="flex items-center gap-2 py-1.5 text-xs text-gray-500">
        <SlidersHorizontal class="w-3.5 h-3.5 text-gray-400" />
        <span>Label:</span>
        <select
          v-model="labelFilter"
          class="text-xs bg-transparent border border-gray-200 rounded px-2 py-1 text-gray-700 focus:outline-none focus:border-modern-primary max-w-[180px]"
        >
          <option value="all">All Labels</option>
          <option value="__none__">No Label</option>
          <option v-for="lbl in availableLabels" :key="lbl.name" :value="lbl.name">
            {{ lbl.name }}
          </option>
        </select>
      </div>
    </div>
  </header>
</template>
