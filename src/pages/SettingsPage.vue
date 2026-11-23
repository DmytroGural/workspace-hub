<script setup lang="ts">
import { AlertCircle, Plus } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import AccountWorkspaceCard from '@/components/settings/AccountWorkspaceCard.vue';
import SettingsEmptyState from '@/components/settings/SettingsEmptyState.vue';
import SettingsHeader from '@/components/settings/SettingsHeader.vue';
import { useAccountsStore, useProvidersStore, useSyncStore, useUIStore } from '@/stores';
import { getErrorMessage } from '@/utils/errorUtils';

const router = useRouter();

const accountsStore = useAccountsStore();
const syncStore = useSyncStore();
const uiStore = useUIStore();
const providersStore = useProvidersStore();

const { accounts, hasAccounts } = storeToRefs(accountsStore);
const { isLoading, errorMessage } = storeToRefs(syncStore);

const { refreshTasks } = syncStore;
const { openSettingsModal } = uiStore;
const { getProviderDescriptor } = providersStore;

const editingId = ref<string | null>(null);
const editError = ref<string | null>(null);
const isSavingEdit = ref(false);

function openAddAccountModal() {
  openSettingsModal();
}

function startEdit(accountId: string) {
  editingId.value = accountId;
  editError.value = null;
}

function cancelEdit() {
  editingId.value = null;
  editError.value = null;
}

async function saveEdit(
  accountId: string,
  payload: { label: string; color: string; credentials: Record<string, string> },
) {
  isSavingEdit.value = true;
  editError.value = null;
  try {
    await accountsStore.updateAccount(accountId, payload);
    editingId.value = null;
  } catch (err: unknown) {
    editError.value = getErrorMessage(err, 'Failed to update account');
  } finally {
    isSavingEdit.value = false;
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto px-6 py-8 space-y-8">
    <SettingsHeader @back="router.push('/')" />

    <!-- Global Error Banner -->
    <div
      v-if="errorMessage || editError"
      class="flex items-start gap-2.5 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs"
    >
      <AlertCircle class="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
      <span>{{ editError || errorMessage }}</span>
    </div>

    <!-- Configured Workspaces List -->
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold text-gray-900 uppercase tracking-wider">
          Configured Workspaces ({{ accounts.length }})
        </h2>

        <button
          type="button"
          aria-label="Connect new workspace"
          @click="openAddAccountModal"
          class="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-modern-primary hover:bg-modern-hover rounded-lg shadow-sm transition-colors"
        >
          <Plus class="w-4 h-4" />
          <span>Add Workspace</span>
        </button>
      </div>

      <SettingsEmptyState v-if="!hasAccounts" @connect="openAddAccountModal" />

      <div v-else class="space-y-3">
        <AccountWorkspaceCard
          v-for="acc in accounts"
          :key="acc.id"
          :account="acc"
          :descriptor="getProviderDescriptor(acc.provider)"
          :is-editing="editingId === acc.id"
          :is-saving="isSavingEdit"
          @toggle-enabled="accountsStore.toggleAccountEnabled(acc.id)"
          @start-edit="startEdit(acc.id)"
          @cancel-edit="cancelEdit"
          @save-edit="saveEdit(acc.id, $event)"
          @remove="accountsStore.removeAccount(acc.id)"
        />
      </div>
    </div>

    <button
      v-if="hasAccounts"
      type="button"
      @click="refreshTasks"
      :disabled="isLoading"
      class="px-3.5 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
    >
      Sync All Enabled
    </button>
  </div>
</template>
