<script setup lang="ts">
import { AlertTriangle, Layers } from 'lucide-vue-next';
import type { BoardStat } from '@/types/api';

defineProps<{
  boardStats: BoardStat[];
  showAccountBadge: boolean;
}>();

const emit = defineEmits<{
  selectBoard: [boardId: string];
}>();
</script>

<template>
  <div class="bg-white rounded-xl border border-modern-border p-6 shadow-sm space-y-5">
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-bold text-gray-900 flex items-center gap-2">
        <Layers class="w-4 h-4 text-indigo-600" />
        <span>Boards Progress</span>
      </h3>
      <span class="text-xs text-gray-400">{{ boardStats.length }} boards</span>
    </div>

    <div class="space-y-4">
      <button
        type="button"
        v-for="b in boardStats"
        :key="b.id"
        @click="emit('selectBoard', b.id)"
        class="w-full text-left p-3 rounded-lg border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/20 cursor-pointer transition-all group"
      >
        <div class="flex items-center justify-between text-xs mb-1.5">
          <div class="flex items-center gap-2 font-semibold text-gray-800 truncate">
            <span class="w-2.5 h-2.5 rounded-sm shrink-0" :style="{ backgroundColor: b.color }" />
            <span class="truncate group-hover:text-modern-primary">{{ b.name }}</span>
            <span
              v-if="showAccountBadge"
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
</template>
