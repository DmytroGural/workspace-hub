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
    accounts.value.find((a) => a.enabled && a.member)?.member || null,
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
    accounts.value.forEach((a) => {
      if (a.enabled && a.member?.id) ids.add(a.member.id);
    });
    return ids;
  });

  const myUsernames = computed(() => {
    const names = new Set<string>();
    if (currentUser.value?.username) names.add(currentUser.value.username);
    accounts.value.forEach((a) => {
      if (a.enabled && a.member?.username) names.add(a.member.username);
    });
    return names;
  });

  function findAccount(accountId: string): ProviderAccount | undefined {
    return accounts.value.find((a) => a.id === accountId);
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
    const acc = findAccount(accountId);
    if (!acc) return;

    let credsChanged = false;
    if (updates.credentials) {
      const nextCreds: Record<string, string> = { ...acc.credentials };
      for (const [key, val] of Object.entries(updates.credentials)) {
        const trimmed = val.trim();
        if ((acc.credentials[key] ?? '') !== trimmed) {
          credsChanged = true;
        }
        nextCreds[key] = trimmed;
      }
      acc.credentials = nextCreds;
    }

    if (updates.label !== undefined) acc.label = updates.label.trim() || acc.label;
    if (updates.color !== undefined) acc.color = updates.color;
    if (updates.enabled !== undefined) acc.enabled = updates.enabled;

    if (credsChanged) {
      acc.member = await accountService.verifyAccountCredentials(acc);
    }

    accountService.persist(accounts.value);
    await syncStore.syncAllAccounts();
  }

  async function toggleAccountEnabled(accountId: string) {
    const filtersStore = useFiltersStore();
    const syncStore = useSyncStore();
    const acc = findAccount(accountId);
    if (!acc) return;

    acc.enabled = !acc.enabled;
    if (filtersStore.selectedAccountId === accountId && !acc.enabled) {
      filtersStore.selectedAccountId = null;
    }

    accountService.persist(accounts.value);
    await syncStore.syncAllAccounts();
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
    await syncStore.syncAllAccounts();
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
