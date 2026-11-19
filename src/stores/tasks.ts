import { defineStore } from 'pinia';
import { computed, type Ref, ref, watch } from 'vue';
import { taskService } from '@/services/TaskService';
import type { CreateTaskInput } from '@/types/api';
import type {
  BoardList,
  ProviderAccount,
  TaskBoard,
  TaskInterface,
  TaskLabel,
  WorkspaceMember,
} from '@/types/domain';
import { getErrorMessage } from '@/utils/errorUtils';
import { getLabelDisplayName } from '@/utils/labelColors';
import { useAccountsStore } from './accounts';
import { useSyncStore } from './sync';

export const DEFAULT_FALLBACK_USER: WorkspaceMember = {
  id: 'user_workspace',
  fullName: 'Workspace User',
  username: 'user',
  initials: 'WU',
};

/**
 * Generic deduplicator that merges multi-account access (`accountIds`) for entities sharing the same ID.
 */
export function deduplicateEntity<
  T extends { id: string; accountId: string; accountIds?: string[] },
>(incoming: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of incoming) {
    const existing = map.get(item.id);
    if (!existing) {
      map.set(item.id, {
        ...item,
        accountIds: item.accountIds ? [...item.accountIds] : [item.accountId],
      });
    } else {
      const accIds = existing.accountIds || [existing.accountId];
      if (!accIds.includes(item.accountId)) {
        accIds.push(item.accountId);
      }
      if (item.accountIds) {
        for (const id of item.accountIds) {
          if (!accIds.includes(id)) {
            accIds.push(id);
          }
        }
      }
      existing.accountIds = accIds;
    }
  }
  return Array.from(map.values());
}

export const deduplicateBoards = (incoming: TaskBoard[]): TaskBoard[] =>
  deduplicateEntity(incoming);
export const deduplicateLists = (incoming: BoardList[]): BoardList[] => deduplicateEntity(incoming);
export const deduplicateTasks = (incoming: TaskInterface[]): TaskInterface[] =>
  deduplicateEntity(incoming);

