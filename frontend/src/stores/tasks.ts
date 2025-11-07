import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Task, User, TaskStatus } from '@/types';
import { TaskStatus as TaskStatusEnum } from '@/types';
import { tasksApi, usersApi } from '@/services/api';

export const useTasksStore = defineStore('tasks', () => {
  const tasks = ref<Task[]>([]);
  const users = ref<User[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Statuses are now an enum, create a computed array for UI
  const statuses = computed(() => [
    { id: TaskStatusEnum.IN_PROGRESS, name: 'In Progress' },
    { id: TaskStatusEnum.COMPLETED, name: 'Completed' },
  ]);

  async function fetchTasks(filters?: {
    status?: TaskStatus;
    assignedUserId?: string;
    search?: string;
  }) {
    loading.value = true;
    error.value = null;
    try {
      tasks.value = await tasksApi.getAll(filters);
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch tasks';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchUsers() {
    try {
      users.value = await usersApi.getAll();
    } catch (err: any) {
      // Silently handle 403 (permission denied) - regular users can't fetch all users
      if (err.response?.status === 403) {
        users.value = [];
        return;
      }
      error.value = err.message || 'Failed to fetch users';
    }
  }


  async function createTask(taskData: Partial<Task>) {
    loading.value = true;
    error.value = null;
    try {
      const newTask = await tasksApi.create(taskData);
      tasks.value.unshift(newTask);
      return newTask;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to create task';
      error.value = errorMessage;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function updateTask(id: number, taskData: Partial<Task>) {
    loading.value = true;
    error.value = null;
    try {
      const updatedTask = await tasksApi.update(id, taskData);
      const index = tasks.value.findIndex((t) => t.id === id);
      if (index !== -1) {
        // Use Vue's reactive assignment to ensure reactivity
        tasks.value.splice(index, 1, updatedTask);
      } else {
        // If task not found in list, add it (shouldn't happen, but handle it)
        tasks.value.push(updatedTask);
      }
      return updatedTask;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update task';
      error.value = errorMessage;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function deleteTask(id: number) {
    loading.value = true;
    error.value = null;
    try {
      await tasksApi.delete(id);
      tasks.value = tasks.value.filter((t) => t.id !== id);
    } catch (err: any) {
      error.value = err.message || 'Failed to delete task';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function reassignTask(id: number, assignedUserId: number) {
    loading.value = true;
    error.value = null;
    try {
      const updatedTask = await tasksApi.reassign(id, assignedUserId);
      const index = tasks.value.findIndex((t) => t.id === id);
      if (index !== -1) {
        tasks.value[index] = updatedTask;
      }
      return updatedTask;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to reassign task';
      error.value = errorMessage;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  function getTasksByStatus(status: TaskStatus) {
    return tasks.value.filter((task) => task.status === status);
  }

  return {
    tasks,
    users,
    statuses,
    loading,
    error,
    fetchTasks,
    fetchUsers,
    createTask,
    updateTask,
    deleteTask,
    reassignTask,
    getTasksByStatus,
  };
});

