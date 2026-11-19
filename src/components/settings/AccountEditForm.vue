<script setup lang="ts">
import { Check, X } from 'lucide-vue-next';
import { ref, watch } from 'vue';
import { ACCOUNT_COLORS } from '@/stores/accounts';
import type { ProviderDescriptor } from '@/types/api';
import type { ProviderAccount } from '@/types/domain';

const props = defineProps<{
  account: ProviderAccount;
  descriptor?: ProviderDescriptor;
  isSaving: boolean;
}>();

const emit = defineEmits<{
  save: [payload: { label: string; color: string; credentials: Record<string, string> }];
  cancel: [];
}>();

const editLabel = ref('');
const editColor = ref(ACCOUNT_COLORS[0]);
const editCredentials = ref<Record<string, string>>({});

watch(
  () => [props.account, props.descriptor] as const,
  ([acc, desc]) => {
    editLabel.value = acc.label;
    editColor.value = acc.color;
    const nextCreds: Record<string, string> = {};
    for (const field of desc?.credentialFields || []) {
      nextCreds[field.key] = acc.credentials[field.key] || '';
    }
    editCredentials.value = nextCreds;
  },
  { immediate: true },
);

function handleSubmit() {
  emit('save', {
    label: editLabel.value,
    color: editColor.value,
    credentials: { ...editCredentials.value },
  });
}
</script>

<template>
  <div class="space-y-3">
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label
          :for="`edit-label-${account.id}`"
          class="block text-[11px] font-medium text-gray-600 mb-1"
        >
          Workspace Label
        </label>
        <input
          :id="`edit-label-${account.id}`"
          v-model="editLabel"
          type="text"
          class="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-modern-primary"
        >
      </div>
      <div>
        <span class="block text-[11px] font-medium text-gray-600 mb-1">Badge Color</span>
        <div class="flex items-center gap-1.5 h-8">
          <button
            v-for="c in ACCOUNT_COLORS"
            :key="c"
            type="button"
            :aria-label="`Select color ${c}`"
            @click="editColor = c"
            :class="[
              'w-5 h-5 rounded-full transition-transform',
              editColor === c ? 'ring-2 ring-offset-2 ring-gray-800 scale-110' : 'hover:scale-105',
            ]"
            :style="{ backgroundColor: c }"
          />
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div v-for="field in descriptor?.credentialFields || []" :key="field.key">
        <label
          :for="`edit-cred-${account.id}-${field.key}`"
          class="block text-[11px] font-medium text-gray-600 mb-1"
        >
          {{ field.label }}
        </label>
        <input
          :id="`edit-cred-${account.id}-${field.key}`"
          v-model="editCredentials[field.key]"
          :type="field.type"
          class="w-full px-3 py-1.5 text-xs font-mono border border-gray-300 rounded-lg focus:outline-none focus:border-modern-primary"
        >
      </div>
    </div>

    <div class="flex items-center justify-end gap-2 pt-1">
      <button
        type="button"
        @click="emit('cancel')"
        class="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
      >
        <X class="w-3.5 h-3.5" />
        Cancel
      </button>
      <button
        type="button"
        @click="handleSubmit"
        :disabled="isSaving"
        class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-modern-primary text-white rounded-lg hover:bg-modern-hover disabled:opacity-50"
      >
        <Check class="w-3.5 h-3.5" />
        {{ isSaving ? 'Verifying...' : 'Save Changes' }}
      </button>
    </div>
  </div>
</template>
