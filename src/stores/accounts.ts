import { compact, filter, find, map, reject, some, uniq } from 'lodash-es';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { ACCOUNT_COLORS, accountService } from '@/services/AccountService';
import type { AddAccountInput } from '@/types/api';
import type { ProviderAccount, WorkspaceMember } from '@/types/domain';
import { getErrorMessage } from '@/utils/errorUtils';
import { useFiltersStore } from './filters';
import { useSyncStore } from './sync';
import { useTasksStore } from './tasks';

export { ACCOUNT_COLORS };

export const useAccountsStore = defineStore('accounts', () => {
  const accounts = ref<ProviderAccount[]>(accountService.getInitialAccounts());
  const currentUser = ref<WorkspaceMember | null>(
    find(accounts.value, (a) => a.enabled && Boolean(a.member))?.member || null,
  );

  const hasAccounts = computed(() => accounts.value.length > 0);
  const liveAccounts = computed(() => accounts.value);
  const enabledAccounts = computed(() => filter(accounts.value, 'enabled'));
  const isLiveConnected = computed(() =>
    some(accounts.value, { enabled: true, status: 'connected' }),
  );

  const myMemberIds = computed(
    () =>
      new Set(
        uniq(compact([currentUser.value?.id, ...map(enabledAccounts.value, (a) => a.member?.id)])),
      ),
  );

  const myUsernames = computed(
    () =>
      new Set(
        uniq(
          compact([
            currentUser.value?.username,
            ...map(enabledAccounts.value, (a) => a.member?.username),
          ]),
        ),
      ),
  );

  function findAccount(accountId: string): ProviderAccount | undefined {
    return find(accounts.value, { id: accountId });
  }

  async function addAccount(input: AddAccountInput): Promise<ProviderAccount> {
    const syncStore = useSyncStore();
    syncStore.isLoading = true;
    syncStore.errorMessage = null;

    try {
      const newAcc = await accountService.verifyAndCreateLiveAccount(accounts.value, input);
      accounts.value = [...accounts.value, newAcc];
      accountService.persist(accounts.value);
      await syncStore.syncAllAccounts();
      return newAcc;
    } catch (err: unknown) {
      syncStore.errorMessage = getErrorMessage(err, 'Could not authenticate provider account');
      throw err;
    } finally {
      syncStore.isLoading = false;
    }
  }

  async function updateAccount(
    accountId: string,
    updates: {
      label?: string;
      credentials?: Record<string, string>;
      color?: string;
      enabled?: boolean;
    },
  ) {
    const syncStore = useSyncStore();
    const tasksStore = useTasksStore();
    const acc = findAccount(accountId);
    if (!acc) return;

    let credsChanged = false;
    const nextCreds: Record<string, string> = { ...acc.credentials };
    if (updates.credentials) {
      for (const [key, val] of Object.entries(updates.credentials)) {
        const trimmed = val.trim();
        if ((acc.credentials[key] ?? '') !== trimmed) {
          credsChanged = true;
        }
        nextCreds[key] = trimmed;
      }
    }

    const nextLabel = updates.label !== undefined ? updates.label.trim() || acc.label : acc.label;
    const nextColor = updates.color !== undefined ? updates.color : acc.color;
    const nextEnabled = updates.enabled !== undefined ? updates.enabled : acc.enabled;

    if (!acc.workspaceName && acc.label !== nextLabel) {
      acc.workspaceName = acc.label;
    }

    acc.credentials = nextCreds;
    acc.label = nextLabel;
    acc.color = nextColor;
    acc.enabled = nextEnabled;

    if (credsChanged) {
      acc.member = await accountService.verifyAccountCredentials(acc);
    } else {
      accountService.invalidateConnector(accountId);
    }

    accounts.value = [...accounts.value];
    accountService.persist(accounts.value);

    for (const board of tasksStore.boards) {
      if (board.accountId === accountId) {
        board.accountLabel = nextLabel;
        board.accountColor = nextColor;
      }
    }
    for (const task of tasksStore.tasks) {
      if (task.accountId === accountId) {
        task.accountLabel = nextLabel;
        task.accountColor = nextColor;
      }
    }

    if (credsChanged || updates.enabled !== undefined) {
      await syncStore.syncAllAccounts(true);
    }
  }

  async function toggleAccountEnabled(accountId: string) {
    const filtersStore = useFiltersStore();
    const syncStore = useSyncStore();
    const tasksStore = useTasksStore();
    const acc = findAccount(accountId);
    if (!acc) return;

    const nextEnabled = !acc.enabled;
    acc.enabled = nextEnabled;
    acc.status = nextEnabled ? 'syncing' : 'idle';
    acc.error = null;

    accounts.value = [...accounts.value];
    accountService.persist(accounts.value);

    if (filtersStore.selectedAccountId === accountId && !nextEnabled) {
      filtersStore.selectedAccountId = null;
    }

    if (!nextEnabled) {
      tasksStore.syncEntitiesWithAccounts(accounts.value);
      currentUser.value =
        find(accounts.value, (a) => a.enabled && Boolean(a.member))?.member || null;
    }

    await syncStore.syncAllAccounts(true);
  }

  async function removeAccount(accountId: string) {
    const filtersStore = useFiltersStore();
    const syncStore = useSyncStore();

    accounts.value = reject(accounts.value, { id: accountId });
    if (filtersStore.selectedAccountId === accountId) {
      filtersStore.selectedAccountId = null;
    }

    if (accounts.value.length === 0) {
      await clearAllAccounts();
      return;
    }

    accountService.persist(accounts.value);
    await syncStore.syncAllAccounts(true);
  }

  async function clearAllAccounts() {
    const tasksStore = useTasksStore();
    const filtersStore = useFiltersStore();
    const syncStore = useSyncStore();

    accountService.clearPersisted();
    accounts.value = [];
    currentUser.value = null;

    tasksStore.clearTasksState();
    filtersStore.resetFilters();
    syncStore.errorMessage = null;
  }

  return {
    accounts,
    currentUser,
    hasAccounts,
    liveAccounts,
    enabledAccounts,
    isLiveConnected,
    myMemberIds,
    myUsernames,
    findAccount,
    addAccount,
    updateAccount,
    toggleAccountEnabled,
    removeAccount,
    clearAllAccounts,
  };
});
