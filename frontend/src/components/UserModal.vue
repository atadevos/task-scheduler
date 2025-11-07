<template>
  <BaseModal :show="show" :error="error" @close="handleClose">
    <template #title>
      {{ user ? 'Edit User' : 'Create User' }}
    </template>

    <form @submit.prevent="handleSubmit" class="space-y-4">
            <!-- Name -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Name <span class="text-red-500">*</span>
              </label>
              <input
                v-model="formData.name"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <!-- Email -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Email <span class="text-red-500">*</span>
              </label>
              <input
                v-model="formData.email"
                type="email"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <!-- Password -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Password <span class="text-red-500">*</span>
                <span v-if="user" class="text-xs text-gray-500 font-normal">(leave blank to keep current)</span>
              </label>
              <input
                v-model="formData.password"
                type="password"
                :required="!user"
                :minlength="6"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              />
              <p class="mt-1 text-xs text-gray-500">Minimum 6 characters</p>
            </div>

            <!-- Role -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Role <span class="text-red-500">*</span>
              </label>
              <select
                v-if="props.currentUserRole === 'admin'"
                v-model="formData.role"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="user">User</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
              <div
                v-else
                class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
              >
                {{ formData.role || 'user' }}
              </div>
              <input
                v-if="props.currentUserRole === 'manager' && !props.user"
                type="hidden"
                v-model="formData.role"
                value="user"
              />
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
                {{ loading ? 'Saving...' : user ? 'Update' : 'Create' }}
              </button>
            </div>
          </form>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useUsersStore } from '@/stores/users';
import BaseModal from './BaseModal.vue';
import type { User } from '@/types';

const props = defineProps<{
  user: User | null;
  show?: boolean;
  currentUserRole?: 'admin' | 'manager' | 'user';
}>();

const emit = defineEmits<{
  close: [];
  save: [userData: { email: string; password?: string; name: string; role?: 'admin' | 'manager' | 'user' }];
}>();

const usersStore = useUsersStore();
const loading = ref(false);
const error = ref<string | null>(null);

// Watch for errors from the store
watch(() => usersStore.error, (newError) => {
  if (newError) {
    error.value = newError;
  }
});

const formData = ref({
  name: '',
  email: '',
  password: '',
  role: 'user' as 'admin' | 'manager' | 'user',
});

// Initialize form data when user changes
watch(
  () => props.user,
  (newUser) => {
    if (newUser) {
      formData.value = {
        name: newUser.name,
        email: newUser.email,
        password: '',
        role: newUser.role,
      };
    } else {
      // For managers creating new users, role is always 'user'
      formData.value = {
        name: '',
        email: '',
        password: '',
        role: props.currentUserRole === 'manager' ? 'user' : 'user',
      };
    }
    error.value = null;
  },
  { immediate: true },
);

const show = computed(() => props.show !== false);

function resetForm() {
  formData.value = {
    name: '',
    email: '',
    password: '',
    role: props.currentUserRole === 'manager' ? 'user' : 'user',
  };
  error.value = null;
}

function handleClose() {
  // Clear form when closing, especially for create mode
  if (!props.user) {
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
    // Validate password for new users
    if (!props.user && !formData.value.password) {
      error.value = 'Password is required for new users';
      loading.value = false;
      return;
    }

    // Validate password length if provided
    if (formData.value.password && formData.value.password.length < 6) {
      error.value = 'Password must be at least 6 characters long';
      loading.value = false;
      return;
    }

    const userData: { email: string; password?: string; name: string; role?: 'admin' | 'manager' | 'user' } = {
      email: formData.value.email,
      name: formData.value.name,
      role: props.currentUserRole === 'manager' ? 'user' : formData.value.role,
    };

    // Only include password if it's provided (for new users or when updating)
    if (formData.value.password) {
      userData.password = formData.value.password;
    }

    emit('save', userData);
  } catch (err: any) {
    const errorMessage = err.response?.data?.message || err.message || 'Failed to save user';
    error.value = errorMessage;
  } finally {
    loading.value = false;
  }
}
</script>

