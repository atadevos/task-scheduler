<template>
  <BaseModal :show="show" :error="error" @close="handleClose">
    <template #title>
      {{ task ? 'Edit Task' : 'Create Task' }}
    </template>

    <form @submit.prevent="handleSubmit" class="space-y-4">
          <!-- Title -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Title <span class="text-red-500">*</span>
            </label>
            <input
              v-model="formData.title"
              type="text"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <!-- Description -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              v-model="formData.description"
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            ></textarea>
          </div>

          <!-- Start Date -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Start Date <span class="text-red-500">*</span>
            </label>
            <input
              v-model="formData.startDate"
              type="datetime-local"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <!-- End Date -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              End Date <span class="text-red-500">*</span>
            </label>
            <input
              v-model="formData.endDate"
              type="datetime-local"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <!-- Assigned User -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Assigned User <span class="text-red-500">*</span>
            </label>
            <select
              v-model="formData.assignedUserId"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Select a user</option>
              <option v-for="user in regularUsers" :key="user.id" :value="user.id">
                {{ user.name }}
              </option>
            </select>
          </div>

          <!-- Status (only show when editing, not when creating) -->
          <div v-if="task">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Status <span class="text-red-500">*</span>
            </label>
            <select
              v-model="formData.status"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Select a status</option>
              <option v-for="status in statuses" :key="status.id" :value="status.id">
                {{ status.name }}
              </option>
            </select>
          </div>

          <!-- Actions -->
          <div class="flex justify-end gap-3 pt-4">
            <button
              type="button"
              @click="handleClose"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="loading"
              class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {{ loading ? 'Saving...' : task ? 'Update' : 'Create' }}
            </button>
          </div>
        </form>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { format, parseISO } from 'date-fns';
import { useTasksStore } from '@/stores/tasks';
import BaseModal from './BaseModal.vue';
import type { Task, User, TaskStatus } from '@/types';
import { TaskStatus as TaskStatusEnum } from '@/types';

const props = defineProps<{
  task: Task | null;
  users: User[];
  statuses: Array<{ id: string; name: string }>;
  show?: boolean;
}>();

const emit = defineEmits<{
  close: [];
  save: [taskData: Partial<Task>];
}>();

const tasksStore = useTasksStore();
const loading = ref(false);
const error = ref<string | null>(null);

// Watch for errors from the store
watch(() => tasksStore.error, (newError) => {
  if (newError) {
    error.value = newError;
  }
});

const formData = ref<{
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  assignedUserId: number | '';
  status: TaskStatus;
}>({
  title: '',
  description: '',
  startDate: '',
  endDate: '',
  assignedUserId: '',
  status: TaskStatusEnum.IN_PROGRESS,
});

// Format datetime-local input (remove seconds/milliseconds)
function formatDateTimeForInput(dateString: string): string {
  if (!dateString) return '';
  const date = parseISO(dateString);
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

// Initialize form data when task changes
watch(
  () => props.task,
  (newTask) => {
    if (newTask) {
      formData.value = {
        title: newTask.title,
        description: newTask.description || '',
        startDate: formatDateTimeForInput(newTask.startDate),
        endDate: formatDateTimeForInput(newTask.endDate),
        assignedUserId: newTask.assignedUserId ?? '',
        status: newTask.status,
      };
    } else {
      // When creating, default to "in progress" status
      formData.value = {
        title: '',
        description: '',
        startDate: '',
        endDate: '',
        assignedUserId: '',
        status: TaskStatusEnum.IN_PROGRESS,
      };
    }
    error.value = null;
  },
  { immediate: true },
);

const show = computed(() => props.show !== false);

// Filter users to only show regular users (not admin or manager)
const regularUsers = computed(() => {
  return props.users.filter(user => user.role === 'user');
});

function resetForm() {
  // When resetting, default to "in progress" status
  formData.value = {
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    assignedUserId: '',
    status: TaskStatusEnum.IN_PROGRESS,
  };
  error.value = null;
}

function handleClose() {
  // Clear form when closing, especially for create mode
  if (!props.task) {
    resetForm();
  } else {
    // For edit mode, just clear error
    error.value = null;
  }
  emit('close');
}

async function handleSubmit() {
  loading.value = true;
  error.value = null;

  try {
    // Validate that users and statuses are loaded
    if (!props.users.length || !props.statuses.length) {
      error.value = 'Please wait while data is loading...';
      loading.value = false;
      return;
    }

    // Validate dates
    const startDate = new Date(formData.value.startDate);
    const endDate = new Date(formData.value.endDate);

    if (endDate < startDate) {
      error.value = 'End date must be after start date';
      loading.value = false;
      return;
    }

    // Convert datetime-local format to ISO 8601 format
    // datetime-local format: "2025-11-14T10:06" -> ISO: "2025-11-14T10:06:00.000Z"
    const formatToISO = (dateString: string): string => {
      if (!dateString) return dateString;
      // If it already has seconds, return as is
      if (dateString.includes(':', 13)) {
        return new Date(dateString).toISOString();
      }
      // Add seconds if missing: "2025-11-14T10:06" -> "2025-11-14T10:06:00"
      const dateWithSeconds = dateString + ':00';
      return new Date(dateWithSeconds).toISOString();
    };

    emit('save', {
      title: formData.value.title,
      description: formData.value.description || undefined,
      startDate: formatToISO(formData.value.startDate),
      endDate: formatToISO(formData.value.endDate),
      assignedUserId: formData.value.assignedUserId === '' ? undefined : formData.value.assignedUserId,
      status: formData.value.status,
    });
  } catch (err: any) {
    const errorMessage = err.response?.data?.message || err.message || 'Failed to save task';
    error.value = errorMessage;
  } finally {
    loading.value = false;
  }
}
</script>

