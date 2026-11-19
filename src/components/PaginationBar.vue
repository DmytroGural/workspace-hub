<script setup lang="ts">
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-vue-next';
import { computed } from 'vue';

const props = defineProps<{
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
}>();

const emit = defineEmits<{
  (e: 'update:currentPage', page: number): void;
  (e: 'update:pageSize', size: number): void;
}>();

const startItem = computed(() => {
  if (props.totalItems === 0) return 0;
  return (props.currentPage - 1) * props.pageSize + 1;
});

const endItem = computed(() => {
  return Math.min(props.currentPage * props.pageSize, props.totalItems);
});

const visiblePages = computed<(number | '...')[]>(() => {
  const total = props.totalPages;
  const curr = props.currentPage;
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | '...')[] = [1];
  if (curr > 3) pages.push('...');

  const start = Math.max(2, curr - 1);
  const end = Math.min(total - 1, curr + 1);
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (curr < total - 2) pages.push('...');
  pages.push(total);
  return pages;
});

function goTo(page: number) {
  if (page < 1 || page > props.totalPages || page === props.currentPage) return;
  emit('update:currentPage', page);
}

function handleSizeChange(e: Event) {
  const val = Number((e.target as HTMLSelectElement).value);
  emit('update:pageSize', val);
}
</script>

<template>
  <div
    class="px-6 py-3 bg-white border-t border-gray-200 flex flex-wrap items-center justify-between gap-4 text-xs text-gray-600 select-none shrink-0"
  >
    <!-- Left: Range summary & page size -->
    <div class="flex items-center gap-4">
      <span>
        Showing
        <strong class="text-gray-900">{{ startItem }}–{{ endItem }}</strong>
        of
        <strong class="text-gray-900">{{ totalItems }}</strong>
        tasks
      </span>

      <div class="flex items-center gap-1.5">
        <label for="pagination-page-size" class="text-gray-400">Per page:</label>
        <select
          id="pagination-page-size"
          :value="pageSize"
          @change="handleSizeChange"
          class="bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs text-gray-800 focus:outline-none focus:border-modern-primary font-medium"
        >
          <option :value="5">5</option>
          <option :value="10">10</option>
          <option :value="25">25</option>
          <option :value="50">50</option>
        </select>
      </div>
    </div>

    <!-- Right: Page buttons -->
    <div class="flex items-center gap-1">
      <button
        type="button"
        @click="goTo(1)"
        :disabled="currentPage <= 1"
        class="p-1.5 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        title="First page"
      >
        <ChevronsLeft class="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        @click="goTo(currentPage - 1)"
        :disabled="currentPage <= 1"
        class="p-1.5 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        title="Previous page"
      >
        <ChevronLeft class="w-3.5 h-3.5" />
      </button>

      <template v-for="(p, idx) in visiblePages" :key="idx">
        <span v-if="p === '...'" class="px-2 text-gray-400">...</span>
        <button
          v-else
          type="button"
          @click="goTo(p)"
          :class="[
            'min-w-[28px] h-7 px-2 rounded-md font-semibold transition-colors border',
            p === currentPage
              ? 'bg-modern-primary text-white border-modern-primary shadow-sm'
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50',
          ]"
        >
          {{ p }}
        </button>
      </template>

      <button
        type="button"
        @click="goTo(currentPage + 1)"
        :disabled="currentPage >= totalPages"
        class="p-1.5 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        title="Next page"
      >
        <ChevronRight class="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        @click="goTo(totalPages)"
        :disabled="currentPage >= totalPages"
        class="p-1.5 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        title="Last page"
      >
        <ChevronsRight class="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
</template>
