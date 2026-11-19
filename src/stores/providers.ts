import { defineStore } from 'pinia';
import { computed } from 'vue';
import { connectorRegistry } from '@/connectors';
import type { ProviderCapabilities, ProviderDescriptor } from '@/types/api';
import { DEFAULT_PROVIDER_CAPABILITIES } from '@/types/api';
import type { ProviderId, TaskInterface } from '@/types/domain';
import { DEFAULT_LABEL_COLORS } from '@/utils/labelColors';
import { useTasksStore } from './tasks';

export const useProvidersStore = defineStore('providers', () => {
  const tasksStore = useTasksStore();

  const availableProviders = computed<ProviderDescriptor[]>(() =>
    connectorRegistry.listProviders(),
  );

  function getProviderDescriptor(providerId: ProviderId): ProviderDescriptor | undefined {
    return connectorRegistry.getDescriptor(providerId);
  }

  function getProviderName(providerId: ProviderId): string {
    return getProviderDescriptor(providerId)?.name || providerId;
  }

  function getProviderCapabilities(providerId?: ProviderId): ProviderCapabilities {
    return connectorRegistry.getCapabilities(providerId);
  }

  function getTaskCapabilities(task?: TaskInterface | null): ProviderCapabilities {
    if (!task) return DEFAULT_PROVIDER_CAPABILITIES;
    return getProviderCapabilities(task.provider);
  }

  function getBoardCapabilities(boardId?: string | null): ProviderCapabilities {
    if (!boardId) return DEFAULT_PROVIDER_CAPABILITIES;
    const board = tasksStore.boards.find((b) => b.id === boardId);
    return getProviderCapabilities(board?.provider);
  }

  function getProviderLabelColors(providerId?: ProviderId): readonly string[] {
    if (!providerId) return DEFAULT_LABEL_COLORS;
    return getProviderDescriptor(providerId)?.labelColors || DEFAULT_LABEL_COLORS;
  }

  return {
    availableProviders,
    getProviderDescriptor,
    getProviderName,
    getProviderCapabilities,
    getTaskCapabilities,
    getBoardCapabilities,
    getProviderLabelColors,
  };
});
