import type { ProviderPlugin } from '@/types/api';
import { ConnectorRegistry } from './ConnectorRegistry';

export const connectorRegistry = new ConnectorRegistry();

function isProviderPlugin(value: unknown): value is ProviderPlugin {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ProviderPlugin>;
  return (
    Boolean(candidate.descriptor) &&
    typeof candidate.descriptor?.id === 'string' &&
    typeof candidate.createConnector === 'function'
  );
}

/**
 * Automatically discovers and registers every `*ProviderPlugin.ts` under `src/connectors/<provider>/`.
 * Adding a new task manager only requires creating a connector folder with a `<name>ProviderPlugin.ts` export.
 */
const pluginModules = import.meta.glob<Record<string, unknown>>('./*/*ProviderPlugin.ts', {
  eager: true,
});

const discoveredPlugins: ProviderPlugin[] = [];
for (const mod of Object.values(pluginModules)) {
  for (const exportedValue of Object.values(mod)) {
    if (isProviderPlugin(exportedValue)) {
      discoveredPlugins.push(exportedValue);
    }
  }
}

discoveredPlugins.sort((a, b) => a.descriptor.name.localeCompare(b.descriptor.name));
for (const plugin of discoveredPlugins) {
  connectorRegistry.register(plugin);
}

export { BaseTaskProviderConnector, createAccountMeta } from './base/BaseTaskProviderConnector';
export { ConnectorRegistry } from './ConnectorRegistry';
export { FetchHttpClient, HttpApiError } from './http/FetchHttpClient';
