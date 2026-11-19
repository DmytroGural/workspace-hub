<script setup lang="ts">
import {
  AlertTriangle,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Flame,
  Layers,
  Sparkles,
  TrendingUp,
} from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import TaskCompleteButton from '@/components/task-views/TaskCompleteButton.vue';
import TaskLabelsList from '@/components/task-views/TaskLabelsList.vue';
import { useAccountsStore, useFiltersStore, useTasksStore } from '@/stores';
import type { FilterSection } from '@/types/domain';
import { formatShortDueDate } from '@/utils/dateUtils';
import {
  getLabelDotClass,
  getLabelDotStyle,
  getLabelPillClass,
  getLabelPillStyle,
} from '@/utils/labelColors';

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

function viewAllToday() {
  goToTasks('today');
}

function viewAllOverdue() {
  goToTasks('overdue');
}

const urgentTasks = computed(() => {
  return filteredTasks.value
    .filter((t) => !t.dueComplete && (t.section === 'today' || t.section === 'overdue'))
    .slice(0, 6);
});

const upcomingTasks = computed(() => {
  return filteredTasks.value.filter((t) => !t.dueComplete && t.section === 'upcoming').slice(0, 5);
});

function formatDue(dateStr: string | null): string {
  return formatShortDueDate(dateStr, 'No due date');
}
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

    <!-- 4 Key Metric Cards (Executive Style) -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Total Active Tasks -->
      <button
        type="button"
        @click="goToTasks('all')"
        class="w-full text-left bg-white p-5 rounded-xl border border-modern-border hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-gray-500 uppercase tracking-wide"
            >All My Tasks</span
          >
          <div
            class="p-2 rounded-lg bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform"
          >
            <Layers class="w-4 h-4" />
          </div>
        </div>
        <div class="mt-3 flex items-baseline gap-2">
          <span class="text-3xl font-extrabold text-gray-900">{{ metrics.total }}</span>
          <span class="text-xs text-gray-500">across {{ visibleBoards.length }} boards</span>
        </div>
        <div
          class="mt-2 text-xs text-indigo-600 font-medium flex items-center gap-1 group-hover:translate-x-1 transition-transform"
        >
          <span>Open in list view</span>
          <ChevronRight class="w-3.5 h-3.5" />
        </div>
      </button>

      <!-- Due Today -->
      <button
        type="button"
        @click="viewAllToday"
        class="w-full text-left bg-white p-5 rounded-xl border border-modern-border hover:border-amber-300 hover:shadow-md transition-all cursor-pointer group"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Due Today</span>
          <div
            class="p-2 rounded-lg bg-amber-50 text-amber-600 group-hover:scale-110 transition-transform"
          >
            <Clock class="w-4 h-4" />
          </div>
        </div>
        <div class="mt-3 flex items-baseline gap-2">
          <span class="text-3xl font-extrabold text-amber-600">{{ metrics.today }}</span>
          <span class="text-xs text-gray-500">cards need attention</span>
        </div>
        <div
          class="mt-2 text-xs text-amber-700 font-medium flex items-center gap-1 group-hover:translate-x-1 transition-transform"
        >
          <span>Focus on today</span>
          <ChevronRight class="w-3.5 h-3.5" />
        </div>
      </button>

      <!-- Overdue Tasks -->
      <button
        type="button"
        @click="viewAllOverdue"
        class="w-full text-left bg-white p-5 rounded-xl border border-modern-border hover:border-rose-300 hover:shadow-md transition-all cursor-pointer group"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-gray-500 uppercase tracking-wide"
            >Overdue Action</span
          >
          <div
            class="p-2 rounded-lg bg-rose-50 text-rose-600 group-hover:scale-110 transition-transform"
          >
            <AlertTriangle class="w-4 h-4" />
          </div>
        </div>
        <div class="mt-3 flex items-baseline gap-2">
          <span class="text-3xl font-extrabold text-rose-600">{{ metrics.overdue }}</span>
          <span class="text-xs text-gray-500">behind schedule</span>
        </div>
        <div
          class="mt-2 text-xs text-rose-700 font-medium flex items-center gap-1 group-hover:translate-x-1 transition-transform"
        >
          <span>Review overdue tasks</span>
          <ChevronRight class="w-3.5 h-3.5" />
        </div>
      </button>

      <!-- Completed Tasks -->
      <button
        type="button"
        @click="goToTasks('completed')"
        class="w-full text-left bg-white p-5 rounded-xl border border-modern-border hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer group"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Completed</span>
          <div
            class="p-2 rounded-lg bg-emerald-50 text-emerald-600 group-hover:scale-110 transition-transform"
          >
            <CheckCircle2 class="w-4 h-4" />
          </div>
        </div>
        <div class="mt-3 flex items-baseline gap-2">
          <span class="text-3xl font-extrabold text-emerald-600">{{ metrics.completed }}</span>
          <span class="text-xs text-emerald-700 font-semibold"
            >{{ metrics.completionRate }}% progress</span
          >
        </div>
        <div
          class="mt-2 text-xs text-emerald-700 font-medium flex items-center gap-1 group-hover:translate-x-1 transition-transform"
        >
          <span>View completed archive</span>
          <ChevronRight class="w-3.5 h-3.5" />
        </div>
      </button>
    </div>

    <!-- Main Content Grid: Urgent Focus + Connected Boards Breakdown -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Left 2 Cols: Immediate Action & Today's Focus List -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Urgent / Today's Action Card -->
        <div class="bg-white rounded-xl border border-modern-border overflow-hidden shadow-sm">
          <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <Flame class="w-4 h-4 text-rose-500" />
              <h3 class="text-sm font-bold text-gray-900">Urgent & Today's Action Items</h3>
              <span class="text-xs px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-semibold">
                {{ urgentTasks.length }}
                urgent
              </span>
            </div>
            <button
              type="button"
              @click="goToTasks('all')"
              class="text-xs font-medium text-modern-primary hover:underline flex items-center gap-1"
            >
              <span>View all list</span>
              <ArrowUpRight class="w-3.5 h-3.5" />
            </button>
          </div>

          <div v-if="urgentTasks.length === 0" class="p-8 text-center text-gray-400 text-xs">
            🎉 Amazing job! No overdue or urgent tasks pending today.
          </div>

          <div v-else class="divide-y divide-gray-100">
            <div
              v-for="task in urgentTasks"
              :key="task.id"
              role="button"
              tabindex="0"
              @click="openTask(task.id)"
              @keydown.enter.prevent="openTask(task.id)"
              @keydown.space.prevent="openTask(task.id)"
              class="px-6 py-3.5 hover:bg-gray-50 flex items-center justify-between gap-4 cursor-pointer transition-colors group"
            >
              <div class="flex items-center gap-3.5 min-w-0 flex-1">
                <TaskCompleteButton
                  :completed="task.dueComplete"
                  @toggle="toggleTaskComplete(task)"
                />

                <div class="min-w-0">
                  <div
                    :class="[
                      'text-xs font-medium text-gray-800 truncate group-hover:text-modern-primary transition-colors',
                      task.dueComplete ? 'line-through text-gray-400' : '',
                    ]"
                  >
                    {{ task.name }}
                  </div>
                  <!-- Board badge & list badge -->
                  <div class="flex items-center gap-2 mt-1">
                    <span
                      class="text-[10px] px-1.5 py-0.5 rounded font-medium text-white shrink-0"
                      :style="{ backgroundColor: task.boardColor }"
                    >
                      {{ task.boardName }}
                    </span>
                    <span class="text-[10px] text-gray-400 truncate"> • {{ task.listName }} </span>
                  </div>
                </div>
              </div>

              <!-- Due Date & Labels -->
              <div class="flex items-center gap-2 shrink-0">
                <TaskLabelsList
                  :labels="task.labels"
                  :max-visible="2"
                  max-width-class="max-w-[100px]"
                />

                <div
                  :class="[
                    'text-[11px] font-medium flex items-center gap-1',
                    task.section === 'overdue' ? 'text-rose-600 font-bold' : 'text-gray-500',
                  ]"
                >
                  <Clock class="w-3.5 h-3.5" />
                  <span>{{ formatDue(task.due) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Upcoming Next 7 Days Preview -->
        <div class="bg-white rounded-xl border border-modern-border p-6 shadow-sm">
          <div class="flex items-center justify-between pb-4 border-b border-gray-100">
            <div class="flex items-center gap-2">
              <Calendar class="w-4 h-4 text-blue-500" />
              <h3 class="text-sm font-bold text-gray-900">Upcoming This Week</h3>
            </div>
            <button
              type="button"
              @click="goToTasks('upcoming')"
              class="text-xs text-modern-primary hover:underline"
            >
              See all
            </button>
          </div>

          <div v-if="upcomingTasks.length === 0" class="py-6 text-center text-gray-400 text-xs">
            No upcoming tasks scheduled for the next 7 days.
          </div>

          <div v-else class="mt-4 space-y-2.5">
            <button
              type="button"
              v-for="task in upcomingTasks"
              :key="task.id"
              @click="openTask(task.id)"
              class="w-full text-left flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 cursor-pointer transition-all"
            >
              <div class="flex items-center gap-3 min-w-0">
                <span
                  class="w-2.5 h-2.5 rounded-full shrink-0"
                  :style="{ backgroundColor: task.boardColor }"
                />
                <span class="text-xs text-gray-800 font-medium truncate">{{ task.name }}</span>
              </div>
              <div class="text-[11px] text-gray-500 shrink-0">
                {{ formatDue(task.due) }}
              </div>
            </button>
          </div>
        </div>
      </div>

      <!-- Right 1 Col: Connected Boards Health & Priorities -->
      <div class="space-y-6">
        <!-- Boards Health Card -->
        <div class="bg-white rounded-xl border border-modern-border p-6 shadow-sm space-y-5">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Layers class="w-4 h-4 text-indigo-600" />
              <span>Boards Progress</span>
            </h3>
            <span class="text-xs text-gray-400">{{ metrics.boardStats.length }} boards</span>
          </div>

          <div class="space-y-4">
            <button
              type="button"
              v-for="b in metrics.boardStats"
              :key="b.id"
              @click="drillIntoBoard(b.id)"
              class="w-full text-left p-3 rounded-lg border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/20 cursor-pointer transition-all group"
            >
              <div class="flex items-center justify-between text-xs mb-1.5">
                <div class="flex items-center gap-2 font-semibold text-gray-800 truncate">
                  <span
                    class="w-2.5 h-2.5 rounded-sm shrink-0"
                    :style="{ backgroundColor: b.color }"
                  />
                  <span class="truncate group-hover:text-modern-primary">{{ b.name }}</span>
                  <span
                    v-if="enabledAccounts.length > 1"
                    class="text-[9px] px-1.5 py-0.5 rounded-full font-medium shrink-0 border"
                    :style="{
                      color: b.accountColor,
                      borderColor: `${b.accountColor}40`,
                      backgroundColor: `${b.accountColor}12`,
                    }"
                  >
                    {{ b.accountLabel }}
                  </span>
                </div>
                <span class="text-gray-500 font-medium shrink-0 ml-2">
                  {{ b.completed }}/{{ b.total }}
                </span>
              </div>

              <!-- Progress bar -->
              <div class="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-500"
                  :style="{
                    width: `${b.total > 0 ? (b.completed / b.total) * 100 : 0}%`,
                    backgroundColor: b.color,
                  }"
                />
              </div>

              <div
                v-if="b.overdue > 0"
                class="mt-1.5 text-[10px] text-rose-600 font-semibold flex items-center gap-1"
              >
                <AlertTriangle class="w-3 h-3" />
                <span>{{ b.overdue }} overdue card{{ b.overdue > 1 ? 's' : '' }}</span>
              </div>
            </button>
          </div>
        </div>

        <!-- Label Breakdown Widget -->
        <div class="bg-white rounded-xl border border-modern-border p-6 shadow-sm space-y-4">
          <h3 class="text-sm font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp class="w-4 h-4 text-emerald-600" />
            <span>Open Workload by Label</span>
          </h3>

          <div
            v-if="metrics.labelCounts.length > 0"
            class="space-y-2 text-xs max-h-56 overflow-y-auto pr-1"
          >
            <div
              v-for="item in metrics.labelCounts"
              :key="item.name"
              :class="[
                'flex items-center justify-between p-2 rounded border font-medium',
                getLabelPillClass(item.color),
              ]"
              :style="getLabelPillStyle(item.color)"
            >
              <span class="flex items-center gap-1.5 truncate pr-2">
                <span
                  :class="['w-2 h-2 rounded-full shrink-0', getLabelDotClass(item.color)]"
                  :style="getLabelDotStyle(item.color)"
                />
                <span class="truncate">{{ item.name }}</span>
              </span>
              <span class="font-bold shrink-0">{{ item.count }}</span>
            </div>
          </div>

          <div v-else class="text-xs text-gray-400 italic py-4 text-center">
            No labeled open tasks across selected boards
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
