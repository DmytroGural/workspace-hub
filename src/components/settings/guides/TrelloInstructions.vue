<script setup lang="ts">
import { ExternalLink, ShieldCheck, Sparkles } from 'lucide-vue-next';
import { computed } from 'vue';
import type { ProviderDescriptor } from '@/types/api';
import InstructionStepCard from './InstructionStepCard.vue';

const props = defineProps<{
  provider: ProviderDescriptor;
  credentials: Record<string, string>;
}>();

const hasApiKey = computed(() => (props.credentials.apiKey || '').trim().length > 0);

const hasValidToken = computed(() => {
  const token = (props.credentials.token || '').trim();
  if (!token) return false;
  if (props.provider.validateField) {
    return !props.provider.validateField('token', token, props.credentials);
  }
  return true;
});

const authUrl = computed(() => {
  if (!props.provider.getAuthHelperUrl) return null;
  return props.provider.getAuthHelperUrl(props.credentials);
});
</script>

<template>
  <div class="bg-slate-50/90 border border-slate-200/90 rounded-xl p-4 space-y-3">
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <Sparkles class="w-4 h-4 text-modern-primary" />
        <h4 class="text-xs font-bold text-gray-900 uppercase tracking-wide">
          Trello Connection Guide
        </h4>
      </div>
      <span class="text-[11px] text-gray-500">~1 minute setup</span>
    </div>

    <div class="space-y-2.5">
      <InstructionStepCard :step-number="1" title="Create a personal Power-Up app in Trello">
        <p class="text-xs text-gray-600 leading-relaxed">
          Open Trello App Admin (sign in if prompted) and click <strong>New</strong> in the
          top-right corner.
        </p>
        <ul
          class="space-y-1 bg-gray-50 rounded-lg p-2.5 border border-gray-100 text-[11px] text-gray-600"
        >
          <li class="flex items-start gap-1.5">
            <span class="text-gray-400 select-none">•</span>
            <span>Name: enter any label, e.g. <strong>Workspace Hub</strong>.</span>
          </li>
          <li class="flex items-start gap-1.5">
            <span class="text-gray-400 select-none">•</span>
            <span>Workspace: select any workspace you belong to.</span>
          </li>
          <li class="flex items-start gap-1.5">
            <span class="text-gray-400 select-none">•</span>
            <span>Iframe connector URL: leave blank (not required).</span>
          </li>
          <li class="flex items-start gap-1.5">
            <span class="text-gray-400 select-none">•</span>
            <span>Email &amp; Support contact: enter your email, then click Create.</span>
          </li>
        </ul>
        <div class="pt-1">
          <a
            href="https://trello.com/apps/admin"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs transition-colors"
          >
            <span>Open Trello App Admin</span>
            <ExternalLink class="w-3.5 h-3.5" />
          </a>
        </div>
      </InstructionStepCard>

      <InstructionStepCard
        :step-number="2"
        title="Copy your 32-character API Key"
        :completed="hasApiKey"
      >
        <p class="text-xs text-gray-600 leading-relaxed">
          Inside your app, open <strong>API Key</strong> (or <strong>Trello Auth</strong>) from the
          left sidebar and copy the 32-character API Key into the form.
        </p>
        <p
          class="text-[11px] text-amber-800 bg-amber-50 border border-amber-200/70 rounded-md px-2.5 py-1.5"
        >
          Do NOT copy the 64-character <strong>Secret</strong> below it — generate a user Token in
          Step 3 instead.
        </p>
      </InstructionStepCard>

      <InstructionStepCard
        :step-number="3"
        title="Authorize & copy your API Token (ATTA...)"
        :completed="hasValidToken"
      >
        <p class="text-xs text-gray-600 leading-relaxed">
          With your API Key filled in, authorize read/write access in Trello, click
          <strong>Allow</strong>, and paste the generated <code class="font-mono">ATTA...</code>
          token into <strong>API Token</strong>.
        </p>
        <div class="pt-1">
          <a
            v-if="authUrl"
            :href="authUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs transition-colors"
          >
            <span>Authorize &amp; Get Token in Trello</span>
            <ExternalLink class="w-3.5 h-3.5" />
          </a>
          <div
            v-else
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-gray-100 text-gray-500 border border-dashed border-gray-300"
          >
            <span>Paste your 32-char API Key first to enable the authorization link</span>
          </div>
        </div>
      </InstructionStepCard>

      <InstructionStepCard :step-number="4" title="Label your workspace & connect">
        <p class="text-xs text-gray-600 leading-relaxed">
          Choose a workspace name (e.g. "Work" or "Personal") and tag color, then click
          <strong>Verify &amp; Connect Trello</strong>.
        </p>
      </InstructionStepCard>
    </div>

    <div class="flex items-start gap-2 pt-1 text-[11px] text-gray-500">
      <ShieldCheck class="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
      <span>
        Your keys are saved only in your browser (localStorage) and sent directly to Trello APIs.
      </span>
    </div>
  </div>
</template>
