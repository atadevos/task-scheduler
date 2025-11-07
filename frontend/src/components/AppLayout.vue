<template>
  <div class="min-h-screen bg-gray-50 flex">
    <!-- Left Sidebar Menu -->
    <aside class="w-64 bg-white shadow-lg flex-shrink-0">
      <div class="h-full flex flex-col">
        <!-- Logo/Title -->
        <div class="p-6 border-b">
          <h1 class="text-xl font-bold text-gray-900">Task Scheduler</h1>
        </div>

        <!-- Navigation Menu -->
        <nav class="flex-1 p-4">
          <ul class="space-y-2">
            <li>
              <router-link
                to="/"
                class="flex items-center px-4 py-3 text-gray-700 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                :class="{
                  'bg-indigo-100 text-indigo-700': $route.path === '/',
                }"
              >
                <svg
                  class="w-5 h-5 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                Tasks
              </router-link>
            </li>
            <li v-if="authStore.user?.role === 'admin' || authStore.user?.role === 'manager'">
              <router-link
                to="/users"
                class="flex items-center px-4 py-3 text-gray-700 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                :class="{
                  'bg-indigo-100 text-indigo-700': $route.path === '/users',
                }"
              >
                <svg
                  class="w-5 h-5 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
                Users
              </router-link>
            </li>
          </ul>
        </nav>

        <!-- User Info & Logout -->
        <div class="p-4 border-t">
          <div class="flex items-center justify-between mb-3">
            <div>
              <p class="text-sm font-medium text-gray-900">{{ authStore.user?.name }}</p>
              <p class="text-xs text-gray-500">{{ authStore.user?.email }}</p>
            </div>
          </div>
          <button
            @click="handleLogout"
            class="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </aside>

    <!-- Right Content Area -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Header -->
      <header class="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div class="flex justify-end items-center">
          <NotificationBell />
        </div>
      </header>

      <!-- Content -->
      <main class="flex-1 overflow-y-auto">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import NotificationBell from './NotificationBell.vue';

const router = useRouter();
const authStore = useAuthStore();

function handleLogout() {
  authStore.logout();
  router.push('/login');
}
</script>

