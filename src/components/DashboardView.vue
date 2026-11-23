<script setup lang="ts">
import { AlertTriangle, CheckCircle2, Clock, Layers, Sparkles } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import DashboardBoardsHealth from '@/components/dashboard/DashboardBoardsHealth.vue';
import DashboardLabelBreakdown from '@/components/dashboard/DashboardLabelBreakdown.vue';
import DashboardMetricCard from '@/components/dashboard/DashboardMetricCard.vue';
import DashboardUpcomingList from '@/components/dashboard/DashboardUpcomingList.vue';
import DashboardUrgentList from '@/components/dashboard/DashboardUrgentList.vue';
import { useAccountsStore, useFiltersStore, useTasksStore } from '@/stores';
import type { FilterSection } from '@/types/domain';

const router = useRouter();

const accountsStore = useAccountsStore();
const filtersStore = useFiltersStore();
const tasksStore = useTasksStore();

const { enabledAccounts } = storeToRefs(accountsStore);
const { metrics, visibleBoards, filteredTasks } = storeToRefs(filtersStore);
const { selectedTaskId } = storeToRefs(tasksStore);
const { toggleTaskComplete } = tasksStore;

function openTask(taskId: string) {
  selectedTaskId.value = taskId;
}

function drillIntoBoard(boardId: string) {
  router.push({ name: 'board', params: { boardId }, query: { view: 'list' } });
}

function goToTasks(filter: FilterSection = 'all') {
  router.push({ name: 'tasks', query: { view: 'list', filter } });
}

const urgentTasks = computed(() =>
  filteredTasks.value
    .filter((t) => !t.dueComplete && (t.section === 'today' || t.section === 'overdue'))
    .slice(0, 6),
);

const upcomingTasks = computed(() =>
  filteredTasks.value.filter((t) => !t.dueComplete && t.section === 'upcoming').slice(0, 5),
);
</script>

<template>
  <div class="h-full overflow-y-auto p-8 space-y-8 bg-modern-bg">
    <!-- Welcome & Aggregation Banner -->
    <div
      class="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 border border-indigo-700/50"
    >
      <div class="space-y-1.5 max-w-xl">
        <div
          class="flex items-center gap-2 text-indigo-300 text-xs font-semibold uppercase tracking-wider"
        >
          <Sparkles class="w-4 h-4 text-amber-300" />
          <span>Cross-Board Intelligence</span>
        </div>
        <h2 class="text-2xl font-bold tracking-tight text-white">Unified Workspace Dashboard</h2>
        <p class="text-xs text-indigo-200/90 leading-relaxed">
          Aggregating all your active tasks across
          <strong class="text-white">{{ visibleBoards.length }} boards / projects</strong>
          <template v-if="enabledAccounts.length > 1">
            and <strong class="text-white">{{ enabledAccounts.length }} accounts</strong>
          </template
          >. Never lose a task or miss a deadline between separated projects again.
        </p>
      </div>

      <!-- Quick stats summary widget -->
      <div
        class="flex items-center gap-4 bg-white/10 backdrop-blur-md px-5 py-3.5 rounded-xl border border-white/10 shrink-0"
      >
        <div class="text-center">
          <div class="text-2xl font-extrabold text-white">{{ metrics.completionRate }}%</div>
          <div class="text-[11px] text-indigo-200 uppercase tracking-wide">Done Rate</div>
        </div>
        <div class="w-px h-10 bg-white/20" />
        <div class="text-center">
          <div class="text-2xl font-extrabold text-amber-300">{{ metrics.today }}</div>
          <div class="text-[11px] text-indigo-200 uppercase tracking-wide">Due Today</div>
        </div>
        <div class="w-px h-10 bg-white/20" />
        <div class="text-center">
          <div class="text-2xl font-extrabold text-rose-300">{{ metrics.overdue }}</div>
          <div class="text-[11px] text-indigo-200 uppercase tracking-wide">Overdue</div>
        </div>
      </div>
    </div>

    <!-- 4 Key Metric Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <DashboardMetricCard
        title="All My Tasks"
        :value="metrics.total"
        :subtitle="`across ${visibleBoards.length} boards`"
        cta-text="Open in list view"
        :icon="Layers"
        hover-border-class="hover:border-indigo-300"
        icon-container-class="bg-indigo-50 text-indigo-600"
        value-class="text-gray-900"
        cta-class="text-indigo-600"
        @click="goToTasks('all')"
      />
      <DashboardMetricCard
        title="Due Today"
        :value="metrics.today"
        subtitle="cards need attention"
        cta-text="Focus on today"
        :icon="Clock"
        hover-border-class="hover:border-amber-300"
        icon-container-class="bg-amber-50 text-amber-600"
        value-class="text-amber-600"
        cta-class="text-amber-700"
        @click="goToTasks('today')"
      />
      <DashboardMetricCard
        title="Overdue Action"
        :value="metrics.overdue"
        subtitle="behind schedule"
        cta-text="Review overdue tasks"
        :icon="AlertTriangle"
        hover-border-class="hover:border-rose-300"
        icon-container-class="bg-rose-50 text-rose-600"
        value-class="text-rose-600"
        cta-class="text-rose-700"
        @click="goToTasks('overdue')"
      />
      <DashboardMetricCard
        title="Completed"
        :value="metrics.completed"
        :subtitle="`${metrics.completionRate}% progress`"
        cta-text="View completed archive"
        :icon="CheckCircle2"
        hover-border-class="hover:border-emerald-300"
        icon-container-class="bg-emerald-50 text-emerald-600"
        value-class="text-emerald-600"
        subtitle-class="text-emerald-700 font-semibold"
        cta-class="text-emerald-700"
        @click="goToTasks('completed')"
      />
    </div>

    <!-- Main Content Grid: Urgent Focus + Connected Boards Breakdown -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div class="lg:col-span-2 space-y-6">
        <DashboardUrgentList
          :tasks="urgentTasks"
          @open-task="openTask"
          @toggle-complete="toggleTaskComplete"
          @view-all="goToTasks('all')"
        />

        <DashboardUpcomingList
          :tasks="upcomingTasks"
          @open-task="openTask"
          @see-all="goToTasks('upcoming')"
        />
      </div>

      <div class="space-y-6">
        <DashboardBoardsHealth
          :board-stats="metrics.boardStats"
          :show-account-badge="enabledAccounts.length > 1"
          @select-board="drillIntoBoard"
        />

        <DashboardLabelBreakdown :label-counts="metrics.labelCounts" />
      </div>
    </div>
  </div>
</template>
