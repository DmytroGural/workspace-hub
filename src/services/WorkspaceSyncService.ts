import { compact, filter, map, uniq } from 'lodash-es';
import { connectorRegistry } from '@/connectors';
import type { SyncProgressCallback, WorkspaceSyncResult } from '@/types/api';
import type { BoardList, ProviderAccount, TaskBoard, TaskInterface } from '@/types/domain';
import { nowIso } from '@/utils/dateUtils';
import { getErrorMessage } from '@/utils/errorUtils';

function appendUniqueAccountId(
  entity: { accountId: string; accountIds?: string[] },
  accountId: string,
): void {
  entity.accountIds = uniq([...(entity.accountIds || [entity.accountId]), accountId]);
}

function mergeAccountEntity<T extends { id: string; accountId: string; accountIds?: string[] }>(
  targetMap: Map<string, T>,
  incoming: T,
  accountId: string,
): boolean {
  const existing = targetMap.get(incoming.id);
  if (existing) {
    appendUniqueAccountId(existing, accountId);
    return false;
  }
  incoming.accountIds = [accountId];
  targetMap.set(incoming.id, incoming);
  return true;
}

export class WorkspaceSyncService {
  async syncEnabledAccounts(
    accounts: ProviderAccount[],
    onProgress?: SyncProgressCallback,
  ): Promise<WorkspaceSyncResult> {
    const boardsMap = new Map<string, TaskBoard>();
    const listsMap = new Map<string, BoardList>();
    const tasksMap = new Map<string, TaskInterface>();
    const errors: string[] = [];
    const syncedBoardIds = new Set<string>();

    const disabledWorkspaceNames = new Set<string>();
    const enabledWorkspaceNames = new Set<string>();
    for (const acc of accounts) {
      const names = compact(
        map([acc.workspaceName, acc.label], (s) => (s || '').trim().toLowerCase()),
      );
      for (const n of names) {
        if (acc.enabled) {
          enabledWorkspaceNames.add(n);
        } else {
          disabledWorkspaceNames.add(n);
        }
      }
    }

    for (const acc of accounts) {
      if (!acc.enabled) {
        acc.status = 'idle';
        acc.error = null;
        continue;
      }

      acc.status = 'syncing';
      acc.error = null;

      try {
        const connector = connectorRegistry.getConnector(acc);
        if (!acc.member) {
          acc.member = await connector.testConnection();
        }

        const payload = await connector.fetchAllCrossBoardTasks((curr, total, boardName) => {
          if (onProgress) {
            onProgress(curr, total, `${acc.label}: ${boardName}`);
          }
        }, syncedBoardIds);

        if (!acc.enabled) {
          acc.status = 'idle';
          continue;
        }

        const allowedBoards = filter(payload.boards, (b) => {
          const wsName = (b.workspaceName || '').trim().toLowerCase();
          const wsId = (b.workspaceId || '').trim().toLowerCase();
          if (
            (wsName && disabledWorkspaceNames.has(wsName) && !enabledWorkspaceNames.has(wsName)) ||
            (wsId && disabledWorkspaceNames.has(wsId) && !enabledWorkspaceNames.has(wsId))
          ) {
            return false;
          }
          return true;
        });

        const allowedBoardIds = new Set(map(allowedBoards, 'id'));
        if (allowedBoards.length > 0 && !acc.workspaceName) {
          const uniqueWs = uniq(compact(map(allowedBoards, 'workspaceName')));
          if (uniqueWs.length === 1) {
            acc.workspaceName = uniqueWs[0];
          }
        }

        for (const incomingBoard of allowedBoards) {
          if (mergeAccountEntity(boardsMap, incomingBoard, acc.id)) {
            syncedBoardIds.add(incomingBoard.id);
          }
        }

        for (const incomingList of payload.lists) {
          if (allowedBoardIds.has(incomingList.idBoard)) {
            mergeAccountEntity(listsMap, incomingList, acc.id);
          }
        }

        for (const incomingTask of payload.tasks) {
          if (allowedBoardIds.has(incomingTask.idBoard)) {
            mergeAccountEntity(tasksMap, incomingTask, acc.id);
          }
        }

        // Link this account ID to any lists/tasks of boards shared with a previously synced account
        for (const list of listsMap.values()) {
          if (allowedBoardIds.has(list.idBoard)) {
            appendUniqueAccountId(list, acc.id);
          }
        }
        for (const task of tasksMap.values()) {
          if (allowedBoardIds.has(task.idBoard)) {
            appendUniqueAccountId(task, acc.id);
          }
        }

        acc.status = 'connected';
        acc.lastSyncedAt = nowIso();
      } catch (err: unknown) {
        const msg = getErrorMessage(err, 'Sync failed');
        acc.status = 'error';
        acc.error = msg;
        errors.push(`${acc.label}: ${msg}`);
      }
    }

    return {
      boards: Array.from(boardsMap.values()),
      lists: Array.from(listsMap.values()),
      tasks: Array.from(tasksMap.values()),
      errors,
    };
  }

  /**
   * Fetches fresh lists and tasks for a single board via its provider connector.
   */
  async syncSingleBoard(
    board: TaskBoard,
    account: ProviderAccount,
  ): Promise<{ lists: BoardList[]; tasks: TaskInterface[] }> {
    if (!account.enabled) {
      account.status = 'idle';
      return { lists: [], tasks: [] };
    }
    const connector = connectorRegistry.getConnector(account);
    const boardLists = await connector.getListsForBoard(board.id);
    const boardTasks = await connector.getCardsForBoard(board, boardLists);
    if (!account.enabled) {
      account.status = 'idle';
      return { lists: [], tasks: [] };
    }
    account.status = 'connected';
    account.error = null;
    account.lastSyncedAt = nowIso();
    return { lists: boardLists, tasks: boardTasks };
  }
}

export const workspaceSyncService = new WorkspaceSyncService();
