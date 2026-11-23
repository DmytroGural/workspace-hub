import { connectorRegistry } from '@/connectors';
import type { ITaskProviderApi, ProviderCapabilities } from '@/types/api';
import type { ProviderAccount } from '@/types/domain';
import { nowMillis } from '@/utils/dateUtils';

export function localId(prefix: string): string {
  return `${prefix}_local_${nowMillis()}`;
}

export function getCapabilities(account?: ProviderAccount): ProviderCapabilities {
  return connectorRegistry.getCapabilities(account?.provider);
}

export function getActiveConnector(account?: ProviderAccount): ITaskProviderApi | null {
  return account?.enabled ? connectorRegistry.getConnector(account) : null;
}

export function assertCapability(
  account: ProviderAccount | undefined,
  capability: keyof ProviderCapabilities,
  actionLabel: string,
  providerLabel?: string,
): void {
  if (!getCapabilities(account)[capability]) {
    throw new Error(
      `${actionLabel} is not supported by provider "${providerLabel || account?.provider || 'default'}"`,
    );
  }
}

/**
 * Applies an optimistic state mutation, executes a remote connector call if available,
 * and rolls back via `rollback` if the connector is missing the method or rejects.
 */
export async function runOptimisticUpdate(options: {
  account?: ProviderAccount;
  apply: () => void;
  rollback: () => void;
  remote: (connector: ITaskProviderApi) => Promise<void> | undefined;
  missingMethodMessage: string;
}): Promise<void> {
  options.apply();

  const connector = getActiveConnector(options.account);
  if (!connector) return;

  const promise = options.remote(connector);
  if (!promise) {
    options.rollback();
    throw new Error(options.missingMethodMessage);
  }

  try {
    await promise;
  } catch (err) {
    options.rollback();
    throw err;
  }
}
