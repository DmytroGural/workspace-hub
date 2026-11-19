<script setup lang="ts">
import { Check, KeyRound, Layers, X } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { type Component, computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  ACCOUNT_COLORS,
  useAccountsStore,
  useProvidersStore,
  useSyncStore,
  useUIStore,
} from '@/stores';
import type { ProviderId } from '@/types/domain';
import { getErrorMessage } from '@/utils/errorUtils';
import DefaultProviderInstructions from './settings/guides/DefaultProviderInstructions.vue';
import TrelloInstructions from './settings/guides/TrelloInstructions.vue';
import ProviderConnectForm from './settings/ProviderConnectForm.vue';

const SERVICE_INSTRUCTIONS: Record<string, Component> = {
  trello: TrelloInstructions,
};

const route = useRoute();
const router = useRouter();

const accountsStore = useAccountsStore();
const providersStore = useProvidersStore();
const uiStore = useUIStore();
const syncStore = useSyncStore();

const { accounts } = storeToRefs(accountsStore);
const { availableProviders } = storeToRefs(providersStore);
const { isSettingsModalOpen } = storeToRefs(uiStore);
const { errorMessage } = storeToRefs(syncStore);

const { addAccount } = accountsStore;
const { closeSettingsModal } = uiStore;

const selectedProviderId = ref<ProviderId>(availableProviders.value[0]?.id || '');
const localLabel = ref('');
const localColor = ref(ACCOUNT_COLORS[0]);
const credentialsDraft = ref<Record<string, string>>({});
const testing = ref(false);
const localError = ref<string | null>(null);

const isOnSettingsPage = computed(() => route.path === '/settings');

const activeProvider = computed(() => {
  return (
    availableProviders.value.find((p) => p.id === selectedProviderId.value) ||
    availableProviders.value[0]
  );
});

const activeInstructionComponent = computed<Component>(() => {
  const providerId = activeProvider.value?.id;
  return (providerId && SERVICE_INSTRUCTIONS[providerId]) || DefaultProviderInstructions;
});

const authHelperUrl = computed(() => {
  if (!activeProvider.value?.getAuthHelperUrl) return null;
  return activeProvider.value.getAuthHelperUrl(credentialsDraft.value);
});

const credentialValidationError = computed(() => {
  if (!activeProvider.value?.validateCredentials) return null;
  return activeProvider.value.validateCredentials(credentialsDraft.value);
});

const canSubmit = computed(() => {
  const provider = activeProvider.value;
  if (!provider || credentialValidationError.value) return false;
  return provider.credentialFields
    .filter((field) => field.required)
    .every((field) => (credentialsDraft.value[field.key] || '').trim().length > 0);
});

function resetDraftFields() {
  const nextDraft: Record<string, string> = {};
  for (const field of activeProvider.value?.credentialFields || []) {
    nextDraft[field.key] = '';
  }
  credentialsDraft.value = nextDraft;
  localError.value = null;
}

watch(selectedProviderId, resetDraftFields, { immediate: true });

watch(isSettingsModalOpen, (open) => {
  if (open) {
    localError.value = null;
    localColor.value = ACCOUNT_COLORS[accounts.value.length % ACCOUNT_COLORS.length];
  }
});

function updateCredentialField(key: string, value: string) {
  credentialsDraft.value[key] = value;
}

function closeModal() {
  closeSettingsModal();
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && isSettingsModalOpen.value) {
    closeModal();
  }
}

onMounted(() => window.addEventListener('keydown', handleKeydown));
onUnmounted(() => window.removeEventListener('keydown', handleKeydown));

async function handleConnect() {
  if (!activeProvider.value || !canSubmit.value) return;
  localError.value = null;
  testing.value = true;

  try {
    await addAccount({
      provider: activeProvider.value.id,
      label: localLabel.value.trim(),
      credentials: { ...credentialsDraft.value },
      color: localColor.value,
    });
    localLabel.value = '';
    resetDraftFields();
    closeModal();
  } catch (err: unknown) {
    localError.value = getErrorMessage(err, 'Failed to verify credentials with provider API');
  } finally {
    testing.value = false;
  }
}

function openFullSettings() {
  closeModal();
  router.push('/settings');
}
</script>

<template>
  <div v-if="isSettingsModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <!-- Backdrop button -->
    <button
      type="button"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm cursor-default border-0"
      @click="closeModal"
      aria-label="Close settings dialog"
    />
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      class="relative z-10 bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
    >
      <!-- Header -->
      <div
        class="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/70 shrink-0"
      >
        <div class="flex items-center gap-2.5">
          <div
            class="w-9 h-9 rounded-lg bg-modern-primary/10 text-modern-primary flex items-center justify-center"
          >
            <KeyRound class="w-5 h-5" />
          </div>
          <div>
            <h3 id="settings-modal-title" class="text-base font-bold text-gray-900">
              Connect Workspace Service
            </h3>
            <p class="text-xs text-gray-500">
              Choose a service and follow its setup guide · {{ accounts.length }} workspace{{
                accounts.length === 1 ? '' : 's'
              }} configured
            </p>
          </div>
        </div>

        <button
          type="button"
          aria-label="Close modal"
          @click="closeModal"
          class="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-lg transition-colors"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Top Service Switcher -->
      <div class="px-6 py-3 border-b border-gray-100 bg-white shrink-0 space-y-2">
        <div
          class="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider"
        >
          <Layers class="w-3.5 h-3.5 text-gray-400" />
          <span>Service</span>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="provider in availableProviders"
            :key="provider.id"
            type="button"
            @click="selectedProviderId = provider.id"
            :class="[
              'flex items-center gap-2.5 px-3 py-2 rounded-xl border text-left transition-all',
              activeProvider?.id === provider.id
                ? 'border-modern-primary bg-indigo-50/60 ring-1 ring-modern-primary/30'
                : 'border-gray-200 bg-white hover:bg-gray-50',
            ]"
          >
            <span
              class="w-2.5 h-2.5 rounded-full shrink-0"
              :style="{ backgroundColor: provider.badgeColor }"
            />
            <div class="min-w-0">
              <div class="text-xs font-semibold text-gray-900 leading-tight">
                {{ provider.name }}
              </div>
              <div class="text-[10px] text-gray-500 truncate max-w-[260px]">
                {{ provider.tagline }}
              </div>
            </div>
            <Check
              v-if="activeProvider?.id === provider.id"
              class="w-3.5 h-3.5 text-modern-primary shrink-0 ml-1"
            />
          </button>
        </div>
      </div>

      <!-- Scrollable Body: Service Instruction + Form -->
      <div v-if="activeProvider" class="overflow-y-auto p-6">
        <div class="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          <div class="md:col-span-7">
            <component
              :is="activeInstructionComponent"
              :provider="activeProvider"
              :credentials="credentialsDraft"
            />
          </div>

          <div class="md:col-span-5">
            <ProviderConnectForm
              :provider="activeProvider"
              :label="localLabel"
              :color="localColor"
              :credentials="credentialsDraft"
              :auth-helper-url="authHelperUrl"
              :validation-error="credentialValidationError"
              :submit-error="localError || errorMessage"
              :can-submit="canSubmit"
              :is-submitting="testing"
              :show-manage-link="!isOnSettingsPage"
              @update:label="localLabel = $event"
              @update:color="localColor = $event"
              @update:credential="updateCredentialField"
              @submit="handleConnect"
              @cancel="closeModal"
              @open-settings="openFullSettings"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
