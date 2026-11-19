<script setup lang="ts">
import { ArrowRight, CheckCircle2, KeyRound, Layers, ShieldCheck, Sparkles } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import { useProvidersStore, useUIStore } from '@/stores';

const providersStore = useProvidersStore();
const uiStore = useUIStore();

const { availableProviders } = storeToRefs(providersStore);

const providerNames = computed(() => {
  const names = availableProviders.value.map((p) => p.name);
  return names.length > 0 ? names.join(', ') : 'supported task managers';
});

function openConnectModal() {
  uiStore.openSettingsModal();
}
</script>

<template>
  <div class="flex-1 h-full overflow-y-auto bg-modern-bg flex items-center justify-center p-6">
    <div
      class="max-w-xl w-full bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden"
    >
      <!-- Top Brand Banner -->
      <div
        class="px-8 pt-8 pb-6 border-b border-gray-100 bg-gradient-to-br from-slate-50 via-white to-indigo-50/40"
      >
        <div class="flex items-center gap-3 mb-4">
          <div
            class="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-indigo-600 flex items-center justify-center shadow-md"
          >
            <Sparkles class="w-5 h-5 text-white" />
          </div>
          <div>
            <div class="text-base font-bold text-gray-900 tracking-tight flex items-center gap-2">
              Workspace Hub
            </div>
            <p class="text-xs text-gray-500">All your boards & tasks in a modern-style workspace</p>
          </div>
        </div>

        <h1 class="text-2xl font-bold text-gray-900 tracking-tight">
          Connect a workspace account to continue
        </h1>
        <p class="text-sm text-gray-600 mt-2 leading-relaxed">
          No workspace account is connected yet. Connect an integration ({{ providerNames }}) to
          load your boards, projects, lists, labels, assignees, and comments.
        </p>
      </div>

      <!-- Features / Trust Info -->
      <div class="p-8 space-y-6">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div class="p-3.5 rounded-xl bg-gray-50 border border-gray-200/80 space-y-1.5">
            <Layers class="w-4 h-4 text-indigo-600" />
            <div class="font-semibold text-gray-900">All Projects in One Place</div>
            <p class="text-[11px] text-gray-500 leading-relaxed">
              Manage multiple accounts and providers across List, Kanban Board, and Calendar views.
            </p>
          </div>

          <div class="p-3.5 rounded-xl bg-gray-50 border border-gray-200/80 space-y-1.5">
            <CheckCircle2 class="w-4 h-4 text-emerald-600" />
            <div class="font-semibold text-gray-900">Two-Way Live Sync</div>
            <p class="text-[11px] text-gray-500 leading-relaxed">
              Move tasks across lists, update assignees, labels, due dates, checklists, and
              comments.
            </p>
          </div>

          <div class="p-3.5 rounded-xl bg-gray-50 border border-gray-200/80 space-y-1.5">
            <ShieldCheck class="w-4 h-4 text-modern-primary" />
            <div class="font-semibold text-gray-900">Browser-Only Keys</div>
            <p class="text-[11px] text-gray-500 leading-relaxed">
              Credentials are stored locally in your browser and sent directly to each provider API.
            </p>
          </div>
        </div>

        <!-- Primary Action -->
        <div
          class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2"
        >
          <p class="text-xs text-gray-500">
            Setup takes ~1 minute with the built-in step-by-step guide.
          </p>
          <button
            type="button"
            @click="openConnectModal"
            class="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-modern-primary hover:bg-modern-hover shadow-sm transition-colors shrink-0"
          >
            <KeyRound class="w-4 h-4" />
            <span>Connect Account</span>
            <ArrowRight class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
