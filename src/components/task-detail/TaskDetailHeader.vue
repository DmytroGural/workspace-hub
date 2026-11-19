<script setup lang="ts">
import { Archive, Check, ExternalLink, RefreshCw, Trash2, X } from 'lucide-vue-next';
import { ref, watch } from 'vue';
import type { TaskInterface } from '@/types/domain';

const props = defineProps<{
  task: TaskInterface;
  providerName: string;
  canToggleComplete: boolean;
  canArchive: boolean;
  canDelete: boolean;
  isRefreshing: boolean;
  isMutating: boolean;
}>();

const emit = defineEmits<{
  toggleComplete: [];
  refresh: [];
  archive: [];
  delete: [];
  close: [];
}>();

const confirmingDelete = ref(false);

watch(
  () => props.task.id,
  () => {
    confirmingDelete.value = false;
  },
);

function requestDelete() {
  confirmingDelete.value = true;
}

function cancelDelete() {
  confirmingDelete.value = false;
}

function confirmDelete() {
  emit('delete');
}
</script>

<template>
  <div class="border-b border-gray-100 shrink-0 select-none bg-gray-50/50">
    <div class="px-6 py-3.5 flex items-center justify-between gap-2">
      <!-- Complete / Incomplete Button -->
      <button
        type="button"
        @click="emit('toggleComplete')"
        :disabled="!canToggleComplete || isMutating"
        :class="[
          'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all modern-check-btn disabled:opacity-50 disabled:cursor-not-allowed',
          task.dueComplete
            ? 'bg-emerald-500 border-emerald-600 text-white shadow-xs'
            : 'bg-white border-gray-300 hover:border-emerald-500 text-gray-700 hover:text-emerald-600',
        ]"
      >
        <Check :class="['w-3.5 h-3.5 stroke-[3]', task.dueComplete ? 'text-white' : '']" />
        <span>{{ task.dueComplete ? 'Completed' : 'Mark Complete' }}</span>
      </button>

      <!-- Action items -->
      <div class="flex items-center gap-1">
        <button
          type="button"
          @click="emit('refresh')"
          :disabled="isRefreshing || isMutating"
          class="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-modern-primary px-2 py-1 rounded hover:bg-gray-100 transition-colors disabled:opacity-60"
          title="Refresh task details & comments"
        >
          <RefreshCw
            :class="['w-3.5 h-3.5', isRefreshing ? 'animate-spin text-modern-primary' : '']"
          />
          <span v-if="isRefreshing" class="text-[11px] font-medium text-modern-primary">
            Syncing...
          </span>
        </button>

        <button
          v-if="canArchive"
          type="button"
          @click="emit('archive')"
          :disabled="isMutating"
          class="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-amber-700 px-2 py-1 rounded hover:bg-amber-50 transition-colors disabled:opacity-50"
          title="Archive task"
        >
          <Archive class="w-3.5 h-3.5" />
          <span class="hidden sm:inline">Archive</span>
        </button>

        <button
          v-if="canDelete"
          type="button"
          @click="requestDelete"
          :disabled="isMutating"
          :class="[
            'inline-flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors disabled:opacity-50',
            confirmingDelete
              ? 'bg-rose-100 text-rose-700'
              : 'text-gray-500 hover:text-rose-700 hover:bg-rose-50',
          ]"
          title="Delete task permanently"
        >
          <Trash2 class="w-3.5 h-3.5" />
          <span class="hidden sm:inline">Delete</span>
        </button>

        <a
          v-if="task.url"
          :href="task.url"
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center gap-1 text-xs text-gray-500 hover:text-modern-primary px-2 py-1 rounded hover:bg-gray-100 transition-colors"
          :title="`Open in ${providerName}`"
        >
          <ExternalLink class="w-3.5 h-3.5" />
          <span class="hidden sm:inline">Open in {{ providerName }}</span>
        </a>

        <button
          type="button"
          aria-label="Close drawer"
          @click="emit('close')"
          class="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <X class="w-5 h-5" />
        </button>
      </div>
    </div>

    <!-- Delete confirmation bar -->
    <div
      v-if="confirmingDelete"
      class="px-6 py-2.5 bg-rose-50 border-t border-rose-200 flex items-center justify-between gap-3 text-xs"
    >
      <span class="font-medium text-rose-800">
        Delete this task permanently in {{ providerName }}? This cannot be undone.
      </span>
      <div class="flex items-center gap-2 shrink-0">
        <button
          type="button"
          @click="cancelDelete"
          :disabled="isMutating"
          class="px-2.5 py-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-medium disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          @click="confirmDelete"
          :disabled="isMutating"
          class="px-2.5 py-1 rounded bg-rose-600 text-white hover:bg-rose-700 font-semibold disabled:opacity-50"
        >
          {{ isMutating ? 'Deleting...' : 'Delete permanently' }}
        </button>
      </div>
    </div>
  </div>
</template>
