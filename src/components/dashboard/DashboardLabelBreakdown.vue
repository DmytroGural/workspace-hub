<script setup lang="ts">
import { TrendingUp } from 'lucide-vue-next';
import type { LabelStat } from '@/types/api';
import {
  getLabelDotClass,
  getLabelDotStyle,
  getLabelPillClass,
  getLabelPillStyle,
} from '@/utils/labelColors';

defineProps<{
  labelCounts: LabelStat[];
}>();
</script>

<template>
  <div class="bg-white rounded-xl border border-modern-border p-6 shadow-sm space-y-4">
    <h3 class="text-sm font-bold text-gray-900 flex items-center gap-2">
      <TrendingUp class="w-4 h-4 text-emerald-600" />
      <span>Open Workload by Label</span>
    </h3>

    <div v-if="labelCounts.length > 0" class="space-y-2 text-xs max-h-56 overflow-y-auto pr-1">
      <div
        v-for="item in labelCounts"
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
</template>
