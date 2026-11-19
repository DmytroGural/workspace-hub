import type { ProviderAccount } from '@/types/domain';

const STORAGE_KEYS = {
  ACCOUNTS: 'workspace_hub_accounts',
  PAGE_SIZE: 'workspace_hub_page_size',
  ONLY_ASSIGNED_TO_ME: 'workspace_hub_only_assigned_to_me',
  DRAWER_WIDTH: 'workspace_hub_drawer_width',
} as const;

function normalizeStoredAccount(raw: Partial<ProviderAccount>): ProviderAccount | null {
  if (!raw || typeof raw !== 'object' || !raw.id || !raw.provider) {
    return null;
  }

  return {
    id: String(raw.id),
    provider: raw.provider,
    label: String(raw.label || raw.id),
    credentials:
      typeof raw.credentials === 'object' && raw.credentials !== null ? { ...raw.credentials } : {},
    color: raw.color || '#4573d2',
    enabled: raw.enabled ?? true,
    status: raw.status || 'idle',
    error: raw.error ?? null,
    member: raw.member ?? null,
    lastSyncedAt: raw.lastSyncedAt ?? null,
  };
}

export class StorageService {
  loadSavedLiveAccounts(): ProviderAccount[] | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const accounts: ProviderAccount[] = [];
        for (const item of parsed) {
          const normalized = normalizeStoredAccount(item);
          if (normalized) {
            accounts.push(normalized);
          }
        }
        return accounts.length > 0 ? accounts : null;
      }
    } catch {
      return null;
    }
    return null;
  }

  saveLiveAccounts(accounts: ProviderAccount[]): void {
    try {
      if (accounts.length > 0) {
        localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
      } else {
        this.clearAllAccounts();
      }
    } catch {
      // Ignore storage errors
    }
  }

  clearAllAccounts(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.ACCOUNTS);
      localStorage.removeItem('workspace_hub_vault_seed');
    } catch {
      // Ignore storage errors
    }
  }

  loadPageSize(fallback = 10): number {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PAGE_SIZE);
      const val = Number(raw);
      return [5, 10, 25, 50].includes(val) ? val : fallback;
    } catch {
      return fallback;
    }
  }

  savePageSize(size: number): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PAGE_SIZE, String(size));
    } catch {
      // Ignore storage errors
    }
  }

  loadOnlyAssignedToMe(fallback = true): boolean {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.ONLY_ASSIGNED_TO_ME);
      if (raw === null) return fallback;
      return raw === 'true';
    } catch {
      return fallback;
    }
  }

  saveOnlyAssignedToMe(value: boolean): void {
    try {
      localStorage.setItem(STORAGE_KEYS.ONLY_ASSIGNED_TO_ME, String(value));
    } catch {
      // Ignore storage errors
    }
  }

  loadDrawerWidth(fallback = 680): number {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.DRAWER_WIDTH);
      if (!raw) return fallback;
      const val = Number(raw);
      return Number.isFinite(val) && val >= 320 && val <= 2400 ? val : fallback;
    } catch {
      return fallback;
    }
  }

  saveDrawerWidth(width: number): void {
    try {
      localStorage.setItem(STORAGE_KEYS.DRAWER_WIDTH, String(Math.round(width)));
    } catch {
      // Ignore storage errors
    }
  }
}

export const storageService = new StorageService();
