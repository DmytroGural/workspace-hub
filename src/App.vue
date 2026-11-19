<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import { RouterView, useRoute } from 'vue-router';
import ConnectAccountView from './components/ConnectAccountView.vue';
import Navbar from './components/Navbar.vue';
import NewTaskModal from './components/NewTaskModal.vue';
import SettingsModal from './components/SettingsModal.vue';
import Sidebar from './components/Sidebar.vue';
import TaskDetailDrawer from './components/TaskDetailDrawer.vue';
import { useAccountsStore, useSyncStore, useTasksStore } from './stores';

const route = useRoute();
const accountsStore = useAccountsStore();
const tasksStore = useTasksStore();
const syncStore = useSyncStore();

syncStore.ensureBootstrap();

const { hasAccounts } = storeToRefs(accountsStore);
const { selectedTask } = storeToRefs(tasksStore);
const { errorMessage } = storeToRefs(syncStore);

const showOnboarding = computed(() => !hasAccounts.value && route.name !== 'settings');
</script>

<template>
  <div class="flex h-screen w-screen overflow-hidden bg-modern-bg">
    <ConnectAccountView v-if="showOnboarding" />

    <template v-else>
      <!-- Left Workspace Sidebar -->
      <Sidebar v-if="hasAccounts" />

      <!-- Main Workspace Area -->
      <div class="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <!-- Top Navigation & View Mode Header -->
        <Navbar v-if="hasAccounts" />

        <!-- Error banner if any -->
        <div
          v-if="errorMessage"
          class="bg-rose-50 border-b border-rose-200 px-6 py-2 text-xs text-rose-700 flex items-center justify-between"
        >
          <span>{{ errorMessage }}</span>
          <button
            type="button"
            @click="errorMessage = null"
            class="font-bold underline text-[11px]"
          >
            Dismiss
          </button>
        </div>

        <!-- Main Routed Page Area + Slide-in Drawer -->
        <div class="flex-1 flex min-h-0 overflow-hidden relative">
          <main class="flex-1 min-w-0 h-full overflow-y-auto">
            <RouterView />
          </main>

          <!-- Right Task Detail Drawer -->
          <Transition name="slide-drawer">
            <TaskDetailDrawer v-if="selectedTask" />
          </Transition>
        </div>
      </div>
    </template>

    <!-- Modals -->
    <NewTaskModal />
    <SettingsModal />
  </div>
</template>
