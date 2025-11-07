<template>
  <div
    class="bg-white rounded-lg shadow-md p-4 border-l-4 relative group"
    :class="[
      getStatusColor(task.status),
      canEdit ? 'hover:shadow-lg transition-shadow' : 'cursor-move'
    ]"
    draggable="true"
    @dragstart="handleDragStart($event, task.id)"
  >
    <div class="flex justify-between items-start mb-2">
      <h3 class="font-semibold text-gray-900">{{ task.title }}</h3>

      <!-- Action buttons - show on hover -->
      <div
        v-if="canEdit"
        class="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1"
      >
        <!-- Edit Button -->
        <button
          @click.stop="$emit('edit', task)"
          class="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-md transition-colors"
          title="Edit task"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>

        <!-- Status Toggle Button -->
        <button
          @click.stop="handleStatusToggle"
          class="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-md transition-colors"
          :title="task.status === 'completed' ? 'Mark as in progress' : 'Mark as completed'"
        >
          <svg v-if="task.status === 'completed'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>

        <!-- Delete Button -->
        <button
          @click.stop="$emit('delete', task.id)"
          class="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
          title="Delete task"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>

    <p v-if="task.description" class="text-sm text-gray-600 mb-2 line-clamp-2">
      {{ task.description }}
    </p>

    <!-- Assignee -->
    <div class="mb-2">
      <div v-if="task.assignedUser" class="flex items-center gap-2 text-sm">
        <span class="font-medium text-gray-700">Assignee:</span>
        <span class="text-gray-900">{{ task.assignedUser.name }}</span>
        <span class="text-xs text-gray-500">({{ task.assignedUser.email }})</span>
      </div>
      <div v-else class="text-sm text-gray-400 italic">
        No assignee
      </div>
    </div>

    <div class="text-xs text-gray-500">
      <div>📅 {{ formatDate(task.startDate) }} - {{ formatDate(task.endDate) }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { format } from 'date-fns';
import { useAuthStore } from '@/stores/auth';
import type { Task, TaskStatus } from '@/types';
import { TaskStatus as TaskStatusEnum } from '@/types';

const props = defineProps<{
  task: Task;
}>();

const authStore = useAuthStore();
const canEdit = computed(() => authStore.user?.role !== 'user');

const emit = defineEmits<{
  edit: [task: Task];
  delete: [taskId: number];
  statusChange: [taskId: number, newStatus: TaskStatus];
}>();

function handleStatusToggle() {
  const newStatus = props.task.status === TaskStatusEnum.COMPLETED
    ? TaskStatusEnum.IN_PROGRESS
    : TaskStatusEnum.COMPLETED;
  emit('statusChange', props.task.id, newStatus);
}

function formatDate(dateString: string) {
  return format(new Date(dateString), 'MMM d, yyyy');
}

function handleDragStart(event: DragEvent, taskId: number) {
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(taskId));
  }
}

function getStatusColor(status: TaskStatus) {
  if (status === TaskStatusEnum.IN_PROGRESS) {
    return 'border-blue-500';
  } else if (status === TaskStatusEnum.COMPLETED) {
    return 'border-green-500';
  }
  return 'border-gray-500';
}
</script>

