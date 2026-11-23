<script setup lang="ts">
import { AlertCircle } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { computed, ref, watch } from 'vue';
import { useDismissibleLayer } from '@/composables/useDismissibleLayer';
import { useResizablePanel } from '@/composables/useResizablePanel';
import { storageService } from '@/services/StorageService';
import { useAccountsStore, useProvidersStore, useTasksStore, useUIStore } from '@/stores';
import type { TaskLabel, WorkspaceMember } from '@/types/domain';
import { getErrorMessage } from '@/utils/errorUtils';
import TaskChecklistsSection from './task-detail/TaskChecklistsSection.vue';
import TaskCommentsSection from './task-detail/TaskCommentsSection.vue';
import TaskDescriptionSection from './task-detail/TaskDescriptionSection.vue';
import TaskDetailHeader from './task-detail/TaskDetailHeader.vue';
import TaskMetadataSection from './task-detail/TaskMetadataSection.vue';

const accountsStore = useAccountsStore();
const tasksStore = useTasksStore();
const providersStore = useProvidersStore();
const uiStore = useUIStore();

const { myMemberIds, myUsernames } = storeToRefs(accountsStore);

const {
  selectedTask,
  selectedTaskId,
  boards,
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
  updateComment,
  deleteComment,
  uploadAttachment,
  deleteAttachment,
} = tasksStore;

const { getProviderName, getTaskCapabilities, getProviderLabelColors } = providersStore;

const localName = ref('');
const localDesc = ref('');
const selectedBoardUrl = computed(
  () => boards.value.find((board) => board.id === selectedTask.value?.idBoard)?.url,
);
const drawerRef = ref<HTMLElement | null>(null);
const nameInputRef = ref<HTMLTextAreaElement | null>(null);
const isSavingLabel = ref(false);
const isSavingAssignee = ref(false);
const isMutatingTaskAction = ref(false);
const taskActionError = ref<string | null>(null);

const {
  width: drawerWidth,
  isResizing,
  minWidth: MIN_DRAWER_WIDTH,
  startResize,
  resetWidth: resetDrawerWidth,
  stepWidth: stepDrawerWidth,
} = useResizablePanel({
  defaultWidth: 680,
  minWidth: 420,
  loadWidth: (fallback) => storageService.loadDrawerWidth(fallback),
  saveWidth: (w) => storageService.saveDrawerWidth(w),
});

useDismissibleLayer({
  containerRef: drawerRef,
  isActive: () =>
    Boolean(
      !isResizing.value &&
        selectedTask.value &&
        !uiStore.isNewTaskModalOpen &&
        !uiStore.isSettingsModalOpen,
    ),
  onDismiss: close,
});

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

async function handleUpdateComment(payload: { commentId: string; text: string }) {
  if (!selectedTask.value) return;
  await updateComment(selectedTask.value.id, payload.commentId, payload.text);
}

async function handleDeleteComment(commentId: string) {
  if (!selectedTask.value) return;
  await deleteComment(selectedTask.value.id, commentId);
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
        :board-url="selectedBoardUrl"
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
      />

      <div class="border-t border-gray-100" />

      <TaskDescriptionSection
        :task-id="selectedTask.id"
        :description="selectedTask.desc"
        :attachments="selectedTask.attachments"
        :mention-members="boardMembers"
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
        :mention-members="boardMembers"
        :my-member-ids="myMemberIds"
        :my-usernames="myUsernames"
        :can-comment="taskCapabilities.canComment"
        :can-manage-attachments="taskCapabilities.canManageAttachments"
        :is-loading="isLoadingComments"
        :is-posting="isPostingComment"
        :error="commentsError"
        @add-comment="handleAddComment"
        @update-comment="handleUpdateComment"
        @delete-comment="handleDeleteComment"
      />
    </div>
  </aside>
</template>
