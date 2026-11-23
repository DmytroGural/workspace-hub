import type { CreateTaskInput } from '@/types/api';
import type {
  BoardList,
  ProviderAccount,
  TaskBoard,
  TaskInterface,
  TaskLabel,
  WorkspaceMember,
} from '@/types/domain';
import { classifyTaskSection } from '@/utils/taskClassification';
import { taskCollaborationService } from './TaskCollaborationService';
import {
  assertCapability,
  getActiveConnector,
  getCapabilities,
  localId,
  runOptimisticUpdate,
} from './taskHelpers';

export class TaskMutationService {
  async refreshTask(
    task: TaskInterface,
    board: TaskBoard | undefined,
    lists: BoardList[],
    account?: ProviderAccount,
  ): Promise<{ task: TaskInterface; updatedLists?: BoardList[] } | null> {
    if (!account?.enabled || !board) return null;
    const connector = getActiveConnector(account);
    if (!connector) return null;

    const boardLists = lists.filter((l) => l.idBoard === board.id);
    const fresh = await connector.getCard(task.id, board, boardLists);
    if (!fresh) return null;

    if (fresh.idList && !boardLists.some((l) => l.id === fresh.idList)) {
      const refreshedLists = await connector.getListsForBoard(board.id);
      const matchedList = refreshedLists.find((l) => l.id === fresh.idList);
      if (matchedList) {
        fresh.listName = matchedList.name;
      }
      return { task: fresh, updatedLists: refreshedLists };
    }

    return { task: fresh };
  }

  /**
   * Toggles task completion state. Returns the new `dueComplete` boolean.
   */
  async toggleTaskComplete(task: TaskInterface, account?: ProviderAccount): Promise<boolean> {
    assertCapability(account, 'canToggleComplete', 'Completing tasks', task.provider);

    const prevComplete = task.dueComplete;
    const prevSection = task.section;
    const nextState = !task.dueComplete;

    await runOptimisticUpdate({
      account,
      apply: () => {
        task.dueComplete = nextState;
        task.section = nextState ? 'completed' : classifyTaskSection(task.due, false);
      },
      rollback: () => {
        task.dueComplete = prevComplete;
        task.section = prevSection;
      },
      remote: (connector) => connector.updateCardComplete?.(task.id, nextState),
      missingMethodMessage: `Provider "${account?.provider}" does not implement task completion updates`,
    });

    return nextState;
  }

  async updateTask(
    task: TaskInterface,
    updates: Partial<TaskInterface>,
    lists: BoardList[],
    account?: ProviderAccount,
  ): Promise<void> {
    const isMoveOnly =
      (updates.idList !== undefined || updates.pos !== undefined) &&
      updates.name === undefined &&
      updates.desc === undefined &&
      updates.due === undefined;

    assertCapability(
      account,
      isMoveOnly ? 'canMoveBetweenLists' : 'canEditTask',
      isMoveOnly ? 'Moving tasks between lists' : 'Editing tasks',
      task.provider,
    );

    const previousSnapshot: Partial<TaskInterface> = {
      name: task.name,
      desc: task.desc,
      due: task.due,
      section: task.section,
      idList: task.idList,
      pos: task.pos,
      listName: task.listName,
    };

    await runOptimisticUpdate({
      account,
      apply: () => {
        Object.assign(task, updates);
        if (updates.due !== undefined) {
          task.section = classifyTaskSection(task.due, task.dueComplete);
        }
        if (updates.idList) {
          const listObj = lists.find((l) => l.id === updates.idList);
          if (listObj) {
            task.listName = listObj.name;
          }
        }
      },
      rollback: () => {
        Object.assign(task, previousSnapshot);
      },
      remote: (connector) =>
        connector.updateCard?.(task.id, {
          name: updates.name,
          desc: updates.desc,
          due: updates.due,
          idList: updates.idList,
          pos: updates.pos,
          closed: updates.closed,
        }),
      missingMethodMessage: `Provider "${account?.provider}" does not implement task updates`,
    });
  }

