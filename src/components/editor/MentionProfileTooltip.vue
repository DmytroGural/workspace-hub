<script setup lang="ts">
import type { WorkspaceMember } from '@/types/domain';

defineProps<{
  tooltip: { member: WorkspaceMember; top: number; left: number } | null;
}>();
</script>

<template>
  <div
    v-if="tooltip"
    role="tooltip"
    :style="{ top: `${tooltip.top}px`, left: `${tooltip.left}px` }"
    class="absolute z-40 w-60 bg-white border border-gray-200 rounded-xl shadow-xl p-3 flex items-center gap-2.5"
  >
    <img
      v-if="tooltip.member.avatarUrl"
      :src="tooltip.member.avatarUrl"
      :alt="tooltip.member.fullName"
      class="w-9 h-9 rounded-full object-cover shrink-0 border border-gray-200"
    >
    <span
      v-else
      class="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0"
    >
      {{ tooltip.member.initials || tooltip.member.username.slice(0, 2).toUpperCase() }}
    </span>
    <div class="min-w-0 flex-1">
      <div class="text-xs font-semibold text-gray-900 truncate">
        {{ tooltip.member.fullName }}
      </div>
      <div class="text-[11px] text-modern-primary font-medium truncate">
        @{{ tooltip.member.username }}
      </div>
      <div class="text-[10px] text-gray-400 font-mono truncate mt-0.5">
        ID: {{ tooltip.member.id }}
      </div>
    </div>
  </div>
</template>
