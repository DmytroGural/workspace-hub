import { filter, find, intersection, map, reject } from 'lodash-es';
import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { workspaceSyncService } from '@/services/WorkspaceSyncService';
import type { ProviderAccount, TaskBoard } from '@/types/domain';
import { nowMillis } from '@/utils/dateUtils';
import { getErrorMessage } from '@/utils/errorUtils';
import { useAccountsStore } from './accounts';
import { useFiltersStore } from './filters';
import { useTasksStore } from './tasks';

export interface SyncLoadingProgress {
  current: number;
  total: number;
  boardName: string;
}

export interface RefreshTasksOptions {
  minIntervalMs?: number;
}

const INITIAL_LOADING_PROGRESS: SyncLoadingProgress = {
  current: 0,
  total: 0,
  boardName: '',
};

const ACCOUNT_FILTER_SYNC_THROTTLE_MS = 1500;

function resolveAccountForBoard(
  board: TaskBoard,
  accounts: ProviderAccount[],
): ProviderAccount | undefined {
  let account = find(accounts, { id: board.accountId });
  if (!account?.enabled && board.accountIds) {
    account = find(accounts, (a) => a.enabled && Boolean(board.accountIds?.includes(a.id)));
  }
  return account?.enabled ? account : undefined;
}

export const useSyncStore = defineStore('sync', () => {
  const accountsStore = useAccountsStore();
  const tasksStore = useTasksStore();
  const filtersStore = useFiltersStore();

  // Reactive state
  const isLoading = ref(false);
  const loadingProgress = ref<SyncLoadingProgress>({ ...INITIAL_LOADING_PROGRESS });
  const errorMessage = ref<string | null>(null);

  // Synchronization coordination
  let activeSyncCount = 0;
  let lastFullSyncAt = 0;
  let inFlightFullSync: Promise<void> | null = null;
  let pendingResync = false;
  const inFlightBoardSyncs = new Map<string, Promise<void>>();
  let hasBootstrapped = false;

  function beginSync() {
    activeSyncCount += 1;
    isLoading.value = true;
  }

  function endSync() {
    activeSyncCount = Math.max(0, activeSyncCount - 1);
    isLoading.value = activeSyncCount > 0;
    if (activeSyncCount === 0) {
      loadingProgress.value = { ...INITIAL_LOADING_PROGRESS };
    }
  }

  async function withSyncScope<T>(fn: () => Promise<T>): Promise<T> {
    beginSync();
    try {
      return await fn();
    } finally {
      endSync();
    }
  }

  /**
   * Syncs all enabled accounts across the workspace.
   * If a full sync is already in flight, returns the existing promise (or queues a resync when force=true).
   */
  async function syncAllAccounts(force = false): Promise<void> {
    if (inFlightFullSync) {
      if (force) {
        pendingResync = true;
      }
      await inFlightFullSync;
      if (pendingResync) {
        pendingResync = false;
        return syncAllAccounts();
      }
      return;
    }

    if (accountsStore.accounts.length === 0) {
      tasksStore.clearTasksState();
      accountsStore.currentUser = null;
      errorMessage.value = null;
      loadingProgress.value = { ...INITIAL_LOADING_PROGRESS };
      return;
    }

    inFlightFullSync = withSyncScope(async () => {
      errorMessage.value = null;

      try {
        const result = await workspaceSyncService.syncEnabledAccounts(
          accountsStore.accounts,
          (current, total, boardName) => {
            loadingProgress.value = { current, total, boardName };
          },
        );

        tasksStore.syncEntitiesWithAccounts(accountsStore.accounts, result);

        const firstMember =
          find(accountsStore.accounts, (a) => a.enabled && Boolean(a.member))?.member || null;
        accountsStore.currentUser = firstMember;

        if (result.errors.length > 0) {
          errorMessage.value = `Some accounts failed to sync — ${result.errors.join('; ')}`;
        }
        lastFullSyncAt = nowMillis();
      } finally {
        inFlightFullSync = null;
      }
    });

    await inFlightFullSync;
    if (pendingResync) {
      pendingResync = false;
      return syncAllAccounts();
    }
  }

  /**
   * Syncs fresh lists and tasks for a specific board.
   * Dedupes concurrent syncs for the same board.
   */
  async function syncBoardById(boardId: string): Promise<void> {
    if (!boardId) return;

    if (inFlightFullSync) {
      await inFlightFullSync;
    }

    const existingSync = inFlightBoardSyncs.get(boardId);
    if (existingSync) {
      return existingSync;
    }

    const run = withSyncScope(async () => {
      try {
        let board = find(tasksStore.boards, { id: boardId });
        if (!board) {
          await syncAllAccounts();
          board = find(tasksStore.boards, { id: boardId });
          if (!board) return;
        }

        const targetBoard = board;
        const account = resolveAccountForBoard(targetBoard, accountsStore.accounts);
        if (!account) return;

        const { lists: freshLists, tasks: freshTasks } = await workspaceSyncService.syncSingleBoard(
          targetBoard,
          account,
        );
        if (!account.enabled) return;

        const enabledIds = map(filter(accountsStore.accounts, 'enabled'), 'id');
        const syncedAccountIds = intersection(targetBoard.accountIds || [account.id], enabledIds);

        for (const l of freshLists) {
          l.accountIds = [...syncedAccountIds];
        }
        for (const t of freshTasks) {
          t.accountIds = [...syncedAccountIds];
          t.accountLabel = account.label;
          t.accountColor = account.color;
        }

        tasksStore.setLists([
          ...reject(tasksStore.lists, { idBoard: targetBoard.id }),
          ...freshLists,
        ]);
        tasksStore.setTasks([
          ...reject(tasksStore.tasks, { idBoard: targetBoard.id }),
          ...freshTasks,
        ]);
      } catch (err: unknown) {
        const boardName = find(tasksStore.boards, { id: boardId })?.name || boardId;
        const msg = getErrorMessage(err, 'Board sync failed');
        errorMessage.value = `Failed to refresh "${boardName}": ${msg}`;
      } finally {
        inFlightBoardSyncs.delete(boardId);
      }
    });

    inFlightBoardSyncs.set(boardId, run);
    return run;
  }

  function ensureBootstrap() {
    if (hasBootstrapped) return;
    hasBootstrapped = true;
    void syncAllAccounts();
  }

  async function refreshTasks(options?: RefreshTasksOptions | Event) {
    const minIntervalMs =
      options && typeof options === 'object' && 'minIntervalMs' in options
        ? (options.minIntervalMs ?? 0)
        : 0;

    if (minIntervalMs > 0 && nowMillis() - lastFullSyncAt < minIntervalMs) {
      return;
    }
    await syncAllAccounts();
  }

  async function refreshBoard(boardId: string) {
    await syncBoardById(boardId);
  }

  // Refresh if user switches account filter and data might be stale
  watch(
    () => filtersStore.selectedAccountId,
    () => {
      if (!hasBootstrapped) return;
      if (nowMillis() - lastFullSyncAt > ACCOUNT_FILTER_SYNC_THROTTLE_MS) {
        void syncAllAccounts();
      }
    },
  );

  return {
    isLoading,
    loadingProgress,
    errorMessage,
    syncAllAccounts,
    syncBoardById,
    ensureBootstrap,
    refreshTasks,
    refreshBoard,
  };
});
