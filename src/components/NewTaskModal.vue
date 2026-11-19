<script setup lang="ts">
import { Plus, X } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import TaskAssigneeEditor from '@/components/task-detail/TaskAssigneeEditor.vue';
import TaskDescriptionSection from '@/components/task-detail/TaskDescriptionSection.vue';
import TaskLabelsEditor from '@/components/task-detail/TaskLabelsEditor.vue';
import { useFiltersStore, useProvidersStore, useTasksStore, useUIStore } from '@/stores';
import type { TaskLabel, WorkspaceMember } from '@/types/domain';
import { dateInputToIso } from '@/utils/dateUtils';

const tasksStore = useTasksStore();
const filtersStore = useFiltersStore();
const uiStore = useUIStore();
const providersStore = useProvidersStore();

const { boards, lists, boardLabelsMap, boardMembersMap } = storeToRefs(tasksStore);
const { selectedBoardId } = storeToRefs(filtersStore);
const { isNewTaskModalOpen } = storeToRefs(uiStore);

const { loadBoardLabels, loadBoardMembers, createTask, createBoardLabel } = tasksStore;
const { getBoardCapabilities } = providersStore;
const { closeNewTaskModal } = uiStore;

const creatableBoards = computed(() =>
  boards.value.filter((b) => getBoardCapabilities(b.id).canCreateTask),
);

const groupedCreatableBoards = computed(() => {
  const groups = new Map<string, typeof boards.value>();
  for (const b of creatableBoards.value) {
    const label = b.accountLabel || 'Workspace';
    const list = groups.get(label) || [];
    list.push(b);
    groups.set(label, list);
  }
  return Array.from(groups.entries()).map(([label, boards]) => ({
    label,
    boards,
  }));
});

const titleInputRef = ref<HTMLInputElement | null>(null);
const name = ref('');
const desc = ref('');
const idBoard = ref(creatableBoards.value[0]?.id || '');
const idList = ref('');
const due = ref('');
const selectedLabels = ref<TaskLabel[]>([]);
const selectedAssignees = ref<WorkspaceMember[]>([]);
const isSubmitting = ref(false);
const isSavingLabel = ref(false);

const activeCapabilities = computed(() => getBoardCapabilities(idBoard.value));

const availableLists = computed(() => {
  return lists.value.filter((l) => l.idBoard === idBoard.value);
});

const availableBoardLabels = computed(() => {
  return idBoard.value ? boardLabelsMap.value[idBoard.value] || [] : [];
});

const availableBoardMembers = computed(() => {
  return idBoard.value ? boardMembersMap.value[idBoard.value] || [] : [];
});

function isLabelSelected(labelId: string): boolean {
  return selectedLabels.value.some((l) => l.id === labelId);
}

function toggleSelectedLabel(label: TaskLabel) {
  if (isLabelSelected(label.id)) {
    selectedLabels.value = selectedLabels.value.filter((l) => l.id !== label.id);
  } else {
    selectedLabels.value = [...selectedLabels.value, label];
  }
}

async function handleCreateLabel(payload: { name: string; color: string }) {
  if (!idBoard.value || !payload.name.trim()) return;
  isSavingLabel.value = true;
  try {
    const created = await createBoardLabel(idBoard.value, payload.name.trim(), payload.color);
    if (created && !selectedLabels.value.some((l) => l.id === created.id)) {
      selectedLabels.value = [...selectedLabels.value, created];
    }
  } finally {
    isSavingLabel.value = false;
  }
}

function isAssigneeSelected(memberId: string): boolean {
  return selectedAssignees.value.some((m) => m.id === memberId);
}

function toggleSelectedAssignee(member: WorkspaceMember) {
  if (isAssigneeSelected(member.id)) {
    selectedAssignees.value = selectedAssignees.value.filter((m) => m.id !== member.id);
  } else {
    selectedAssignees.value = [...selectedAssignees.value, member];
  }
}

watch(
  idBoard,
  (newBoardId) => {
    selectedLabels.value = [];
    selectedAssignees.value = [];
    if (newBoardId) {
      void Promise.all([loadBoardLabels(newBoardId), loadBoardMembers(newBoardId)]);
    }
  },
  {
    immediate: true,
  },
);

watch(
  availableLists,
  (newLists) => {
    const initListId = uiStore.newTaskInitialParams?.idList;
    if (initListId && newLists.some((l) => l.id === initListId)) {
      idList.value = initListId;
      return;
    }
    if (newLists.length > 0 && (!idList.value || !newLists.some((l) => l.id === idList.value))) {
      idList.value = newLists[0].id;
    }
  },
  { immediate: true },
);

