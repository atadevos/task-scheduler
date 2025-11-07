<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-2xl w-full">
      <div class="bg-white shadow-lg rounded-lg p-8">
        <div class="flex items-center mb-6">
          <div class="flex-shrink-0">
            <svg
              class="h-12 w-12 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div class="ml-4">
            <h1 class="text-2xl font-bold text-gray-900">Setup Required</h1>
            <p class="text-sm text-gray-600 mt-1">Application configuration is incomplete</p>
          </div>
        </div>

        <div class="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg
                class="h-5 w-5 text-red-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clip-rule="evenodd"
                />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm text-red-700">
                <strong>No admin user found in the database.</strong>
              </p>
              <p class="text-sm text-red-700 mt-2">
                The application requires at least one admin user to function properly.
              </p>
            </div>
          </div>
        </div>

        <div class="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
          <h3 class="text-sm font-medium text-blue-800 mb-2">To fix this issue:</h3>
          <ol class="list-decimal list-inside text-sm text-blue-700 space-y-2">
            <li>
              Add an admin user to <code class="bg-blue-100 px-1 rounded">backend/config/initial-data.json</code>
            </li>
            <li>
              Restart the Docker containers:
              <pre class="mt-2 bg-gray-800 text-green-400 p-3 rounded text-xs overflow-x-auto"><code>docker-compose down
docker-compose up -d</code></pre>
            </li>
          </ol>
        </div>

        <div class="bg-gray-50 border border-gray-200 rounded-md p-4 mb-6">
          <h4 class="text-sm font-medium text-gray-900 mb-2">Example configuration:</h4>
          <pre class="text-xs bg-gray-800 text-gray-100 p-3 rounded overflow-x-auto"><code>{
  "users": [
    {
      "id": "user-admin-1",
      "email": "${ADMIN_EMAIL:-admin@example.com}",
      "name": "${ADMIN_NAME:-Admin User}",
      "role": "admin",
      "password": "${ADMIN_PASSWORD:-your-secure-password}"
    }
  ]
}</code></pre>
          <p class="text-xs text-gray-600 mt-2">
            Note: Statuses are automatically seeded and do not need to be configured.
          </p>
        </div>

        <div class="flex justify-end">
          <button
            @click="checkAgain"
            :disabled="checking"
            class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            <span v-if="checking">Checking...</span>
            <span v-else>Check Again</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { healthApi } from '@/services/api';

const router = useRouter();
const checking = ref(false);

async function checkAgain() {
  checking.value = true;
  try {
    const health = await healthApi.check();
    if (health.status === 'ok') {
      // Refresh the page to let HomeView show the dashboard
      window.location.reload();
    }
  } catch (error) {
    // Still in setup error state
  } finally {
    checking.value = false;
  }
}
</script>

