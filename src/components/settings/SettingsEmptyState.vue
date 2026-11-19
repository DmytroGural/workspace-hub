<script setup lang="ts">
import { KeyRound, Plus } from 'lucide-vue-next';

const emit = defineEmits<{
  connect: [];
}>();
</script>

<template>
  <div class="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center space-y-3">
    <div
      class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto"
    >
      <KeyRound class="w-5 h-5" />
    </div>
    <div>
      <h3 class="text-sm font-bold text-gray-900">No workspace account connected</h3>
      <p class="text-xs text-gray-500 mt-1 max-w-md mx-auto">
        Connect a task manager account using a supported provider connector to load your boards,
        lists, labels, and tasks.
      </p>
    </div>
    <button
      type="button"
      @click="emit('connect')"
      class="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-modern-primary hover:bg-modern-hover rounded-lg transition-colors"
    >
      <Plus class="w-4 h-4" />
      Connect Account
    </button>
  </div>
</template>
