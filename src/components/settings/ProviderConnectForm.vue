<script setup lang="ts">
import { AlertCircle, ExternalLink, Eye, EyeOff, Plus, Settings } from 'lucide-vue-next';
import { ref } from 'vue';
import { ACCOUNT_COLORS } from '@/stores/accounts';
import type { ProviderDescriptor } from '@/types/api';

const props = defineProps<{
  provider: ProviderDescriptor;
  label: string;
  color: string;
  credentials: Record<string, string>;
  authHelperUrl: string | null;
  validationError: string | null;
  submitError: string | null;
  canSubmit: boolean;
  isSubmitting: boolean;
  showManageLink: boolean;
}>();

const emit = defineEmits<{
  'update:label': [value: string];
  'update:color': [value: string];
  'update:credential': [key: string, value: string];
  submit: [];
  cancel: [];
  openSettings: [];
}>();

const revealedFields = ref<Record<string, boolean>>({});

function toggleReveal(key: string) {
  revealedFields.value[key] = !revealedFields.value[key];
}

function handleLabelInput(event: Event) {
  emit('update:label', (event.target as HTMLInputElement).value);
}

function handleCredentialInput(key: string, event: Event) {
  emit('update:credential', key, (event.target as HTMLInputElement).value);
}
</script>

<template>
  <form @submit.prevent="emit('submit')" class="space-y-4">
    <div
      v-if="validationError || submitError"
      class="flex items-start gap-2.5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs"
    >
      <AlertCircle class="w-4 h-4 shrink-0 mt-0.5" />
      <span>{{ validationError || submitError }}</span>
    </div>

    <div class="space-y-3">
      <div>
        <label for="workspace-label-input" class="block text-xs font-semibold text-gray-700 mb-1">
          Workspace Label
        </label>
        <input
          id="workspace-label-input"
          :value="label"
          @input="handleLabelInput"
          type="text"
          placeholder="e.g. Agency Workspace, Personal"
          class="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-modern-primary focus:ring-1 focus:ring-modern-primary"
        >
      </div>

      <div>
        <span class="block text-xs font-semibold text-gray-700 mb-1.5">Tag Color</span>
        <div class="flex items-center gap-1.5">
          <button
            v-for="c in ACCOUNT_COLORS"
            :key="c"
            type="button"
            :aria-label="`Select color ${c}`"
            @click="emit('update:color', c)"
            :class="[
              'w-5 h-5 rounded-full transition-transform',
              color === c ? 'ring-2 ring-offset-2 ring-gray-800 scale-110' : 'hover:scale-105',
            ]"
            :style="{ backgroundColor: c }"
          />
        </div>
      </div>
    </div>

    <div v-for="field in props.provider.credentialFields" :key="field.key">
      <label
        :for="`cred-${provider.id}-${field.key}`"
        class="block text-xs font-semibold text-gray-700 mb-1"
      >
        {{ field.label }}
        <span v-if="field.required" class="text-red-500">*</span>
      </label>
      <div class="relative">
        <input
          :id="`cred-${provider.id}-${field.key}`"
          :value="credentials[field.key] || ''"
          @input="handleCredentialInput(field.key, $event)"
          :type="field.type === 'password' && revealedFields[field.key] ? 'text' : field.type"
          :placeholder="field.placeholder"
          :required="field.required"
          :class="[
            'w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-modern-primary focus:ring-1 focus:ring-modern-primary',
            field.monospace ? 'font-mono' : '',
            field.type === 'password' ? 'pr-9' : '',
          ]"
        >
        <button
          v-if="field.type === 'password'"
          type="button"
          :aria-label="`Toggle ${field.label} visibility`"
          @click="toggleReveal(field.key)"
          class="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <EyeOff v-if="revealedFields[field.key]" class="w-3.5 h-3.5" />
          <Eye v-else class="w-3.5 h-3.5" />
        </button>
      </div>
      <p v-if="field.hint" class="text-[11px] text-gray-500 mt-1">{{ field.hint }}</p>
    </div>

    <a
      v-if="authHelperUrl"
      :href="authHelperUrl"
      target="_blank"
      rel="noopener noreferrer"
      class="inline-flex items-center gap-1 text-[11px] text-modern-primary hover:underline"
    >
      {{ provider.authHelperLabel || `Authorize in ${provider.name}` }}
      <ExternalLink class="w-3 h-3" />
    </a>

    <div class="flex flex-col gap-2 pt-3 border-t border-gray-100">
      <button
        type="submit"
        :disabled="isSubmitting || !canSubmit"
        class="w-full inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-white bg-modern-primary hover:bg-modern-hover disabled:opacity-50 rounded-lg shadow-xs transition-colors"
      >
        <Plus class="w-3.5 h-3.5" />
        {{ isSubmitting ? 'Verifying & Syncing...' : `Verify & Connect ${provider.name}` }}
      </button>

      <div class="flex items-center justify-between pt-1">
        <button
          v-if="showManageLink"
          type="button"
          @click="emit('openSettings')"
          class="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900"
        >
          <Settings class="w-3.5 h-3.5" />
          Manage All Accounts
        </button>
        <span v-else />

        <button
          type="button"
          @click="emit('cancel')"
          class="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  </form>
</template>
