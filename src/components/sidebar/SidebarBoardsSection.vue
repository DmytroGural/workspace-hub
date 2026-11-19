<script setup lang="ts">
import { ExternalLink, Layers } from 'lucide-vue-next';
import { RouterLink } from 'vue-router';
import type { ProviderId, TaskBoard } from '@/types/domain';

defineProps<{
  boards: TaskBoard[];
  activeBoardId: string | null;
  isAllBoardsActive: boolean;
  totalTasksCount: number;
  getProviderName: (provider: ProviderId) => string;
}>();
</script>

<template>
  <div>
    <div
      class="px-2 pb-1.5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-gray-400"
    >
      <span>Connected Boards</span>
      <span class="text-[10px] font-normal text-gray-400 lowercase">
        {{ boards.length }}
        total
      </span>
    </div>

    <nav class="space-y-0.5">
      <!-- All Boards Aggregated -->
      <RouterLink
        :to="{ name: 'tasks', query: { view: 'list', filter: 'all' } }"
        :class="[
          'w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left transition-colors',
          isAllBoardsActive
            ? 'bg-white/15 text-white font-semibold'
            : 'text-gray-400 hover:bg-modern-sidebar-hover hover:text-white',
        ]"
      >
        <div class="flex items-center gap-2 truncate">
          <Layers class="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span class="truncate">All Boards &amp; Projects</span>
        </div>
        <span class="text-[10px] text-gray-400 shrink-0">{{ totalTasksCount }}</span>
      </RouterLink>

      <!-- Individual Boards -->
      <RouterLink
        v-for="board in boards"
        :key="board.id"
        :to="{ name: 'board', params: { boardId: board.id }, query: { view: 'board' } }"
        :class="[
          'w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left transition-colors group',
          activeBoardId === board.id
            ? 'bg-white/15 text-white font-semibold'
            : 'text-gray-400 hover:bg-modern-sidebar-hover hover:text-white',
        ]"
        :title="`${board.name} (${board.accountLabel})`"
      >
        <div class="flex items-center gap-2 truncate">
          <span
            class="w-2.5 h-2.5 rounded-sm shrink-0"
            :style="{ backgroundColor: board.prefs?.backgroundColor || '#4573d2' }"
          />
          <span class="truncate">{{ board.name }}</span>
        </div>
        <a
          v-if="board.url"
          :href="board.url"
          target="_blank"
          rel="noopener noreferrer"
          @click.stop
          class="opacity-0 group-hover:opacity-100 hover:text-white text-gray-500 p-0.5"
          :title="`Open in ${getProviderName(board.provider)}`"
        >
          <ExternalLink class="w-3 h-3" />
        </a>
      </RouterLink>
    </nav>
  </div>
</template>
