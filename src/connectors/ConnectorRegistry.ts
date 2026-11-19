import {
  DEFAULT_PROVIDER_CAPABILITIES,
  type ITaskProviderApi,
  type ProviderCapabilities,
  type ProviderDescriptor,
  type ProviderPlugin,
} from '@/types/api';
import type { ProviderAccount, ProviderId } from '@/types/domain';

interface CachedConnectorEntry {
  fingerprint: string;
  connector: ITaskProviderApi;
}

function serializeCredentials(credentials: Record<string, string>): string {
  return Object.keys(credentials)
    .sort()
    .map((k) => `${k}=${credentials[k] ?? ''}`)
    .join('&');
}

/**
 * Central registry for pluggable task provider plugins (Trello, Asana, Jira, Linear, GitHub, etc.).
 * Caches connector instances per account fingerprint so HTTP clients aren't recreated redundantly.
 */
export class ConnectorRegistry {
  private readonly plugins = new Map<ProviderId, ProviderPlugin>();
  private readonly cache = new Map<string, CachedConnectorEntry>();

  register(plugin: ProviderPlugin): void {
    this.plugins.set(plugin.descriptor.id, plugin);
  }

  hasPlugin(providerId: ProviderId): boolean {
    return this.plugins.has(providerId);
  }

  getPlugin(providerId: ProviderId): ProviderPlugin {
    const plugin = this.plugins.get(providerId);
    if (!plugin) {
      throw new Error(`No connector plugin registered for provider "${providerId}"`);
    }
    return plugin;
  }

  getDescriptor(providerId: ProviderId): ProviderDescriptor | undefined {
    return this.plugins.get(providerId)?.descriptor;
  }

  getCapabilities(providerId?: ProviderId): ProviderCapabilities {
    if (!providerId) return DEFAULT_PROVIDER_CAPABILITIES;
    return this.plugins.get(providerId)?.descriptor.capabilities || DEFAULT_PROVIDER_CAPABILITIES;
  }

  listProviders(): ProviderDescriptor[] {
    return Array.from(this.plugins.values()).map((p) => p.descriptor);
  }

  getConnector(account: ProviderAccount): ITaskProviderApi {
    const fingerprint = [
      account.provider,
      serializeCredentials(account.credentials),
      account.label,
      account.color,
    ].join('|');

    const existing = this.cache.get(account.id);
    if (existing && existing.fingerprint === fingerprint) {
      return existing.connector;
    }

    const connector = this.createEphemeralConnector(account);
    this.cache.set(account.id, { fingerprint, connector });
    return connector;
  }

  createEphemeralConnector(account: ProviderAccount): ITaskProviderApi {
    const plugin = this.getPlugin(account.provider);
    return plugin.createConnector(account);
  }

  invalidate(accountId: string): void {
    this.cache.delete(accountId);
  }

  clear(): void {
    this.cache.clear();
  }
}
