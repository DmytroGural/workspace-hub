<script setup lang="ts">
import { AlertCircle } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { storageService } from '@/services/StorageService';
import { useProvidersStore, useTasksStore, useUIStore } from '@/stores';
import type { TaskLabel, WorkspaceMember } from '@/types/domain';
import { getErrorMessage } from '@/utils/errorUtils';
import TaskChecklistsSection from './task-detail/TaskChecklistsSection.vue';
import TaskCommentsSection from './task-detail/TaskCommentsSection.vue';
import TaskDescriptionSection from './task-detail/TaskDescriptionSection.vue';
import TaskDetailHeader from './task-detail/TaskDetailHeader.vue';
import TaskMetadataSection from './task-detail/TaskMetadataSection.vue';

const tasksStore = useTasksStore();
const providersStore = useProvidersStore();
const uiStore = useUIStore();

const {
  selectedTask,
  selectedTaskId,
  lists,
  boardLabelsMap,
  boardMembersMap,
  isRefreshingTask,
  taskRefreshError,
  isLoadingComments,
  isPostingComment,
  commentsError,
  isUploadingAttachment,
  attachmentError,
} = storeToRefs(tasksStore);

const {
  toggleTaskComplete,
  updateTask,
  archiveTask,
  deleteTask,
  toggleCheckItem,
  loadBoardLabels,
  loadBoardMembers,
  toggleTaskAssignee,
  toggleTaskLabel,
  createLabelAndAttach,
  refreshTaskDetails,
  loadCommentsForTask,
  addComment,
  uploadAttachment,
  deleteAttachment,
} = tasksStore;

const { getProviderName, getTaskCapabilities, getProviderLabelColors } = providersStore;

const localName = ref('');
const localDesc = ref('');
const drawerRef = ref<HTMLElement | null>(null);
const nameInputRef = ref<HTMLTextAreaElement | null>(null);
const isSavingLabel = ref(false);
const isSavingAssignee = ref(false);
const isMutatingTaskAction = ref(false);
const taskActionError = ref<string | null>(null);

watch(
  () => [selectedTask.value?.id, selectedTask.value?.name, selectedTask.value?.desc] as const,
  ([id, name, desc], prev) => {
    if (!id) return;
    const isNewTask = !prev || prev[0] !== id;
    if (isNewTask || document.activeElement !== nameInputRef.value) {
      localName.value = name || '';
    }
    if (isNewTask) {
      localDesc.value = desc || '';
      attachmentError.value = null;
      taskActionError.value = null;
    }
  },
  { immediate: true },
);

watch(
  () => selectedTask.value?.id,
  (taskId) => {
    if (!taskId) return;
    const boardId = selectedTask.value?.idBoard;
    void Promise.all([
      refreshTaskDetails(taskId),
      loadCommentsForTask(taskId),
      boardId ? loadBoardLabels(boardId) : Promise.resolve([]),
      boardId ? loadBoardMembers(boardId) : Promise.resolve([]),
    ]);
  },
  { immediate: true },
);

function autoResizeNameInput() {
  const el = nameInputRef.value;
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
}

watch(
  [localName, nameInputRef],
  () => {
    autoResizeNameInput();
  },
  { flush: 'post', immediate: true },
);

const availableLists = computed(() => {
  const task = selectedTask.value;
  if (!task) return [];
  return lists.value.filter((l) => l.idBoard === task.idBoard);
});

const taskCapabilities = computed(() => getTaskCapabilities(selectedTask.value));
const taskProviderName = computed(() =>
  selectedTask.value ? getProviderName(selectedTask.value.provider) : '',
);
const taskLabelColors = computed(() =>
  selectedTask.value ? getProviderLabelColors(selectedTask.value.provider) : [],
);

const boardLabels = computed(() => {
  if (!selectedTask.value) return [];
  return boardLabelsMap.value[selectedTask.value.idBoard] || [];
});

const boardMembers = computed(() => {
  if (!selectedTask.value) return [];
  return boardMembersMap.value[selectedTask.value.idBoard] || [];
});

function handleRefresh() {
  if (!selectedTask.value) return;
  const taskId = selectedTask.value.id;
  const boardId = selectedTask.value.idBoard;
  void Promise.all([
    refreshTaskDetails(taskId),
    loadCommentsForTask(taskId),
    loadBoardLabels(boardId),
    loadBoardMembers(boardId),
  ]);
}

function close() {
  handleNameBlur();
  handleDescBlur();
  selectedTaskId.value = null;
}

const DEFAULT_DRAWER_WIDTH = 680;
const MIN_DRAWER_WIDTH = 420;

const drawerWidth = ref(storageService.loadDrawerWidth(DEFAULT_DRAWER_WIDTH));
const isResizing = ref(false);
let startX = 0;
let startWidth = 0;

function getMaxDrawerWidth(): number {
  if (typeof window === 'undefined') return 2000;
  return Math.max(MIN_DRAWER_WIDTH, window.innerWidth - 80);
}

function clampWidth(width: number): number {
  const max = getMaxDrawerWidth();
  return Math.min(max, Math.max(MIN_DRAWER_WIDTH, width));
}

