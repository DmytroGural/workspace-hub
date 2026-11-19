<script setup lang="ts">
import { ExternalLink, ShieldCheck, Sparkles } from 'lucide-vue-next';
import type { ProviderDescriptor, ProviderSetupStep } from '@/types/api';
import InstructionStepCard from './InstructionStepCard.vue';

const props = defineProps<{
  provider: ProviderDescriptor;
  credentials: Record<string, string>;
}>();

function isStepDone(step: ProviderSetupStep): boolean {
  if (!step.completedWhenFieldFilled) return false;
  const val = (props.credentials[step.completedWhenFieldFilled] || '').trim();
  if (!val) return false;
  if (props.provider.validateField?.(step.completedWhenFieldFilled, val, props.credentials)) {
    return false;
  }
  return true;
}

function resolveStepActionUrl(step: ProviderSetupStep): string | null {
  if (step.usesAuthHelper && props.provider.getAuthHelperUrl) {
    return props.provider.getAuthHelperUrl(props.credentials);
  }
  return step.actionUrl || null;
}
</script>

<template>
  <div class="bg-slate-50/90 border border-slate-200/90 rounded-xl p-4 space-y-3">
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <Sparkles class="w-4 h-4 text-modern-primary" />
        <h4 class="text-xs font-bold text-gray-900 uppercase tracking-wide">
          {{ provider.name }} Connection Guide
        </h4>
      </div>
      <a
        v-if="provider.docsUrl"
        :href="provider.docsUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:underline"
      >
        <span>{{ provider.docsLabel || `${provider.name} Docs` }}</span>
        <ExternalLink class="w-3 h-3" />
      </a>
    </div>

    <div v-if="provider.setupSteps && provider.setupSteps.length > 0" class="space-y-2.5">
      <InstructionStepCard
        v-for="(step, idx) in provider.setupSteps"
        :key="idx"
        :step-number="idx + 1"
        :title="step.title"
        :completed="isStepDone(step)"
      >
        <p class="text-xs text-gray-600 leading-relaxed">{{ step.description }}</p>

        <ul
          v-if="step.details && step.details.length > 0"
          class="space-y-1 bg-gray-50 rounded-lg p-2.5 border border-gray-100 text-[11px] text-gray-600"
        >
          <li v-for="(detail, dIdx) in step.details" :key="dIdx" class="flex items-start gap-1.5">
            <span class="text-gray-400 select-none">•</span>
            <span>{{ detail }}</span>
          </li>
        </ul>

        <p
          v-if="step.tip"
          class="text-[11px] text-indigo-700 bg-indigo-50/70 rounded-md px-2.5 py-1.5"
        >
          Tip: {{ step.tip }}
        </p>

        <div v-if="step.actionLabel" class="pt-1">
          <a
            v-if="resolveStepActionUrl(step)"
            :href="resolveStepActionUrl(step) || undefined"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs transition-colors"
          >
            <span>{{ step.actionLabel }}</span>
            <ExternalLink class="w-3.5 h-3.5" />
          </a>
          <div
            v-else-if="step.usesAuthHelper"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-gray-100 text-gray-500 border border-dashed border-gray-300"
          >
            <span>{{ step.authHelperDisabledHint || 'Fill previous credentials first' }}</span>
          </div>
        </div>
      </InstructionStepCard>
    </div>

    <InstructionStepCard v-else :step-number="1" :title="`Enter your ${provider.name} credentials`">
      <p class="text-xs text-gray-600 leading-relaxed">
        Fill in the required fields for {{ provider.name }} ({{
          provider.credentialFields.map((f) => f.label).join(', ')
        }}) and click Verify &amp; Connect.
      </p>
    </InstructionStepCard>

    <div class="flex items-start gap-2 pt-1 text-[11px] text-gray-500">
      <ShieldCheck class="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
      <span>
        Your keys are saved only in your browser (localStorage) and sent directly to
        {{ provider.name }}
        — never through external servers.
      </span>
    </div>
  </div>
</template>
