<script setup lang="ts">
import { Github, Plus, Sparkles } from 'lucide-vue-next';
import { RouterLink } from 'vue-router';

const emit = defineEmits<{
  addTask: [];
}>();
</script>

<template>
  <!-- Workspace Brand Header -->
  <div class="px-4 py-4 flex items-center justify-between border-b border-[#2d2e32]">
    <RouterLink to="/dashboard" class="flex items-center space-x-2.5 group">
      <div
        class="w-7 h-7 rounded-lg bg-gradient-to-tr from-rose-500 to-indigo-600 flex items-center justify-center shadow-md"
      >
        <Sparkles class="w-4 h-4 text-white" />
      </div>
      <div>
        <div
          class="text-sm font-bold text-white tracking-tight flex items-center gap-1.5 group-hover:text-indigo-200 transition-colors"
        >
          Workspace Hub
        </div>
        <div class="text-[11px] text-gray-400">Unified task workspace</div>
      </div>
    </RouterLink>
    <a
      href="https://github.com/DmytroGural/workspace-hub"
      target="_blank"
      rel="noopener noreferrer"
      class="p-1 rounded-md transition-colors text-gray-400 hover:text-white hover:bg-modern-sidebar-hover"
      title="GitHub Repository"
      aria-label="GitHub Repository"
    >
      <Github class="w-4 h-4" />
    </a>
  </div>

  <!-- Quick Action: Create Task -->
  <div class="p-3">
    <button
      type="button"
      @click="emit('addTask')"
      class="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-white/10 hover:bg-white/15 active:bg-white/20 text-white text-xs font-semibold tracking-wide transition-all shadow-sm border border-white/10 hover:border-white/20"
    >
      <Plus class="w-4 h-4 text-indigo-400" />
      <span>Add Task</span>
    </button>
  </div>
</template>