function handleWindowResize() {
  const clamped = clampWidth(drawerWidth.value);
  if (clamped !== drawerWidth.value) {
    drawerWidth.value = clamped;
    storageService.saveDrawerWidth(clamped);
  }
}

function onMouseMove(event: MouseEvent) {
  if (!isResizing.value) return;
  const delta = startX - event.clientX;
  drawerWidth.value = clampWidth(startWidth + delta);
}

function stopResize() {
  if (!isResizing.value) return;
  isResizing.value = false;
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup', stopResize);
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
  storageService.saveDrawerWidth(drawerWidth.value);
}

function startResize(event: MouseEvent) {
  event.preventDefault();
  event.stopPropagation();
  isResizing.value = true;
  startX = event.clientX;
  startWidth = drawerWidth.value;
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', stopResize);
}

function resetDrawerWidth() {
  const clamped = clampWidth(DEFAULT_DRAWER_WIDTH);
  drawerWidth.value = clamped;
  storageService.saveDrawerWidth(clamped);
}

function stepDrawerWidth(delta: number) {
  const clamped = clampWidth(drawerWidth.value + delta);
  drawerWidth.value = clamped;
  storageService.saveDrawerWidth(clamped);
}

function handleOutsidePointerDown(event: PointerEvent) {
  if (
    isResizing.value ||
    !selectedTask.value ||
    !drawerRef.value ||
    uiStore.isNewTaskModalOpen ||
    uiStore.isSettingsModalOpen
  ) {
    return;
  }
  if (event.target instanceof Node && !drawerRef.value.contains(event.target)) {
    close();
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (
    event.key === 'Escape' &&
    selectedTask.value &&
    !uiStore.isNewTaskModalOpen &&
    !uiStore.isSettingsModalOpen
  ) {
    close();
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', handleOutsidePointerDown);
  window.addEventListener('keydown', handleKeydown);
  window.addEventListener('resize', handleWindowResize);
});

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleOutsidePointerDown);
  window.removeEventListener('keydown', handleKeydown);
  window.removeEventListener('resize', handleWindowResize);
  stopResize();
});

function handleNameBlur() {
  if (selectedTask.value && localName.value.trim() && localName.value !== selectedTask.value.name) {
    updateTask(selectedTask.value.id, { name: localName.value.trim() });
  }
}

function handleDescBlur() {
  if (selectedTask.value && localDesc.value !== selectedTask.value.desc) {
    updateTask(selectedTask.value.id, { desc: localDesc.value });
  }
}

function handleUpdateDue(dueIso: string | null) {
  if (selectedTask.value) {
    updateTask(selectedTask.value.id, { due: dueIso });
  }
}

function handleUpdateList(listId: string) {
  if (selectedTask.value) {
    updateTask(selectedTask.value.id, { idList: listId });
  }
}

async function handleToggleAssignee(member: WorkspaceMember) {
  if (!selectedTask.value || isSavingAssignee.value) return;
  isSavingAssignee.value = true;
  try {
    await toggleTaskAssignee(selectedTask.value.id, member);
  } finally {
    isSavingAssignee.value = false;
  }
}

async function handleToggleLabel(label: TaskLabel) {
  if (!selectedTask.value || isSavingLabel.value) return;
  isSavingLabel.value = true;
  try {
    await toggleTaskLabel(selectedTask.value.id, label);
  } finally {
    isSavingLabel.value = false;
  }
}

async function handleCreateLabel(payload: { name: string; color: string }) {
  if (!selectedTask.value || isSavingLabel.value) return;
  isSavingLabel.value = true;
  try {
    await createLabelAndAttach(selectedTask.value.id, payload.name, payload.color);
  } finally {
    isSavingLabel.value = false;
  }
}

function handleToggleCheck(checklistId: string, itemId: string) {
  if (selectedTask.value) {
    toggleCheckItem(selectedTask.value.id, checklistId, itemId);
  }
}

async function handleAddComment(payload: { text: string; files: File[] }) {
  if (!selectedTask.value) return;
  await addComment(selectedTask.value.id, payload.text, payload.files);
}

async function handleUploadDescriptionFiles(files: File[]) {
  if (!selectedTask.value) return;
  for (const file of files) {
    try {
      await uploadAttachment(selectedTask.value.id, file);
    } catch {
      // attachmentError holds feedback for UI
      break;
    }
  }
}

async function handleDeleteAttachment(attachmentId: string) {
  if (!selectedTask.value) return;
  await deleteAttachment(selectedTask.value.id, attachmentId);
}

async function runTaskAction(action: (taskId: string) => Promise<void>, fallbackMessage: string) {
  if (!selectedTask.value || isMutatingTaskAction.value) return;
  isMutatingTaskAction.value = true;
  taskActionError.value = null;
  try {
    await action(selectedTask.value.id);
  } catch (err: unknown) {
    taskActionError.value = getErrorMessage(err, fallbackMessage);
  } finally {
    isMutatingTaskAction.value = false;
  }
}

