<script setup lang="ts">
import type { WorkspaceMember } from '@/types/domain';

defineProps<{
  suggestions: WorkspaceMember[];
  selectedIndex: number;
  coords: { top: number; left: number };
}>();

const emit = defineEmits<{
  select: [member: WorkspaceMember];
  hoverIndex: [index: number];
}>();
</script>

<template>
  <div
    v-if="suggestions.length > 0"
    role="listbox"
    aria-label="Mention suggestions"
    :style="{ top: `${coords.top}px`, left: `${coords.left}px` }"
    class="absolute z-40 w-56 bg-white border border-gray-200 rounded-lg shadow-lg py-1 max-h-48 overflow-y-auto"
  >
    <button
      v-for="(member, idx) in suggestions"
      :key="member.id"
      type="button"
      role="option"
      :aria-selected="idx === selectedIndex"
      @mousedown.prevent="emit('select', member)"
      @mouseenter="emit('hoverIndex', idx)"
      :class="[
        'w-full px-2.5 py-1.5 flex items-center gap-2 text-left text-xs transition-colors',
        idx === selectedIndex
          ? 'bg-indigo-50 text-modern-primary'
          : 'text-gray-700 hover:bg-gray-50',
      ]"
    >
      <img
        v-if="member.avatarUrl"
        :src="member.avatarUrl"
        :alt="member.fullName"
        class="w-5 h-5 rounded-full object-cover shrink-0"
      >
      <span
        v-else
        class="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-semibold flex items-center justify-center shrink-0"
      >
        {{ member.initials || member.username.slice(0, 2).toUpperCase() }}
      </span>
      <div class="min-w-0 flex-1">
        <div class="font-medium truncate leading-tight">{{ member.fullName }}</div>
        <div class="text-[10px] text-gray-400 truncate">@{{ member.username }}</div>
      </div>
    </button>
  </div>
</template>
