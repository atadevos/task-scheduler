<template>
  <AppLayout>
    <div class="p-8">
      <!-- Filters and Actions -->
      <div class="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div class="flex flex-wrap gap-4 flex-1">
          <!-- Search -->
          <div class="flex-1 min-w-[200px]">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search tasks..."
              class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              @input="handleSearch"
            />
          </div>

          <!-- Status Filter -->
          <select
            v-model="selectedStatus"
            class="px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            @change="handleFilter"
          >
            <option value="">All Statuses</option>
            <option v-for="status in statuses" :key="status.id" :value="status.id">
              {{ status.name }}
            </option>
          </select>

          <!-- User Filter (hidden for ordinary users) -->
          <select
            v-if="authStore.user?.role !== 'user'"
            v-model="selectedUser"
            class="px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            @change="handleFilter"
          >
            <option value="">All Users</option>
            <option v-for="user in users" :key="user.id" :value="user.id">
              {{ user.name }}
            </option>
          </select>
        </div>

        <button
          v-if="canCreateTask"
          @click="openCreateModal"
          class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
        >
          + Create Task
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="tasksStore.loading" class="text-center py-12">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <p class="mt-2 text-gray-600">Loading tasks...</p>
      </div>

      <!-- Kanban Board -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
          v-for="status in statuses"
          :key="status.id"
          class="bg-white rounded-lg shadow p-4"
          @drop="handleDrop($event, status.id as string)"
          @dragover.prevent
          @dragenter.prevent
        >
          <h2 class="text-lg font-semibold text-gray-900 mb-4">
            {{ status.name }}
            <span class="text-sm text-gray-500">
              ({{ getTasksByStatus(status.id as TaskStatus).length }})
            </span>
          </h2>

          <div class="space-y-3 min-h-[200px]">
            <TaskCard
              v-for="task in getTasksByStatus(status.id as TaskStatus)"
              :key="task.id"
              :task="task"
              @edit="openEditModal"
              @delete="handleDelete"
              @statusChange="handleStatusChange"
            />
          </div>
        </div>
      </div>

      <!-- Task Modal -->
    <TaskModal
      :show="showModal"
      :task="selectedTask"
      :users="users"
      :statuses="statuses"
      @close="closeModal"
      @save="handleSaveTask"
    />
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useTasksStore } from '@/stores/tasks';
import { useAuthStore } from '@/stores/auth';
import AppLayout from '@/components/AppLayout.vue';
import TaskCard from '@/components/TaskCard.vue';
import TaskModal from '@/components/TaskModal.vue';
import type { Task, TaskStatus } from '@/types';

const tasksStore = useTasksStore();
const authStore = useAuthStore();

const searchQuery = ref('');
const selectedStatus = ref<TaskStatus | ''>('');
const selectedUser = ref('');
const showModal = ref(false);
const selectedTask = ref<Task | null>(null);

const users = computed(() => tasksStore.users);
const statuses = computed(() => tasksStore.statuses);

// Check if user can create tasks (admin or manager only)
const canCreateTask = computed(() => {
  const role = authStore.user?.role;
  return role === 'admin' || role === 'manager';
});

const getTasksByStatus = (status: TaskStatus) => {
  return tasksStore.getTasksByStatus(status);
};

let searchTimeout: ReturnType<typeof setTimeout>;

function handleSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    loadTasks();
  }, 300);
}

function handleFilter() {
  loadTasks();
}

function loadTasks() {
  tasksStore.fetchTasks({
    status: selectedStatus.value ? (selectedStatus.value as TaskStatus) : undefined,
    assignedUserId: selectedUser.value || undefined,
    search: searchQuery.value || undefined,
  });
}

function openCreateModal() {
  console.log('openCreateModal called', {
    showModalBefore: showModal.value,
    usersCount: users.value.length,
    statusesCount: statuses.value.length
  });
  selectedTask.value = null;
  showModal.value = true;
  console.log('showModal after:', showModal.value);
}

function openEditModal(task: Task) {
  selectedTask.value = task;
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
  selectedTask.value = null;
  // Don't clear store error here - let TaskModal handle it
}

async function handleSaveTask(taskData: Partial<Task>) {
  try {
    // Clear any previous errors
    tasksStore.error = null;

    if (selectedTask.value) {
      await tasksStore.updateTask(selectedTask.value.id, taskData);
    } else {
      await tasksStore.createTask(taskData);
    }
    closeModal();
    loadTasks();
  } catch (error) {
    // Error is handled by the store and TaskModal
    // The error will be displayed in the TaskModal dialog
  }
}

async function handleDelete(taskId: number) {
  if (confirm('Are you sure you want to delete this task?')) {
    try {
      await tasksStore.deleteTask(taskId);
      loadTasks();
    } catch (error) {
      // Error is handled by the store
    }
  }
}

async function handleStatusChange(taskId: number, newStatus: TaskStatus) {
  try {
    await tasksStore.updateTask(taskId, { status: newStatus });
    loadTasks();
  } catch (error) {
    // Error is handled by the store
  }
}

async function handleDrop(event: DragEvent, newStatus: string) {
  event.preventDefault();
  const taskIdStr = event.dataTransfer?.getData('text/plain');
  if (!taskIdStr) return;

  const taskId = Number(taskIdStr);
  if (isNaN(taskId)) return;

  const task = tasksStore.tasks.find(t => t.id === taskId);
  if (!task || task.status === newStatus) return;

  try {
    await tasksStore.updateTask(taskId, { status: newStatus as any });
    loadTasks();
  } catch (error) {
    // Error is handled by the store
  }
}

onMounted(async () => {
  await Promise.all([
    tasksStore.fetchUsers(),
    loadTasks(),
  ]);
});
</script>