async function handleArchiveTask() {
  await runTaskAction(archiveTask, 'Failed to archive task');
}

async function handleDeleteTask() {
  await runTaskAction(deleteTask, 'Failed to delete task');
}
</script>

<template>
  <aside
    v-if="selectedTask"
    ref="drawerRef"
    :style="{ width: `${drawerWidth}px`, maxWidth: '100%' }"
    class="w-full bg-white border-l border-modern-border flex flex-col h-full shadow-2xl z-20 shrink-0 select-text absolute right-0"
  >
    <!-- Left edge draggable resize handle -->
    <div
      role="separator"
      aria-orientation="vertical"
      tabindex="0"
      aria-label="Resize drawer"
      :aria-valuenow="drawerWidth"
      :aria-valuemin="MIN_DRAWER_WIDTH"
      title="Drag to resize, double-click to reset"
      class="absolute left-0 top-0 bottom-0 w-3 -translate-x-1/2 cursor-col-resize z-30 flex items-center justify-center group focus:outline-none"
      @mousedown="startResize"
      @dblclick="resetDrawerWidth"
      @keydown.left.prevent="stepDrawerWidth(20)"
      @keydown.right.prevent="stepDrawerWidth(-20)"
    >
      <div
        class="w-1 h-12 rounded-full transition-colors"
        :class="
          isResizing
            ? 'bg-modern-primary'
            : 'bg-transparent group-hover:bg-modern-primary/60 group-focus:bg-modern-primary/60'
        "
      />
    </div>

    <TaskDetailHeader
      :task="selectedTask"
      :provider-name="taskProviderName"
      :can-toggle-complete="taskCapabilities.canToggleComplete"
      :can-archive="taskCapabilities.canArchiveTask"
      :can-delete="taskCapabilities.canDeleteTask"
      :is-refreshing="isRefreshingTask"
      :is-mutating="isMutatingTaskAction"
      @toggle-complete="toggleTaskComplete(selectedTask)"
      @refresh="handleRefresh"
      @archive="handleArchiveTask"
      @delete="handleDeleteTask"
      @close="close"
    />

    <!-- Scrollable Detail Body -->
    <div class="flex-1 overflow-y-auto p-6 space-y-6">
      <div
        v-if="taskActionError"
        class="flex items-start gap-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs"
      >
        <AlertCircle class="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <span>{{ taskActionError }}</span>
      </div>

      <div
        v-if="taskRefreshError"
        class="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs"
      >
        <AlertCircle class="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <span>Could not refresh latest task details: {{ taskRefreshError }}</span>
      </div>

      <!-- Task Title (Editable) -->
      <div>
        <textarea
          ref="nameInputRef"
          v-model="localName"
          :readonly="!taskCapabilities.canEditTask"
          @input="autoResizeNameInput"
          @blur="handleNameBlur"
          rows="1"
          class="w-full text-lg font-bold text-gray-900 border-transparent focus:border-modern-primary focus:ring-1 focus:ring-modern-primary rounded-lg px-2 py-1 -mx-2 hover:bg-gray-50 resize-none overflow-hidden transition-colors outline-none leading-snug"
          placeholder="Task title..."
        />
      </div>

      <TaskMetadataSection
        :task="selectedTask"
        :available-lists="availableLists"
        :board-labels="boardLabels"
        :board-members="boardMembers"
        :label-colors="taskLabelColors"
        :capabilities="taskCapabilities"
        :is-saving-label="isSavingLabel"
        :is-saving-assignee="isSavingAssignee"
        @update-due="handleUpdateDue"
        @update-list="handleUpdateList"
        @toggle-assignee="handleToggleAssignee"
        @toggle-label="handleToggleLabel"
        @create-label="handleCreateLabel"
        @open-board="close"
      />

      <div class="border-t border-gray-100" />

      <TaskDescriptionSection
        :task-id="selectedTask.id"
        :description="selectedTask.desc"
        :attachments="selectedTask.attachments"
        :can-edit="taskCapabilities.canEditTask"
        :can-manage-attachments="taskCapabilities.canManageAttachments"
        :is-uploading="isUploadingAttachment"
        :error="attachmentError"
        @update-description="localDesc = $event"
        @blur="handleDescBlur"
        @upload-files="handleUploadDescriptionFiles"
        @delete-attachment="handleDeleteAttachment"
      />

      <TaskChecklistsSection
        v-if="selectedTask.checklists && selectedTask.checklists.length > 0"
        :checklists="selectedTask.checklists"
        :can-toggle="taskCapabilities.canToggleSubtasks"
        @toggle-item="handleToggleCheck"
      />

      <TaskCommentsSection
        v-if="
          taskCapabilities.canComment || (selectedTask.comments && selectedTask.comments.length > 0)
        "
        :task-id="selectedTask.id"
        :comments="selectedTask.comments"
        :can-comment="taskCapabilities.canComment"
        :can-manage-attachments="taskCapabilities.canManageAttachments"
        :is-loading="isLoadingComments"
        :is-posting="isPostingComment"
        :error="commentsError"
        @add-comment="handleAddComment"
      />
    </div>
  </aside>
</template>
