<template>
  <div class="relative">
    <button
      @click="toggleDropdown"
      class="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-md"
      aria-label="Notifications"
    >
      <svg
        class="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
      <span
        v-if="notificationsStore.unreadCount > 0"
        class="absolute top-0 right-0 block h-4 w-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center"
      >
        {{ notificationsStore.unreadCount > 9 ? '9+' : notificationsStore.unreadCount }}
      </span>
    </button>

    <!-- Dropdown -->
    <div
      v-if="showDropdown"
      class="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg z-50 border border-gray-200"
      @click.stop
    >
      <div class="p-4 border-b border-gray-200 flex justify-between items-center">
        <h3 class="text-sm font-semibold text-gray-900">Notifications</h3>
        <div class="flex gap-2">
          <button
            v-if="notificationsStore.unreadCount > 0"
            @click="markAllAsRead"
            class="text-xs text-indigo-600 hover:text-indigo-800"
          >
            Mark all read
          </button>
          <button
            @click="clearAll"
            class="text-xs text-gray-600 hover:text-gray-800"
          >
            Clear all
          </button>
        </div>
      </div>

      <div class="max-h-96 overflow-y-auto">
        <div
          v-if="notificationsStore.notifications.length === 0"
          class="p-4 text-center text-sm text-gray-500"
        >
          No notifications
        </div>
        <div
          v-for="notification in notificationsStore.notifications"
          :key="notification.id"
          @click="handleNotificationClick(notification)"
          :class="[
            'p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50',
            !notification.read ? 'bg-blue-50' : '',
          ]"
        >
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <p class="text-sm font-medium text-gray-900">
                {{ notification.message }}
              </p>
              <p
                v-if="notification.task"
                class="text-xs text-gray-500 mt-1"
              >
                {{ notification.task.title }}
              </p>
              <p class="text-xs text-gray-400 mt-1">
                {{ formatTime(notification.timestamp) }}
              </p>
            </div>
            <button
              @click.stop="removeNotification(notification.id)"
              class="ml-2 text-gray-400 hover:text-gray-600"
              aria-label="Remove notification"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Backdrop to close dropdown -->
  <div
    v-if="showDropdown"
    class="fixed inset-0 z-40"
    @click="showDropdown = false"
  ></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useNotificationsStore } from '@/stores/notifications';
import { useTasksStore } from '@/stores/tasks';
import { formatDistanceToNow } from 'date-fns';

const notificationsStore = useNotificationsStore();
const tasksStore = useTasksStore();
const router = useRouter();
const showDropdown = ref(false);

function toggleDropdown() {
  showDropdown.value = !showDropdown.value;
  if (showDropdown.value) {
    // Mark all visible notifications as read when opening dropdown
    notificationsStore.notifications
      .filter((n) => !n.read)
      .forEach((n) => notificationsStore.markAsRead(n.id));
  }
}

function markAllAsRead() {
  notificationsStore.markAllAsRead();
}

function clearAll() {
  notificationsStore.clearAll();
  showDropdown.value = false;
}

function removeNotification(id: string) {
  notificationsStore.removeNotification(id);
}

async function handleNotificationClick(notification: any) {
  console.log('🔔 Notification clicked:', notification);
  notificationsStore.markAsRead(notification.id);
  showDropdown.value = false;

  // Navigate to dashboard and refresh tasks
  const currentPath = router.currentRoute.value.path;

  if (currentPath !== '/') {
    // Navigate to dashboard if not already there
    await router.push('/');
  }

  // Always refresh tasks to show the latest data
  // Use nextTick to ensure the dashboard component is ready
  await nextTick();
  tasksStore.fetchTasks();
  console.log('✅ Tasks refreshed');
}

function formatTime(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: true });
}

// Close dropdown when clicking outside
function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement;
  if (!target.closest('.relative')) {
    showDropdown.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

