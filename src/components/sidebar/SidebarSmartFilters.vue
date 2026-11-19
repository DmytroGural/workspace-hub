<script setup lang="ts">
import { AlertCircle, Calendar, CheckCircle2, Clock } from 'lucide-vue-next';
import type { Component } from 'vue';
import type { FilterSection } from '@/types/domain';

interface SmartFilterMetrics {
  today: number;
  overdue: number;
  upcoming: number;
  completed: number;
}

interface SmartFilterItem {
  id: Extract<FilterSection, 'today' | 'overdue' | 'upcoming' | 'completed'>;
  label: string;
  icon: Component;
  iconClass: string;
  badgeClass: string;
  hideWhenZero: boolean;
}

const props = defineProps<{
  currentFilter: string;
  metrics: SmartFilterMetrics;
}>();

const emit = defineEmits<{
  selectFilter: [filter: FilterSection];
}>();

const FILTER_ITEMS: SmartFilterItem[] = [
  {
    id: 'today',
    label: 'Due Today',
    icon: Clock,
    iconClass: 'text-amber-400',
    badgeClass: 'font-semibold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300',
    hideWhenZero: true,
  },
  {
    id: 'overdue',
    label: 'Overdue',
    icon: AlertCircle,
    iconClass: 'text-rose-400',
    badgeClass: 'font-semibold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300',
    hideWhenZero: true,
  },
  {
    id: 'upcoming',
    label: 'Next 7 Days',
    icon: Calendar,
    iconClass: 'text-blue-400',
    badgeClass: 'text-gray-400',
    hideWhenZero: true,
  },
  {
    id: 'completed',
    label: 'Completed',
    icon: CheckCircle2,
    iconClass: 'text-teal-400',
    badgeClass: 'text-gray-400',
    hideWhenZero: false,
  },
];

function getCount(id: SmartFilterItem['id']): number {
  return props.metrics[id];
}
</script>

<template>
  <div>
    <div class="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
      Smart Filters
    </div>
    <nav class="space-y-0.5">
      <button
        v-for="item in FILTER_ITEMS"
        :key="item.id"
        type="button"
        @click="emit('selectFilter', item.id)"
        :class="[
          'w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left transition-colors',
          currentFilter === item.id
            ? 'bg-white/15 text-white font-semibold'
            : 'text-gray-400 hover:bg-modern-sidebar-hover hover:text-white',
        ]"
      >
        <div class="flex items-center gap-2">
          <component :is="item.icon" :class="['w-3.5 h-3.5', item.iconClass]" />
          <span>{{ item.label }}</span>
        </div>
        <span
          v-if="!item.hideWhenZero || getCount(item.id) > 0"
          :class="['text-[10px]', item.badgeClass]"
        >
          {{ getCount(item.id) }}
        </span>
      </button>
    </nav>
  </div>
</template>
