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
    accounts.value.find((a) => a.enabled && Boolean(a.member))?.member || null,
  );

  const hasAccounts = computed(() => accounts.value.length > 0);
  const liveAccounts = computed(() => accounts.value);
  const enabledAccounts = computed(() => accounts.value.filter((a) => a.enabled));
  const isLiveConnected = computed(() =>
    accounts.value.some((a) => a.enabled && a.status === 'connected'),
  );

  const myMemberIds = computed(() => {
    const ids = new Set<string>();
    if (currentUser.value?.id) ids.add(currentUser.value.id);
    for (const acc of enabledAccounts.value) {
      if (acc.member?.id) ids.add(acc.member.id);
    }
    return ids;
  });

  const myUsernames = computed(() => {
    const names = new Set<string>();
    if (currentUser.value?.username) names.add(currentUser.value.username);
    for (const acc of enabledAccounts.value) {
      if (acc.member?.username) names.add(acc.member.username);
    }
    return names;
  });

  function findAccount(accountId: string): ProviderAccount | undefined {
    return accounts.value.find((a) => a.id === accountId);
  }

  /**
   * Resolves the best matching account for a multi-account entity (board, list, or task).
   */
  function resolveAccountForEntity(
    entity?: { accountId: string; accountIds?: string[] },
    options: { enabledOnly?: boolean; fallbackToAnyEnabled?: boolean } = {},
  ): ProviderAccount | undefined {
    const { enabledOnly = false, fallbackToAnyEnabled = false } = options;

    if (!entity) {
      return fallbackToAnyEnabled
        ? accounts.value.find((a) => a.enabled) || accounts.value[0]
        : undefined;
    }

    let acc = findAccount(entity.accountId);
    if (!acc?.enabled && entity.accountIds) {
      acc = accounts.value.find((a) => a.enabled && Boolean(entity.accountIds?.includes(a.id)));
    }

    if (enabledOnly) {
      return acc?.enabled ? acc : undefined;
    }

    return (
      acc ||
      findAccount(entity.accountId) ||
      (fallbackToAnyEnabled ? accounts.value.find((a) => a.enabled) : undefined)
    );
  }

  async function addAccount(input: AddAccountInput): Promise<ProviderAccount> {
    const syncStore = useSyncStore();
    syncStore.clearError();

    return syncStore.runWithSyncIndicator(async () => {
      try {
        const newAcc = await accountService.verifyAndCreateLiveAccount(accounts.value, input);
        accounts.value = [...accounts.value, newAcc];
        accountService.persist(accounts.value);
        await syncStore.syncAllAccounts();
        return newAcc;
      } catch (err: unknown) {
        syncStore.setError(getErrorMessage(err, 'Could not authenticate provider account'));
        throw err;
      }
    });
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
    tasksStore.updateAccountMetadata(accountId, nextLabel, nextColor);

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
        accounts.value.find((a) => a.enabled && Boolean(a.member))?.member || null;
    }

    await syncStore.syncAllAccounts(true);
  }

  async function removeAccount(accountId: string) {
    const filtersStore = useFiltersStore();
    const syncStore = useSyncStore();

    accounts.value = accounts.value.filter((a) => a.id !== accountId);
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
    syncStore.clearError();
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
    resolveAccountForEntity,
    addAccount,
    updateAccount,
    toggleAccountEnabled,
    removeAccount,
    clearAllAccounts,
  };
});
