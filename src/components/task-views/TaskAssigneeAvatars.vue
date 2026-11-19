<script setup lang="ts">
import { computed } from 'vue';
import type { WorkspaceMember } from '@/types/domain';
import { DEFAULT_AVATAR_URL } from '@/utils/taskPresentation';

const props = withDefaults(
  defineProps<{
    members: WorkspaceMember[];
    maxVisible?: number;
    ringClass?: string;
    showEmptyPlaceholder?: boolean;
  }>(),
  {
    maxVisible: 2,
    ringClass: 'ring-1 ring-white',
    showEmptyPlaceholder: false,
  },
);

const visibleMembers = computed(() => props.members.slice(0, props.maxVisible));
</script>

<template>
  <div v-if="visibleMembers.length > 0" class="flex -space-x-1.5">
    <img
      v-for="member in visibleMembers"
      :key="member.id"
      :src="member.avatarUrl || DEFAULT_AVATAR_URL"
      :alt="member.fullName"
      :title="member.fullName"
      :class="['w-5 h-5 rounded-full object-cover', ringClass]"
    >
  </div>
  <span v-else-if="showEmptyPlaceholder" class="text-[10px] text-gray-300">-</span>
</template>
