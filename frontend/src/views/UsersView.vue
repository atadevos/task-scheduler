<template>
  <AppLayout>
    <div class="p-8">
      <!-- Actions -->
      <div class="mb-6 flex justify-between items-center">
        <h2 class="text-xl font-semibold text-gray-900">Users</h2>
        <button
          @click="openCreateModal"
          class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
        >
          + Create User
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="usersStore.loading" class="text-center py-12">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <p class="mt-2 text-gray-600">Loading users...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="usersStore.error" class="rounded-md bg-red-50 p-4 mb-6">
        <p class="text-sm font-medium text-red-800">{{ usersStore.error }}</p>
      </div>

      <!-- Users Table -->
      <div v-else class="bg-white shadow rounded-lg overflow-hidden">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="user in usersStore.users" :key="user.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">{{ user.name }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-500">{{ user.email }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  :class="{
                    'bg-purple-100 text-purple-800': user.role === 'admin',
                    'bg-gray-100 text-gray-800': user.role === 'user',
                  }"
                  class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                >
                  {{ user.role }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatDate(user.createdAt) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  @click="openEditModal(user)"
                  class="text-indigo-600 hover:text-indigo-900 mr-4"
                >
                  Edit
                </button>
                <button
                  v-if="user.role !== 'admin'"
                  @click="handleDelete(user.id)"
                  class="text-red-600 hover:text-red-900"
                >
                  Delete
                </button>
              </td>
            </tr>
            <tr v-if="usersStore.users.length === 0">
              <td colspan="5" class="px-6 py-4 text-center text-sm text-gray-500">
                No users found
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- User Modal -->
    <UserModal
      :show="showModal"
      :user="selectedUser"
      :current-user-role="currentUserRole"
      @close="closeModal"
      @save="handleSaveUser"
    />
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useUsersStore } from '@/stores/users';
import { useAuthStore } from '@/stores/auth';
import AppLayout from '@/components/AppLayout.vue';
import UserModal from '@/components/UserModal.vue';
import type { User } from '@/types';

const usersStore = useUsersStore();
const authStore = useAuthStore();

const currentUserRole = computed(() => authStore.user?.role);

const showModal = ref(false);
const selectedUser = ref<User | null>(null);

function formatDate(date?: string): string {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString();
}

function openCreateModal() {
  selectedUser.value = null;
  showModal.value = true;
}

function openEditModal(user: User) {
  selectedUser.value = user;
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
  selectedUser.value = null;
  // Clear store error when closing modal
  usersStore.error = null;
}

async function handleSaveUser(userData: {
  email: string;
  password?: string;
  name: string;
  role?: 'admin' | 'manager' | 'user';
}) {
  try {
    // Clear any previous errors
    usersStore.error = null;

    const isNewUser = !selectedUser.value;

    if (selectedUser.value) {
      await usersStore.updateUser(selectedUser.value.id, userData);
    } else {
      if (!userData.password) {
        throw new Error('Password is required for new users');
      }
      await usersStore.createUser({
        email: userData.email,
        password: userData.password,
        name: userData.name,
        role: userData.role || 'user',
      });
    }

    await usersStore.fetchUsers();

    // Close modal after successful creation or update
    closeModal();
  } catch (error) {
    // Error is handled by the store and UserModal
    // The error will be displayed in the UserModal dialog
  }
}

async function handleDelete(userId: number) {
  if (confirm('Are you sure you want to delete this user?')) {
    try {
      await usersStore.deleteUser(userId);
      await usersStore.fetchUsers();
    } catch (error) {
      // Error is handled by the store
    }
  }
}

onMounted(async () => {
  await usersStore.fetchUsers();
});
</script>

