import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface NewTaskInitialParams {
  idBoard?: string | null;
  idList?: string | null;
}

export const useUIStore = defineStore('ui', () => {
  const isNewTaskModalOpen = ref(false);
  const isSettingsModalOpen = ref(false);
  const newTaskInitialParams = ref<NewTaskInitialParams | null>(null);

  function openNewTaskModal(params?: NewTaskInitialParams | Event | null) {
    if (params && 'preventDefault' in params) {
      newTaskInitialParams.value = null;
    } else {
      newTaskInitialParams.value = (params as NewTaskInitialParams) || null;
    }
    isNewTaskModalOpen.value = true;
  }

  function closeNewTaskModal() {
    isNewTaskModalOpen.value = false;
    newTaskInitialParams.value = null;
  }

  function openSettingsModal() {
    isSettingsModalOpen.value = true;
  }

  function closeSettingsModal() {
    isSettingsModalOpen.value = false;
  }

  return {
    isNewTaskModalOpen,
    isSettingsModalOpen,
    newTaskInitialParams,
    openNewTaskModal,
    closeNewTaskModal,
    openSettingsModal,
    closeSettingsModal,
  };
});
