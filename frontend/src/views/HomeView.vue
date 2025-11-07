<template>
  <SetupErrorView v-if="showSetupError" />
  <DashboardView v-else-if="healthOk && isAuthenticated" />
  <div v-else class="min-h-screen bg-gray-50 flex items-center justify-center">
    <div class="text-center">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      <p class="mt-2 text-gray-600">Loading...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { healthApi } from '@/services/api';
import SetupErrorView from './SetupErrorView.vue';
import DashboardView from './DashboardView.vue';

const router = useRouter();
const authStore = useAuthStore();
const showSetupError = ref(false);
const healthOk = ref(false);
const checking = ref(true);

const isAuthenticated = computed(() => authStore.isAuthenticated);

async function checkHealth() {
  checking.value = true;
  try {
    const health = await healthApi.check();
    healthOk.value = health.status === 'ok';
    showSetupError.value = health.status !== 'ok';

    // If health is OK but user is not authenticated, redirect to login
    if (healthOk.value && !isAuthenticated.value) {
      router.push('/login');
    }
  } catch (error) {
    // If health check fails, show setup error
    healthOk.value = false;
    showSetupError.value = true;
  } finally {
    checking.value = false;
  }
}

onMounted(async () => {
  await checkHealth();

  // Initialize WebSocket if user is already authenticated (e.g., on page refresh)
  if (isAuthenticated.value) {
    const { useNotificationsStore } = await import('@/stores/notifications');
    const notificationsStore = useNotificationsStore();
    notificationsStore.initializeWebSocket();
  }
});

// Watch for authentication changes
watch(isAuthenticated, async (authenticated) => {
  if (healthOk.value && authenticated) {
    // Health is OK and user is authenticated, show dashboard
    // Initialize WebSocket if not already connected
    const { useNotificationsStore } = await import('@/stores/notifications');
    const notificationsStore = useNotificationsStore();
    if (!notificationsStore.notifications.length) {
      notificationsStore.initializeWebSocket();
    }
  } else if (healthOk.value && !authenticated) {
    // Health is OK but user is not authenticated, redirect to login
    router.push('/login');
  }
});
</script>

