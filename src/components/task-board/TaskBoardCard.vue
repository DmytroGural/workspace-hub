<script setup lang="ts">
import { CheckSquare, MessageSquare } from 'lucide-vue-next';
import { computed } from 'vue';
import TaskAssigneeAvatars from '@/components/task-views/TaskAssigneeAvatars.vue';
import TaskCompleteButton from '@/components/task-views/TaskCompleteButton.vue';
import TaskDueBadge from '@/components/task-views/TaskDueBadge.vue';
import TaskLabelsList from '@/components/task-views/TaskLabelsList.vue';
import { useTaskView } from '@/composables/useTaskView';
import type { TaskInterface } from '@/types/domain';
import { getChecklistRatio, getCommentsCount } from '@/utils/taskPresentation';

const props = defineProps<{
  task: TaskInterface;
  draggable: boolean;
  isDragging: boolean;
  isSelected?: boolean;
}>();

const emit = defineEmits<{
  open: [taskId: string];
  toggleComplete: [task: TaskInterface];
  dragStart: [event: DragEvent, task: TaskInterface];
  dragEnd: [];
}>();

const { selectedBoardId } = useTaskView();

const checklistRatio = computed(() => getChecklistRatio(props.task));
const commentsCount = computed(() => getCommentsCount(props.task));
</script>

<template>
  <div
    role="button"
    tabindex="0"
    :draggable="draggable"
    @dragstart="emit('dragStart', $event, task)"
    @dragend="emit('dragEnd')"
    @click="emit('open', task.id)"
    @keydown.enter.prevent="emit('open', task.id)"
    @keydown.space.prevent="emit('open', task.id)"
    :class="[
      'bg-white p-3 rounded-lg border hover:border-indigo-400 hover:shadow-md transition-all space-y-2 group',
      isSelected ? 'border-indigo-400 ring-1 ring-indigo-300' : 'border-gray-200',
      draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
      isDragging ? 'opacity-45 ring-2 ring-indigo-300' : '',
      task.dueComplete ? 'opacity-60 bg-gray-50' : '',
    ]"
  >
    <!-- Top Tag & Complete Button -->
    <div class="flex items-start justify-between gap-2">
      <span
        v-if="selectedBoardId !== task.idBoard"
        class="text-[10px] px-1.5 py-0.5 rounded font-semibold text-white truncate max-w-[170px]"
        :style="{ backgroundColor: task.boardColor }"
      >
        {{ task.boardName }}
      </span>
      <span v-else></span>

      <TaskCompleteButton :completed="task.dueComplete" @toggle="emit('toggleComplete', task)" />
    </div>

    <!-- Card Name -->
    <div
      :class="[
        'text-xs font-medium text-gray-900 group-hover:text-modern-primary transition-colors leading-snug',
        task.dueComplete ? 'line-through text-gray-400' : '',
      ]"
    >
      {{ task.name }}
    </div>

    <!-- Labels -->
    <div v-if="task.labels.length > 0" class="flex flex-wrap gap-1">
      <TaskLabelsList :labels="task.labels" :max-visible="4" max-width-class="max-w-[120px]" />
    </div>

    <!-- Card Footer: Due Date, Checklist, Comments, Assignees -->
    <div
      v-if="task.due || checklistRatio || commentsCount > 0 || task.assignedMembers.length > 0"
      class="flex items-center justify-between text-[11px] pt-1"
    >
      <div class="flex items-center gap-2">
        <TaskDueBadge
          v-if="task.due"
          :due="task.due"
          :due-complete="task.dueComplete"
          :section="task.section"
          variant="inline"
        />

        <span
          v-if="checklistRatio"
          class="inline-flex items-center gap-0.5 text-gray-500 text-[10px]"
        >
          <CheckSquare class="w-3 h-3 text-gray-400" />
          <span>{{ [checklistRatio.done, checklistRatio.total].join('/') }}</span>
        </span>

        <span
          v-if="commentsCount > 0"
          class="inline-flex items-center gap-0.5 text-gray-500 text-[10px]"
          title="Comments"
        >
          <MessageSquare class="w-3 h-3 text-gray-400" />
          <span>{{ commentsCount }}</span>
        </span>
      </div>

      <TaskAssigneeAvatars :members="task.assignedMembers" />
    </div>
  </div>
</template>
