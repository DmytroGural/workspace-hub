<script setup lang="ts">
import { CheckCircle2, LayoutDashboard } from 'lucide-vue-next';
import { RouterLink } from 'vue-router';

defineProps<{
  isDashboardActive: boolean;
  isTasksAllActive: boolean;
  totalTasksCount: number;
  uncompletedCount: number;
}>();
</script>

<template>
  <div>
    <div class="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
      Pages
    </div>
    <nav class="space-y-0.5">
      <!-- Cross-Board Dashboard -->
      <RouterLink
        to="/dashboard"
        :class="[
          'w-full flex items-center justify-between px-2.5 py-2 rounded-md font-medium transition-colors text-left',
          isDashboardActive
            ? 'bg-modern-primary text-white shadow-sm'
            : 'text-gray-300 hover:bg-modern-sidebar-hover hover:text-white',
        ]"
      >
        <div class="flex items-center gap-2.5">
          <LayoutDashboard class="w-4 h-4" />
          <span>Cross-Board Dashboard</span>
        </div>
        <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 text-white font-bold">
          {{ totalTasksCount }}
        </span>
      </RouterLink>

      <!-- My Tasks (Asana Core) -->
      <RouterLink
        :to="{ name: 'tasks', query: { view: 'list', filter: 'all' } }"
        :class="[
          'w-full flex items-center justify-between px-2.5 py-2 rounded-md font-medium transition-colors text-left',
          isTasksAllActive
            ? 'bg-white/15 text-white font-semibold'
            : 'text-gray-300 hover:bg-modern-sidebar-hover hover:text-white',
        ]"
      >
        <div class="flex items-center gap-2.5">
          <CheckCircle2 class="w-4 h-4 text-emerald-400" />
          <span>All My Tasks</span>
        </div>
        <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-700 text-gray-300">
          {{ uncompletedCount }}
        </span>
      </RouterLink>
    </nav>
  </div>
</template>