  async archiveTask(task: TaskInterface, account?: ProviderAccount): Promise<void> {
    assertCapability(account, 'canArchiveTask', 'Archiving tasks', task.provider);
    const previousClosed = task.closed;

    await runOptimisticUpdate({
      account,
      apply: () => {
        task.closed = true;
      },
      rollback: () => {
        task.closed = previousClosed;
      },
      remote: (connector) => connector.updateCard?.(task.id, { closed: true }),
      missingMethodMessage: `Provider "${account?.provider}" does not implement task archiving`,
    });
  }

  async deleteTask(task: TaskInterface, account?: ProviderAccount): Promise<void> {
    assertCapability(account, 'canDeleteTask', 'Deleting tasks', task.provider);

    const connector = getActiveConnector(account);
    if (connector) {
      if (!connector.deleteCard) {
        throw new Error(`Provider "${account?.provider}" does not implement task deletion`);
      }
      await connector.deleteCard(task.id);
    }
  }

  async createTask(
    input: CreateTaskInput,
    targetBoard: TaskBoard | undefined,
    targetList: BoardList | undefined,
    account: ProviderAccount | undefined,
    fallbackMember: WorkspaceMember,
  ): Promise<TaskInterface> {
    const caps = getCapabilities(account);
    if (!caps.canCreateTask) {
      throw new Error(
        `Creating tasks is not supported by provider "${account?.provider || targetBoard?.provider || 'unknown'}"`,
      );
    }

    const authorMember = account?.member || fallbackMember;
    const provider = account?.provider || targetBoard?.provider || '';
    const selectedLabels = input.labels ? input.labels.map((l) => ({ ...l })) : [];
    const selectedAssignees =
      input.assignees !== undefined ? input.assignees.map((m) => ({ ...m })) : [authorMember];

    const newTask: TaskInterface = {
      id: localId('task'),
      provider,
      name: input.name,
      desc: input.desc || '',
      due: input.due || null,
      dueComplete: false,
      idBoard: input.idBoard,
      idList: input.idList,
      idMembers: selectedAssignees.map((m) => m.id),
      labels: selectedLabels,
      url: targetBoard?.url || '',
      accountId: account?.id || targetBoard?.accountId || '',
      accountLabel: targetBoard?.accountLabel || account?.label || 'Workspace',
      accountColor: targetBoard?.accountColor || account?.color || '#4573d2',
      accountIds: targetBoard?.accountIds || (account?.id ? [account.id] : []),
      boardName: targetBoard?.name || 'Board',
      boardColor: targetBoard?.prefs?.backgroundColor || '#4573d2',
      listName: targetList?.name || 'To Do',
      assignedMembers: selectedAssignees,
      section: classifyTaskSection(input.due || null, false),
      checklists: [],
      commentsCount: 0,
    };

    const connector = getActiveConnector(account);
    if (connector) {
      if (!connector.createCard) {
        throw new Error(`Provider "${account?.provider}" does not implement task creation`);
      }
      const created = await connector.createCard({
        idList: input.idList,
        idBoard: input.idBoard,
        name: input.name,
        desc: input.desc,
        due: input.due,
        labelIds: selectedLabels.map((l) => l.id),
        memberIds: selectedAssignees.map((m) => m.id),
      });
      newTask.id = created.id;
      newTask.url = created.url;
    }

    if (input.files && input.files.length > 0 && caps.canManageAttachments) {
      for (const file of input.files) {
        await taskCollaborationService.uploadTaskAttachment(newTask, file, account);
      }
    }

    return newTask;
  }

  async loadBoardMembers(boardId: string, account?: ProviderAccount): Promise<WorkspaceMember[]> {
    if (!getCapabilities(account).canAssignMembers) return [];
    const connector = getActiveConnector(account);
    return connector?.getBoardMembers ? connector.getBoardMembers(boardId) : [];
  }

