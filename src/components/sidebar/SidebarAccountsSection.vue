<script setup lang="ts">
import { RouterLink } from 'vue-router';
import type { ProviderAccount } from '@/types/domain';

defineProps<{
  accounts: ProviderAccount[];
  selectedAccountId: string | null;
}>();

const emit = defineEmits<{
  selectAccount: [accountId: string | null];
}>();
</script>

<template>
  <div v-if="accounts.length > 0">
    <div
      class="px-2 pb-1.5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-gray-400"
    >
      <span>Accounts</span>
      <RouterLink
        to="/settings"
        class="text-[10px] font-normal text-indigo-400 hover:text-indigo-300"
      >
        + Add Key
      </RouterLink>
    </div>
    <nav class="space-y-0.5">
      <button
        v-if="accounts.length > 1"
        type="button"
        @click="emit('selectAccount', null)"
        :class="[
          'w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left transition-colors',
          selectedAccountId === null
            ? 'bg-white/15 text-white font-semibold'
            : 'text-gray-400 hover:bg-modern-sidebar-hover hover:text-white',
        ]"
      >
        <span class="truncate">All Accounts ({{ accounts.length }})</span>
      </button>
      <button
        v-for="acc in accounts"
        :key="acc.id"
        type="button"
        @click="emit('selectAccount', acc.id)"
        :class="[
          'w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left transition-colors',
          selectedAccountId === acc.id
            ? 'bg-white/15 text-white font-semibold'
            : 'text-gray-400 hover:bg-modern-sidebar-hover hover:text-white',
        ]"
      >
        <div class="flex items-center gap-2 truncate">
          <span class="w-2 h-2 rounded-full shrink-0" :style="{ backgroundColor: acc.color }" />
          <span class="truncate">{{ acc.label }}</span>
        </div>
        <span v-if="acc.member" class="text-[10px] text-gray-500 truncate ml-1">
          @{{ acc.member.username }}
        </span>
      </button>
    </nav>
  </div>
</template>
