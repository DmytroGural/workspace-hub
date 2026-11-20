import { connectorRegistry } from '@/connectors';
import type { AddAccountInput } from '@/types/api';
import type { ProviderAccount } from '@/types/domain';
import { nowIso, nowMillis } from '@/utils/dateUtils';
import { storageService } from './StorageService';

export const ACCOUNT_COLORS: string[] = [
  '#4573d2', // Asana Indigo
  '#ac92ec', // Purple
  '#37bc9b', // Teal
  '#f28b49', // Orange
  '#f06a6a', // Coral Red
  '#ec87c0', // Pink
  '#4fc1e9', // Sky Blue
];

export class AccountService {
  getInitialAccounts(): ProviderAccount[] {
    return storageService.loadSavedLiveAccounts() || [];
  }

  async verifyAndCreateLiveAccount(
    existingAccounts: ProviderAccount[],
    input: AddAccountInput,
  ): Promise<ProviderAccount> {
    const plugin = connectorRegistry.getPlugin(input.provider);
    const providerName = plugin.descriptor.name;
    const accountCount = existingAccounts.length;
    const id = `acc_${nowMillis()}_${Math.random().toString(36).slice(2, 6)}`;
    const color = input.color || ACCOUNT_COLORS[accountCount % ACCOUNT_COLORS.length];
    const label = input.label.trim() || `${providerName} Account ${accountCount + 1}`;

    const normalizedCreds: Record<string, string> = {};
    for (const [k, v] of Object.entries(input.credentials)) {
      normalizedCreds[k] = v.trim();
    }

    const draft: ProviderAccount = {
      id,
      provider: input.provider,
      label,
      credentials: normalizedCreds,
      color,
      enabled: true,
      status: 'syncing',
      error: null,
      member: null,
      lastSyncedAt: null,
    };

    const connector = connectorRegistry.createEphemeralConnector(draft);
    const member = await connector.testConnection();

    return {
      ...draft,
      status: 'connected',
      member,
      lastSyncedAt: nowIso(),
    };
  }

  async verifyAccountCredentials(account: ProviderAccount) {
    connectorRegistry.invalidate(account.id);
    const connector = connectorRegistry.getConnector(account);
    return connector.testConnection();
  }

  invalidateConnector(accountId: string): void {
    connectorRegistry.invalidate(accountId);
  }

  persist(accounts: ProviderAccount[]): void {
    storageService.saveLiveAccounts(accounts);
  }

  clearPersisted(): void {
    storageService.clearAllAccounts();
    connectorRegistry.clear();
  }
}

export const accountService = new AccountService();
