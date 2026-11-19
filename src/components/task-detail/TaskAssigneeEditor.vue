<script setup lang="ts">
import { Check, Plus, Save, Users, X } from 'lucide-vue-next';
import { ref, watch } from 'vue';
import type { WorkspaceMember } from '@/types/domain';
import { getMemberInitials } from '@/utils/taskPresentation';

const props = withDefaults(
  defineProps<{
    taskId?: string;
    assignedMembers: WorkspaceMember[];
    boardMembers: WorkspaceMember[];
    isSaving?: boolean;
    layout?: 'grid' | 'stacked';
    showLabel?: boolean;
  }>(),
  {
    taskId: '',
    isSaving: false,
    layout: 'grid',
    showLabel: true,
  },
);

const emit = defineEmits<{
  toggleAssignee: [member: WorkspaceMember];
}>();

const isPickerOpen = ref(false);

watch(
  () => props.taskId,
  () => {
    isPickerOpen.value = false;
  },
);

function toggleAssignee(member: WorkspaceMember): void {
  emit('toggleAssignee', member);
}

function isAssigned(memberId: string): boolean {
  return props.assignedMembers.some((m) => m.id === memberId);
}
</script>

<template>
  <div :class="layout === 'stacked' ? 'space-y-1.5' : 'grid grid-cols-3 items-start py-1'">
    <div
      v-if="showLabel"
      :class="
        layout === 'stacked'
          ? 'font-semibold text-gray-700 mb-1 flex items-center gap-1.5 text-xs'
          : 'text-gray-400 font-medium pt-1'
      "
    >
      <Users v-if="layout === 'stacked'" class="w-3.5 h-3.5 text-gray-400" />
      <span>Assignee{{ layout === 'stacked' ? ` (${assignedMembers.length} selected)` : '' }}</span>
    </div>
    <div :class="layout === 'stacked' ? 'space-y-2' : 'col-span-2 space-y-2'">
      <div class="flex flex-wrap items-center gap-1.5">
        <span
          v-for="member in assignedMembers"
          :key="member.id"
          class="inline-flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-800 border border-gray-200"
        >
          <img
            v-if="member.avatarUrl"
            :src="member.avatarUrl"
            alt=""
            class="w-4 h-4 rounded-full object-cover ring-1 ring-white shrink-0"
          >
          <span
            v-else
            class="w-4 h-4 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[8px] shrink-0"
          >
            {{ getMemberInitials(member) }}
          </span>
          <span class="truncate max-w-[140px]">{{ member.fullName }}</span>
          <button
            type="button"
            @click="emit('toggleAssignee', member)"
            :disabled="isSaving"
            class="text-gray-400 hover:text-gray-700 disabled:opacity-40"
            title="Unassign member"
          >
            <X class="w-3 h-3" />
          </button>
        </span>

        <button
          type="button"
          @click="isPickerOpen = !isPickerOpen"
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border border-dashed border-gray-300 text-gray-600 hover:border-modern-primary hover:text-modern-primary transition-colors"
        >
          <Plus v-if="!isPickerOpen" class="w-3 h-3" />
          <Save v-else class="w-3 h-3" />
          <span>{{ isPickerOpen ? 'Done' : 'Assign' }}</span>
        </button>
      </div>

      <!-- Board Members Picker Popover -->
      <div
        v-if="isPickerOpen"
        class="p-2.5 rounded-lg border border-gray-200 bg-gray-50/80 space-y-2"
      >
        <div class="text-[11px] font-semibold text-gray-600 flex items-center gap-1.5">
          <Users class="w-3 h-3 text-gray-400" />
          <span>Board Members</span>
        </div>

        <div v-if="boardMembers.length > 0" class="space-y-1 max-h-44 overflow-y-auto pr-0.5">
          <button
            v-for="member in boardMembers"
            :key="member.id"
            type="button"
            @click="toggleAssignee(member)"
            :disabled="isSaving"
            :class="[
              'w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-left text-xs transition-colors disabled:opacity-50',
              isAssigned(member.id)
                ? 'bg-indigo-50 text-indigo-900 font-semibold border border-indigo-200'
                : 'hover:bg-white text-gray-700 border border-transparent',
            ]"
          >
            <span class="flex items-center gap-2 min-w-0">
              <img
                v-if="member.avatarUrl"
                :src="member.avatarUrl"
                alt=""
                class="w-5 h-5 rounded-full object-cover ring-1 ring-gray-200 shrink-0"
              >
              <span
                v-else
                class="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[9px] shrink-0"
              >
                {{ getMemberInitials(member) }}
              </span>
              <span class="truncate">{{ member.fullName }}</span>
              <span class="text-[10px] text-gray-400 truncate">@{{ member.username }}</span>
            </span>
            <Check v-if="isAssigned(member.id)" class="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          </button>
        </div>

        <div v-else class="text-[11px] text-gray-400 italic">No members found on this board.</div>
      </div>
    </div>
  </div>
</template>
