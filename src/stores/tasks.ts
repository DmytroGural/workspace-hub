import {
  filter,
  find,
  flatMap,
  intersection,
  keyBy,
  map,
  reject,
  some,
  sortBy,
  uniq,
  uniqBy,
} from 'lodash-es';
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
  const entityMap = new Map<string, T>();
  for (const item of incoming) {
    const existing = entityMap.get(item.id);
    if (!existing) {
      entityMap.set(item.id, {
        ...item,
        accountIds: uniq(item.accountIds ? [...item.accountIds, item.accountId] : [item.accountId]),
      });
    } else {
      existing.accountIds = uniq([
        ...(existing.accountIds || [existing.accountId]),
        item.accountId,
        ...(item.accountIds || []),
      ]);
    }
  }
  return Array.from(entityMap.values());
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
    return find(tasks.value, { id: selectedTaskId.value }) || null;
  });

  const availableLabels = computed(() =>
    sortBy(
      uniqBy(
        flatMap(tasks.value, (t) =>
          map(t.labels, (l) => ({ name: getLabelDisplayName(l), color: l.color })),
        ),
        'name',
      ),
      (l) => l.name.toLowerCase(),
    ),
  );

  // Internal domain helpers
  function findTask(taskId: string): TaskInterface | undefined {
    return find(tasks.value, { id: taskId });
  }

  function findBoard(boardId: string): TaskBoard | undefined {
    return find(boards.value, { id: boardId });
  }

  function resolveAccountForBoard(board?: TaskBoard): ProviderAccount | undefined {
    if (!board) {
      return find(accountsStore.accounts, 'enabled') || accountsStore.accounts[0];
    }
    let acc = accountsStore.findAccount(board.accountId);
    if (!acc?.enabled && board.accountIds) {
      acc = find(
        accountsStore.accounts,
        (a) => a.enabled && Boolean(board.accountIds?.includes(a.id)),
      );
    }
    return (
      acc || accountsStore.findAccount(board.accountId) || find(accountsStore.accounts, 'enabled')
    );
  }

  function resolveAccountForTask(task: TaskInterface): ProviderAccount | undefined {
    let acc = accountsStore.findAccount(task.accountId);
    if (!acc?.enabled && task.accountIds) {
      acc = find(
        accountsStore.accounts,
        (a) => a.enabled && Boolean(task.accountIds?.includes(a.id)),
      );
    }
    return acc || accountsStore.findAccount(task.accountId);
  }

  function notifySyncError(msg: string) {
    useSyncStore().errorMessage = msg;
  }

  function appendBoardLabel(boardId: string, label: TaskLabel) {
    const current = boardLabelsMap.value[boardId] || [];
    if (!some(current, { id: label.id })) {
      boardLabelsMap.value = {
        ...boardLabelsMap.value,
        [boardId]: [...current, label],
      };
    }
  }

  function removeTaskFromWorkspace(taskId: string) {
    tasks.value = reject(tasks.value, { id: taskId });
    if (selectedTaskId.value === taskId) {
      selectedTaskId.value = null;
    }
  }

  // Task Actions
  async function createTask(input: CreateTaskInput) {
    const targetBoard = findBoard(input.idBoard);
    const targetList = find(lists.value, { id: input.idList });
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
        setLists([...reject(lists.value, { idBoard: task.idBoard }), ...result.updatedLists]);
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

  async function updateComment(taskId: string, commentId: string, text: string) {
    const task = findTask(taskId);
    if (!task) return;
    const account = resolveAccountForTask(task);
    commentsError.value = null;
    try {
      return await taskService.updateTaskComment(task, commentId, text, account);
    } catch (err: unknown) {
      commentsError.value = getErrorMessage(err, 'Failed to update comment');
      throw err;
    }
  }

  async function deleteComment(taskId: string, commentId: string) {
    const task = findTask(taskId);
    if (!task) return;
    const account = resolveAccountForTask(task);
    commentsError.value = null;
    try {
      await taskService.deleteTaskComment(task, commentId, account);
    } catch (err: unknown) {
      commentsError.value = getErrorMessage(err, 'Failed to delete comment');
      throw err;
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

  function syncEntitiesWithAccounts(
    accounts: ProviderAccount[],
    source?: { boards: TaskBoard[]; lists: BoardList[]; tasks: TaskInterface[] },
  ) {
    const accountById = keyBy(accounts, 'id');
    const enabledIds = map(filter(accounts, 'enabled'), 'id');

    const sourceBoards = source?.boards ?? boards.value;
    const sourceLists = source?.lists ?? lists.value;
    const sourceTasks = source?.tasks ?? tasks.value;

    setBoards(
      filter(
        map(sourceBoards, (board) => {
          const activeAccIds = intersection(board.accountIds || [board.accountId], enabledIds);
          const primaryId = enabledIds.includes(board.accountId)
            ? board.accountId
            : activeAccIds[0] || board.accountId;
          const owner = accountById[primaryId];
          return {
            ...board,
            accountId: primaryId,
            accountIds: activeAccIds,
            accountLabel: owner?.label || board.accountLabel,
            accountColor: owner?.color || board.accountColor,
          };
        }),
        (b) => b.accountIds.length > 0,
      ),
    );

    setLists(
      filter(
        map(sourceLists, (list) => {
          const activeAccIds = intersection(list.accountIds || [list.accountId], enabledIds);
          const primaryId = enabledIds.includes(list.accountId)
            ? list.accountId
            : activeAccIds[0] || list.accountId;
          return {
            ...list,
            accountId: primaryId,
            accountIds: activeAccIds,
          };
        }),
        (l) => l.accountIds.length > 0,
      ),
    );

    setTasks(
      filter(
        map(sourceTasks, (task) => {
          const activeAccIds = intersection(task.accountIds || [task.accountId], enabledIds);
          const primaryId = enabledIds.includes(task.accountId)
            ? task.accountId
            : activeAccIds[0] || task.accountId;
          const owner = accountById[primaryId];
          return {
            ...task,
            accountId: primaryId,
            accountIds: activeAccIds,
            accountLabel: owner?.label || task.accountLabel,
            accountColor: owner?.color || task.accountColor,
          };
        }),
        (t) => t.accountIds.length > 0,
      ),
    );
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
    syncEntitiesWithAccounts,
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
    updateComment,
    deleteComment,
    uploadAttachment,
    deleteAttachment,
    clearTasksState,
  };
});
