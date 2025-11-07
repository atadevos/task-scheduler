import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { User } from '@/types';
import { usersApi } from '@/services/api';

export const useUsersStore = defineStore('users', () => {
  const users = ref<User[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchUsers() {
    loading.value = true;
    error.value = null;
    try {
      users.value = await usersApi.getAll();
    } catch (err: any) {
      // Handle 403 (permission denied) gracefully
      if (err.response?.status === 403) {
        error.value = 'You do not have permission to view users';
        users.value = [];
      } else {
        error.value = err.message || 'Failed to fetch users';
      }
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function createUser(userData: {
    email: string;
    password: string;
    name: string;
    role?: 'admin' | 'manager' | 'user';
  }) {
    loading.value = true;
    error.value = null;
    try {
      const newUser = await usersApi.create(userData);
      users.value.unshift(newUser);
      return newUser;
    } catch (err: any) {
      error.value = err.message || 'Failed to create user';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function updateUser(id: number, userData: Partial<{
    email: string;
    password: string;
    name: string;
    role: 'admin' | 'manager' | 'user';
  }>) {
    loading.value = true;
    error.value = null;
    try {
      const updatedUser = await usersApi.update(id, userData);
      const index = users.value.findIndex((u) => u.id === id);
      if (index !== -1) {
        users.value[index] = updatedUser;
      }
      return updatedUser;
    } catch (err: any) {
      error.value = err.message || 'Failed to update user';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function deleteUser(id: number) {
    loading.value = true;
    error.value = null;
    try {
      await usersApi.delete(id);
      users.value = users.value.filter((u) => u.id !== id);
    } catch (err: any) {
      error.value = err.message || 'Failed to delete user';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  return {
    users,
    loading,
    error,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
  };
});