  async toggleTaskAssignee(
    task: TaskInterface,
    member: WorkspaceMember,
    account?: ProviderAccount,
  ): Promise<void> {
    assertCapability(account, 'canAssignMembers', 'Assigning members', task.provider);

    const exists =
      task.idMembers.includes(member.id) || task.assignedMembers.some((m) => m.id === member.id);
    const previousIds = [...task.idMembers];
    const previousMembers = [...task.assignedMembers];

    await runOptimisticUpdate({
      account,
      apply: () => {
        if (exists) {
          task.idMembers = task.idMembers.filter((id) => id !== member.id);
          task.assignedMembers = task.assignedMembers.filter((m) => m.id !== member.id);
        } else {
          task.idMembers = [...task.idMembers, member.id];
          task.assignedMembers = [...task.assignedMembers, { ...member }];
        }
      },
      rollback: () => {
        task.idMembers = previousIds;
        task.assignedMembers = previousMembers;
      },
      remote: (connector) => connector.toggleCardMember?.(task.id, member.id, !exists),
      missingMethodMessage: `Provider "${account?.provider}" does not implement member assignment`,
    });
  }

  async loadBoardLabels(boardId: string, account?: ProviderAccount): Promise<TaskLabel[]> {
    if (!getCapabilities(account).canManageLabels) return [];
    const connector = getActiveConnector(account);
    return connector?.getBoardLabels ? connector.getBoardLabels(boardId) : [];
  }

  async toggleTaskLabel(
    task: TaskInterface,
    label: TaskLabel,
    account?: ProviderAccount,
  ): Promise<void> {
    assertCapability(account, 'canManageLabels', 'Managing labels', task.provider);

    const exists = task.labels.some((l) => l.id === label.id);
    const previousLabels = [...task.labels];

    await runOptimisticUpdate({
      account,
      apply: () => {
        task.labels = exists
          ? task.labels.filter((l) => l.id !== label.id)
          : [...task.labels, { ...label }];
      },
      rollback: () => {
        task.labels = previousLabels;
      },
      remote: (connector) => connector.toggleCardLabel?.(task.id, label.id, !exists),
      missingMethodMessage: `Provider "${account?.provider}" does not implement label toggling`,
    });
  }

  async createBoardLabel(
    boardId: string,
    name: string,
    color: string,
    account?: ProviderAccount,
  ): Promise<TaskLabel> {
    const caps = getCapabilities(account);
    if (!caps.canCreateLabels || !caps.canManageLabels) {
      throw new Error(
        `Creating labels is not supported by provider "${account?.provider || 'default'}"`,
      );
    }

    const connector = getActiveConnector(account);
    if (connector?.createBoardLabel) {
      return connector.createBoardLabel(boardId, name.trim(), color);
    }

    return {
      id: localId('lbl'),
      idBoard: boardId,
      name: name.trim(),
      color,
    };
  }

  async createAndAttachLabel(
    task: TaskInterface,
    name: string,
    color: string,
    account?: ProviderAccount,
  ): Promise<TaskLabel> {
    const created = await this.createBoardLabel(task.idBoard, name, color, account);
    const connector = getActiveConnector(account);
    if (connector?.toggleCardLabel) {
      await connector.toggleCardLabel(task.id, created.id, true);
    }

    if (!task.labels.some((l) => l.id === created.id)) {
      task.labels = [...task.labels, created];
    }
    return created;
  }

  async toggleCheckItem(
    task: TaskInterface,
    checklistId: string,
    itemId: string,
    account?: ProviderAccount,
  ): Promise<void> {
    assertCapability(account, 'canToggleSubtasks', 'Toggling subtasks', task.provider);

    const checklist = task.checklists?.find((c) => c.id === checklistId);
    const item = checklist?.checkItems.find((i) => i.id === itemId);
    if (!item) return;

    const prevState = item.state;
    const nextState: 'complete' | 'incomplete' =
      prevState === 'complete' ? 'incomplete' : 'complete';

    await runOptimisticUpdate({
      account,
      apply: () => {
        item.state = nextState;
      },
      rollback: () => {
        item.state = prevState;
      },
      remote: (connector) => connector.toggleCheckItem?.(task.id, itemId, nextState),
      missingMethodMessage: `Provider "${account?.provider}" does not implement subtask updates`,
    });
  }
}

export const taskMutationService = new TaskMutationService();
