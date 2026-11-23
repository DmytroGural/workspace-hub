<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next';
import type { Component } from 'vue';

defineProps<{
  title: string;
  value: number;
  subtitle: string;
  ctaText: string;
  icon: Component;
  hoverBorderClass: string;
  iconContainerClass: string;
  valueClass: string;
  subtitleClass?: string;
  ctaClass: string;
}>();

const emit = defineEmits<{
  click: [];
}>();
</script>

<template>
  <button
    type="button"
    @click="emit('click')"
    :class="[
      'w-full text-left bg-white p-5 rounded-xl border border-modern-border hover:shadow-md transition-all cursor-pointer group',
      hoverBorderClass,
    ]"
  >
    <div class="flex items-center justify-between">
      <span class="text-xs font-semibold text-gray-500 uppercase tracking-wide">{{ title }}</span>
      <div
        :class="['p-2 rounded-lg group-hover:scale-110 transition-transform', iconContainerClass]"
      >
        <component :is="icon" class="w-4 h-4" />
      </div>
    </div>
    <div class="mt-3 flex items-baseline gap-2">
      <span :class="['text-3xl font-extrabold', valueClass]">{{ value }}</span>
      <span :class="['text-xs', subtitleClass || 'text-gray-500']">{{ subtitle }}</span>
    </div>
    <div
      :class="[
        'mt-2 text-xs font-medium flex items-center gap-1 group-hover:translate-x-1 transition-transform',
        ctaClass,
      ]"
    >
      <span>{{ ctaText }}</span>
      <ChevronRight class="w-3.5 h-3.5" />
    </div>
  </button>
</template>