watch(isNewTaskModalOpen, (isOpen) => {
  if (isOpen) {
    name.value = '';
    desc.value = '';
    due.value = '';
    selectedLabels.value = [];
    selectedAssignees.value = [];

    const init = uiStore.newTaskInitialParams;
    const targetBoardId = init?.idBoard || selectedBoardId.value;

    if (targetBoardId && creatableBoards.value.some((b) => b.id === targetBoardId)) {
      idBoard.value = targetBoardId;
    } else if (creatableBoards.value[0]) {
      idBoard.value = creatableBoards.value[0].id;
    }

    if (init?.idList) {
      idList.value = init.idList;
    }

    if (idBoard.value) {
      void Promise.all([loadBoardLabels(idBoard.value), loadBoardMembers(idBoard.value)]);
    }

    void nextTick().then(() => {
      titleInputRef.value?.focus();
    });
  } else {
    uiStore.newTaskInitialParams = null;
  }
});

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && isNewTaskModalOpen.value) {
    closeNewTaskModal();
  }
}

onMounted(() => window.addEventListener('keydown', handleKeydown));
onUnmounted(() => window.removeEventListener('keydown', handleKeydown));

async function handleSubmit() {
  if (!name.value.trim() || !idBoard.value || !idList.value) return;

  isSubmitting.value = true;
  try {
    await createTask({
      name: name.value.trim(),
      desc: desc.value.trim(),
      idBoard: idBoard.value,
      idList: idList.value,
      due: dateInputToIso(due.value),
      labels: selectedLabels.value,
      assignees: selectedAssignees.value,
    });
    closeNewTaskModal();
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div v-if="isNewTaskModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <!-- Backdrop button -->
    <button
      type="button"
      class="fixed inset-0 bg-black/40 backdrop-blur-sm cursor-default border-0"
      @click="closeNewTaskModal"
      aria-label="Close modal dialog"
    />
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-task-modal-title"
      class="relative z-10 bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
    >
      <!-- Modal Header -->
      <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
            <Plus class="w-4 h-4" />
          </div>
          <h3 id="new-task-modal-title" class="text-sm font-bold text-gray-900">Create Task</h3>
        </div>
        <button
          type="button"
          aria-label="Close modal"
          @click="closeNewTaskModal"
          class="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Form Body -->
      <form @submit.prevent="handleSubmit" class="p-6 space-y-4 text-xs">
        <!-- Task Name -->
        <div>
          <label for="new-task-title" class="block font-semibold text-gray-700 mb-1"
            >Task Title *</label
          >
          <input
            id="new-task-title"
            ref="titleInputRef"
            v-model="name"
            type="text"
            required
            placeholder="What needs to be done?"
            class="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-modern-primary focus:ring-1 focus:ring-modern-primary"
          >
        </div>

        <!-- Board & List Selection -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="new-task-board" class="block font-semibold text-gray-700 mb-1"
              >Target Board / Project *</label
            >
            <select
              id="new-task-board"
              v-model="idBoard"
              class="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-modern-primary bg-white"
            >
              <optgroup
                v-for="group in groupedCreatableBoards"
                :key="group.label"
                :label="group.label"
              >
                <option v-for="b in group.boards" :key="b.id" :value="b.id">
                  {{ b.name }}
                </option>
              </optgroup>
            </select>
          </div>

          <div>
            <label for="new-task-column" class="block font-semibold text-gray-700 mb-1"
              >Board List / Column *</label
            >
            <select
              id="new-task-column"
              v-model="idList"
              class="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-modern-primary bg-white"
            >
              <option v-for="l in availableLists" :key="l.id" :value="l.id">
                {{ l.name }}
              </option>
            </select>
          </div>
        </div>

        <!-- Due Date -->
        <div>
          <label for="new-task-due" class="block font-semibold text-gray-700 mb-1">Due Date</label>
          <input
            id="new-task-due"
            v-model="due"
            type="date"
            class="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-modern-primary bg-white"
          >
        </div>

        <!-- Assignee (multi-assignee management via TaskAssigneeEditor) -->
        <TaskAssigneeEditor
          v-if="activeCapabilities.canAssignMembers"
          :task-id="idBoard"
          :assigned-members="selectedAssignees"
          :board-members="availableBoardMembers"
          layout="stacked"
          @toggle-assignee="toggleSelectedAssignee"
        />

        <!-- Description -->
        <TaskDescriptionSection
          :description="desc"
          layout="stacked"
          @update-description="desc = $event"
        />

        <!-- Labels (multi-label management via TaskLabelsEditor) -->
        <TaskLabelsEditor
          v-if="activeCapabilities.canManageLabels"
          :task-id="idBoard"
          :attached-labels="selectedLabels"
          :board-labels="availableBoardLabels"
          :can-create-labels="activeCapabilities.canCreateLabels"
          :is-saving="isSavingLabel"
          layout="stacked"
          @toggle-label="toggleSelectedLabel"
          @create-label="handleCreateLabel"
        />

        <!-- Modal Footer -->
        <div class="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
          <button
            type="button"
            @click="closeNewTaskModal"
            class="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="isSubmitting || !name.trim()"
            class="px-4 py-2 text-xs font-semibold bg-modern-primary hover:bg-modern-hover text-white rounded-lg shadow-sm transition-all disabled:opacity-50"
          >
            {{ isSubmitting ? 'Creating...' : 'Create Task' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
