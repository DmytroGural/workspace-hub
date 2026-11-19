<script setup lang="ts">
import { Check } from 'lucide-vue-next';

withDefaults(
  defineProps<{
    stepNumber: number;
    title: string;
    completed?: boolean;
  }>(),
  {
    completed: false,
  },
);
</script>

<template>
  <div
    :class="[
      'rounded-xl border p-3.5 transition-colors bg-white',
      completed ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-200/90',
    ]"
  >
    <div class="flex items-start gap-3">
      <div
        :class="[
          'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5',
          completed ? 'bg-emerald-500 text-white' : 'bg-indigo-100 text-indigo-700',
        ]"
      >
        <Check v-if="completed" class="w-3.5 h-3.5 stroke-[3]" />
        <span v-else>{{ stepNumber }}</span>
      </div>

      <div class="min-w-0 flex-1 space-y-1.5">
        <div class="flex items-center justify-between gap-2">
          <h5 class="text-xs font-bold text-gray-900">{{ title }}</h5>
          <span
            v-if="completed"
            class="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded shrink-0"
          >
            Ready
          </span>
        </div>

        <slot />
      </div>
    </div>
  </div>
</template>
