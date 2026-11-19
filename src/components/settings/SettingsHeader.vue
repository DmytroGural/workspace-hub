<script setup lang="ts">
import { ArrowLeft } from 'lucide-vue-next';

const emit = defineEmits<{
  back: [];
}>();
</script>

<template>
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div>
      <button
        type="button"
        @click="emit('back')"
        class="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 mb-2 transition-colors"
      >
        <ArrowLeft class="w-3.5 h-3.5" />
        Back to Dashboard
      </button>
      <h1 class="text-2xl font-bold text-gray-900 tracking-tight">
        Accounts & Provider Connectors
      </h1>
      <p class="text-sm text-gray-500 mt-1">
        Connect multiple API keys and workspaces across supported task services. All enabled boards
        merge into one unified modern-style dashboard.
      </p>
    </div>
  </div>
</template>