export const useTasksStore = defineStore('tasks', () => {
  const accountsStore = useAccountsStore();

  // Core entities
  const boards = ref<TaskBoard[]>([]);
  const lists = ref<BoardList[]>([]);
  const tasks = ref<TaskInterface[]>([]);
  const selectedTaskId = ref<string | null>(null);

  // Metadata caches
  const boardLabelsMap = ref<Record<string, TaskLabel[]>>({});
  const boardMembersMap = ref<Record<string, WorkspaceMember[]>>({});

  // Async operation states
  const isRefreshingTask = ref(false);
  const taskRefreshError = ref<string | null>(null);
  const isLoadingComments = ref(false);
  const isPostingComment = ref(false);
  const commentsError = ref<string | null>(null);
  const isUploadingAttachment = ref(false);
  const attachmentError = ref<string | null>(null);

  let latestTaskRefreshSeq = 0;

  // Enforce entity uniqueness across reactive updates
  function syncUniqueRef<T extends { id: string; accountId: string; accountIds?: string[] }>(
    refTarget: Ref<T[]>,
  ) {
    const unique = deduplicateEntity(refTarget.value);
    if (unique.length !== refTarget.value.length) {
      refTarget.value = unique;
    }
  }

  watch(boards, () => syncUniqueRef(boards), { deep: false });
  watch(lists, () => syncUniqueRef(lists), { deep: false });
  watch(tasks, () => syncUniqueRef(tasks), { deep: false });

  // Getters
  const selectedTask = computed(() => {
    if (!selectedTaskId.value) return null;
    return tasks.value.find((t) => t.id === selectedTaskId.value) || null;
  });

  const availableLabels = computed(() => {
    const map = new Map<string, { name: string; color: string }>();
    tasks.value.forEach((t) => {
      t.labels.forEach((l) => {
        const displayName = getLabelDisplayName(l);
        if (!map.has(displayName)) {
          map.set(displayName, { name: displayName, color: l.color });
        }
      });
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  });

  // Internal domain helpers
  function findTask(taskId: string): TaskInterface | undefined {
    return tasks.value.find((t) => t.id === taskId);
  }

  function findBoard(boardId: string): TaskBoard | undefined {
    return boards.value.find((b) => b.id === boardId);
  }

  function resolveAccountForBoard(board?: TaskBoard): ProviderAccount | undefined {
    if (!board) {
      return accountsStore.accounts.find((a) => a.enabled) || accountsStore.accounts[0];
    }
    let acc = accountsStore.findAccount(board.accountId);
    if (!acc?.enabled && board.accountIds) {
      acc = accountsStore.accounts.find((a) => a.enabled && board.accountIds?.includes(a.id));
    }
    return (
      acc ||
      accountsStore.findAccount(board.accountId) ||
      accountsStore.accounts.find((a) => a.enabled)
    );
  }

  function resolveAccountForTask(task: TaskInterface): ProviderAccount | undefined {
    let acc = accountsStore.findAccount(task.accountId);
    if (!acc?.enabled && task.accountIds) {
      acc = accountsStore.accounts.find((a) => a.enabled && task.accountIds?.includes(a.id));
    }
    return acc || accountsStore.findAccount(task.accountId);
  }

  function notifySyncError(msg: string) {
    useSyncStore().errorMessage = msg;
  }

  function appendBoardLabel(boardId: string, label: TaskLabel) {
    const current = boardLabelsMap.value[boardId] || [];
    if (!current.some((l) => l.id === label.id)) {
      boardLabelsMap.value = {
        ...boardLabelsMap.value,
        [boardId]: [...current, label],
      };
    }
  }

  function removeTaskFromWorkspace(taskId: string) {
    tasks.value = tasks.value.filter((t) => t.id !== taskId);
    if (selectedTaskId.value === taskId) {
      selectedTaskId.value = null;
    }
  }

  // Task Actions
  async function createTask(input: CreateTaskInput) {
    const targetBoard = findBoard(input.idBoard);
    const targetList = lists.value.find((l) => l.id === input.idList);
    const targetAccount = resolveAccountForBoard(targetBoard);

    try {
      const created = await taskService.createTask(
        input,
        targetBoard,
        targetList,
        targetAccount,
        accountsStore.currentUser || DEFAULT_FALLBACK_USER,
      );
      tasks.value.unshift(created);
      return created;
    } catch (err: unknown) {
      const msg = `Failed to create task (${targetAccount?.label || 'Workspace'}): ${getErrorMessage(err, 'Task creation failed')}`;
      notifySyncError(msg);
      throw new Error(msg);
    }
  }

  async function updateTask(taskId: string, updates: Partial<TaskInterface>) {
    const task = findTask(taskId);
    if (!task) return;
    const account = resolveAccountForTask(task);
    try {
      await taskService.updateTask(task, updates, lists.value, account);
    } catch (err: unknown) {
      notifySyncError(
        `Update failed (${task.accountLabel}): ${getErrorMessage(err, 'Update failed')}`,
      );
    }
  }

  async function toggleTaskComplete(task: TaskInterface) {
    const account = resolveAccountForTask(task);
    try {
      await taskService.toggleTaskComplete(task, account);
    } catch (err: unknown) {
      notifySyncError(
        `Failed to sync (${task.accountLabel}): ${getErrorMessage(err, 'Sync failed')}`,
      );
    }
  }

  async function archiveTask(taskId: string): Promise<void> {
    const task = findTask(taskId);
    if (!task) return;
    const account = resolveAccountForTask(task);
    try {
      await taskService.archiveTask(task, account);
      removeTaskFromWorkspace(taskId);
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Failed to archive task');
      notifySyncError(`Archive failed (${task.accountLabel}): ${msg}`);
      throw err;
    }
  }

  async function deleteTask(taskId: string): Promise<void> {
    const task = findTask(taskId);
    if (!task) return;
    const account = resolveAccountForTask(task);
    try {
      await taskService.deleteTask(task, account);
      removeTaskFromWorkspace(taskId);
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Failed to delete task');
      notifySyncError(`Delete failed (${task.accountLabel}): ${msg}`);
      throw err;
    }
  }

  async function refreshTaskDetails(taskId: string) {
    const task = findTask(taskId);
    if (!task) return;

    const board = findBoard(task.idBoard);
    const account = resolveAccountForTask(task);
    const seq = ++latestTaskRefreshSeq;

    isRefreshingTask.value = true;
    taskRefreshError.value = null;

    try {
      const result = await taskService.refreshTask(task, board, lists.value, account);
      if (!result) return;

      if (result.updatedLists) {
        setLists([
          ...lists.value.filter((l) => l.idBoard !== task.idBoard),
          ...result.updatedLists,
        ]);
      }

      const currentTask = findTask(taskId);
      if (currentTask) {
        Object.assign(currentTask, {
          ...result.task,
          comments: currentTask.comments ?? result.task.comments,
        });
      }
    } catch (err: unknown) {
      if (seq === latestTaskRefreshSeq) {
        taskRefreshError.value = getErrorMessage(err, 'Failed to refresh task data');
      }
    } finally {
      if (seq === latestTaskRefreshSeq) {
        isRefreshingTask.value = false;
      }
    }
  }

  // Checklist, Assignee & Labels
  async function toggleCheckItem(taskId: string, checklistId: string, itemId: string) {
    const task = findTask(taskId);
    if (!task) return;
    const account = resolveAccountForTask(task);
    try {
      await taskService.toggleCheckItem(task, checklistId, itemId, account);
    } catch {
      // Ignore checklist toggle errors
    }
  }

  async function toggleTaskAssignee(taskId: string, member: WorkspaceMember) {
    const task = findTask(taskId);
    if (!task) return;
    const account = resolveAccountForTask(task);
    try {
      await taskService.toggleTaskAssignee(task, member, account);
    } catch (err: unknown) {
      notifySyncError(
        `Failed to update assignee (${task.accountLabel}): ${getErrorMessage(err, 'Update failed')}`,
      );
    }
  }

  async function toggleTaskLabel(taskId: string, label: TaskLabel) {
    const task = findTask(taskId);
    if (!task) return;
    const account = resolveAccountForTask(task);
    try {
      await taskService.toggleTaskLabel(task, label, account);
    } catch (err: unknown) {
      notifySyncError(
        `Failed to update label (${task.accountLabel}): ${getErrorMessage(err, 'Update failed')}`,
      );
    }
  }

  async function createBoardLabel(
    boardId: string,
    name: string,
    color: string,
  ): Promise<TaskLabel> {
    const board = findBoard(boardId);
    if (!board || !name.trim()) throw new Error('Board or label name not provided');
    const account = resolveAccountForBoard(board);
    try {
      const created = await taskService.createBoardLabel(boardId, name, color, account);
      appendBoardLabel(boardId, created);
      return created;
    } catch (err: unknown) {
      const msg = `Failed to create label: ${getErrorMessage(err, 'Failed to create label')}`;
      notifySyncError(msg);
      throw new Error(msg);
    }
  }

  async function createLabelAndAttach(taskId: string, name: string, color: string) {
    const task = findTask(taskId);
    if (!task || !name.trim()) return;
    const account = resolveAccountForTask(task);
    try {
      const created = await taskService.createAndAttachLabel(task, name, color, account);
      appendBoardLabel(task.idBoard, created);
      return created;
    } catch (err: unknown) {
      const msg = `Failed to create label (${task.accountLabel}): ${getErrorMessage(err, 'Failed to create label')}`;
      notifySyncError(msg);
      throw new Error(msg);
    }
  }

  async function loadBoardLabels(boardId: string): Promise<TaskLabel[]> {
    const board = findBoard(boardId);
    if (!board) return [];
    const account = resolveAccountForBoard(board);
    try {
      const boardLabels = await taskService.loadBoardLabels(boardId, account);
      boardLabelsMap.value = {
        ...boardLabelsMap.value,
        [boardId]: boardLabels,
      };
      return boardLabels;
    } catch {
      return boardLabelsMap.value[boardId] || [];
    }
  }

  async function loadBoardMembers(boardId: string): Promise<WorkspaceMember[]> {
    const board = findBoard(boardId);
    if (!board) return [];
    const account = resolveAccountForBoard(board);
    try {
      const boardMembers = await taskService.loadBoardMembers(boardId, account);
      boardMembersMap.value = {
        ...boardMembersMap.value,
        [boardId]: boardMembers,
      };
      return boardMembers;
    } catch {
      return boardMembersMap.value[boardId] || [];
    }
  }

  // Comments
  async function loadCommentsForTask(taskId: string) {
    const task = findTask(taskId);
    if (!task) return;
    const account = resolveAccountForTask(task);
    isLoadingComments.value = true;
    commentsError.value = null;
    try {
      await taskService.loadTaskComments(task, account);
    } catch (err: unknown) {
      commentsError.value = getErrorMessage(err, 'Failed to load comments');
    } finally {
      isLoadingComments.value = false;
    }
  }

  async function addComment(taskId: string, text: string, files: File[] = []) {
    const task = findTask(taskId);
    if (!task || (!text.trim() && files.length === 0)) return;
    const account = resolveAccountForTask(task);
    isPostingComment.value = true;
    commentsError.value = null;
    try {
      return await taskService.addTaskComment(
        task,
        text,
        account,
        accountsStore.currentUser || DEFAULT_FALLBACK_USER,
        files,
      );
    } catch (err: unknown) {
      commentsError.value = getErrorMessage(err, 'Failed to post comment');
      throw err;
    } finally {
      isPostingComment.value = false;
    }
  }

  // Attachments
  async function uploadAttachment(taskId: string, file: File) {
    const task = findTask(taskId);
    if (!task) return;
    const account = resolveAccountForTask(task);
    isUploadingAttachment.value = true;
    attachmentError.value = null;
    try {
      return await taskService.uploadTaskAttachment(task, file, account);
    } catch (err: unknown) {
      attachmentError.value = getErrorMessage(err, `Failed to attach "${file.name}"`);
      throw err;
    } finally {
      isUploadingAttachment.value = false;
    }
  }

  async function deleteAttachment(taskId: string, attachmentId: string) {
    const task = findTask(taskId);
    if (!task) return;
    const account = resolveAccountForTask(task);
    attachmentError.value = null;
    try {
      await taskService.deleteTaskAttachment(task, attachmentId, account);
    } catch (err: unknown) {
      attachmentError.value = getErrorMessage(err, 'Failed to remove attachment');
      throw err;
    }
  }

  // Setters & State reset
  function setBoards(incoming: TaskBoard[]) {
    boards.value = deduplicateBoards(incoming);
  }

  function setLists(incoming: BoardList[]) {
    lists.value = deduplicateLists(incoming);
  }

  function setTasks(incoming: TaskInterface[]) {
    tasks.value = deduplicateTasks(incoming);
  }

  function clearTasksState() {
    boards.value = [];
    lists.value = [];
    tasks.value = [];
    boardLabelsMap.value = {};
    boardMembersMap.value = {};
    selectedTaskId.value = null;
  }

  return {
    boards,
    lists,
    tasks,
    setBoards,
    setLists,
    setTasks,
    selectedTaskId,
    selectedTask,
    availableLabels,
    boardLabelsMap,
    boardMembersMap,
    isRefreshingTask,
    taskRefreshError,
    isLoadingComments,
    isPostingComment,
    commentsError,
    isUploadingAttachment,
    attachmentError,
    createTask,
    updateTask,
    toggleTaskComplete,
    archiveTask,
    deleteTask,
    refreshTaskDetails,
    toggleCheckItem,
    toggleTaskAssignee,
    toggleTaskLabel,
    createBoardLabel,
    createLabelAndAttach,
    loadBoardLabels,
    loadBoardMembers,
    loadCommentsForTask,
    addComment,
    uploadAttachment,
    deleteAttachment,
    clearTasksState,
  };
});
