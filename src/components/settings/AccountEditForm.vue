<script setup lang="ts">
import { Check, Eye, EyeOff, X } from 'lucide-vue-next';
import { ref } from 'vue';
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

const initialCreds: Record<string, string> = {};
for (const field of props.descriptor?.credentialFields || []) {
  initialCreds[field.key] = props.account.credentials[field.key] || '';
}

const editLabel = ref(props.account.label);
const editColor = ref(props.account.color || ACCOUNT_COLORS[0]);
const editCredentials = ref<Record<string, string>>(initialCreds);
const revealedFields = ref<Record<string, boolean>>({});

function toggleReveal(key: string) {
  revealedFields.value[key] = !revealedFields.value[key];
}

function handleSubmit() {
  emit('save', {
    label: editLabel.value.trim() || props.account.label,
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
          autocomplete="off"
          data-1p-ignore
          data-lpignore="true"
          @keydown.enter.prevent="handleSubmit"
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
        <div class="relative">
          <input
            :id="`edit-cred-${account.id}-${field.key}`"
            v-model="editCredentials[field.key]"
            type="text"
            autocomplete="off"
            data-1p-ignore
            data-lpignore="true"
            @keydown.enter.prevent="handleSubmit"
            :style="
              field.type === 'password' && !revealedFields[field.key]
                ? ({ WebkitTextSecurity: 'disc' } as Record<string, string>)
                : undefined
            "
            :class="[
              'w-full px-3 py-1.5 text-xs font-mono border border-gray-300 rounded-lg focus:outline-none focus:border-modern-primary',
              field.type === 'password' ? 'pr-8' : '',
            ]"
          >
          <button
            v-if="field.type === 'password'"
            type="button"
            :aria-label="`Toggle ${field.label} visibility`"
            @click="toggleReveal(field.key)"
            class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <EyeOff v-if="revealedFields[field.key]" class="w-3.5 h-3.5" />
            <Eye v-else class="w-3.5 h-3.5" />
          </button>
        </div>
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
