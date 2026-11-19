<script setup lang="ts">
import { AlertCircle, CheckCircle2, Pencil, Power, Trash2 } from 'lucide-vue-next';
import type { ProviderDescriptor } from '@/types/api';
import type { ProviderAccount } from '@/types/domain';
import AccountEditForm from './AccountEditForm.vue';

defineProps<{
  account: ProviderAccount;
  descriptor?: ProviderDescriptor;
  isEditing: boolean;
  isSaving: boolean;
}>();

const emit = defineEmits<{
  toggleEnabled: [];
  startEdit: [];
  cancelEdit: [];
  saveEdit: [payload: { label: string; color: string; credentials: Record<string, string> }];
  remove: [];
}>();

function maskSecret(val?: string): string {
  if (!val) return '—';
  if (val.length <= 10) return '••••••••';
  return `${val.slice(0, 4)}••••${val.slice(-4)}`;
}
</script>

<template>
  <div
    :class="[
      'bg-white rounded-xl border transition-all p-4',
      account.enabled ? 'border-gray-200 shadow-sm' : 'border-gray-200/70 opacity-70 bg-gray-50/50',
    ]"
  >
    <!-- Standard Card View -->
    <div v-if="!isEditing" class="flex items-start justify-between gap-4">
      <div class="flex items-start gap-3 min-w-0">
        <span
          class="w-3.5 h-3.5 rounded-full shrink-0 mt-1 ring-2 ring-white shadow-sm"
          :style="{ backgroundColor: account.color }"
        />
        <div class="min-w-0 space-y-1">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-semibold text-sm text-gray-900 truncate">{{ account.label }}</span>
            <span
              class="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 uppercase tracking-wide"
            >
              {{ descriptor?.name || account.provider }}
            </span>
            <span
              v-if="account.status === 'connected'"
              class="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700"
            >
              <CheckCircle2 class="w-3 h-3" />
              Connected
            </span>
            <span
              v-else-if="account.status === 'error'"
              class="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-50 text-red-700"
            >
              <AlertCircle class="w-3 h-3" />
              Error
            </span>
          </div>

          <p v-if="account.member" class="text-xs text-gray-600">
            {{ account.member.fullName }}
            <span class="text-gray-400">(@{{ account.member.username }})</span>
          </p>

          <div class="flex items-center gap-3 text-[11px] text-gray-400 font-mono flex-wrap">
            <span v-for="field in descriptor?.credentialFields || []" :key="field.key">
              {{ field.label }}: {{ maskSecret(account.credentials[field.key]) }}
            </span>
          </div>

          <p v-if="account.error" class="text-xs text-red-600 mt-1">
            {{ account.error }}
          </p>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          @click="emit('toggleEnabled')"
          :title="account.enabled ? 'Disable workspace' : 'Enable workspace'"
          :class="[
            'p-1.5 rounded-lg border text-xs transition-colors',
            account.enabled
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              : 'border-gray-200 bg-white text-gray-400 hover:text-gray-700',
          ]"
        >
          <Power class="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          @click="emit('startEdit')"
          title="Edit account"
          class="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-colors"
        >
          <Pencil class="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          @click="emit('remove')"
          title="Remove account"
          class="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors"
        >
          <Trash2 class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>

    <!-- Inline Edit Mode -->
    <AccountEditForm
      v-else
      :account="account"
      :descriptor="descriptor"
      :is-saving="isSaving"
      @save="emit('saveEdit', $event)"
      @cancel="emit('cancelEdit')"
    />
  </div>
</template>
