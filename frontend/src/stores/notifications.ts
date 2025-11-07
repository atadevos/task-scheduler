import { defineStore } from 'pinia';
import { ref } from 'vue';
import { websocketService } from '@/services/websocket';

export interface Notification {
  id: string;
  type: 'task:created' | 'task:reassigned' | 'task:deleted' | 'task:completed';
  message: string;
  task?: {
    id: number;
    title: string;
    description?: string;
    startDate: string;
    endDate: string;
    status: string;
  };
  timestamp: Date;
  read: boolean;
}

export const useNotificationsStore = defineStore('notifications', () => {
  const notifications = ref<Notification[]>([]);
  const unreadCount = ref(0);

  function addNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) {
    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      read: false,
    };
    notifications.value.unshift(newNotification);
    unreadCount.value++;
  }

  function markAsRead(id: string) {
    const notification = notifications.value.find((n) => n.id === id);
    if (notification && !notification.read) {
      notification.read = true;
      unreadCount.value = Math.max(0, unreadCount.value - 1);
    }
  }

  function markAllAsRead() {
    notifications.value.forEach((n) => {
      if (!n.read) {
        n.read = true;
      }
    });
    unreadCount.value = 0;
  }

  function removeNotification(id: string) {
    const index = notifications.value.findIndex((n) => n.id === id);
    if (index !== -1) {
      const notification = notifications.value[index];
      if (!notification.read) {
        unreadCount.value = Math.max(0, unreadCount.value - 1);
      }
      notifications.value.splice(index, 1);
    }
  }

  function clearAll() {
    notifications.value = [];
    unreadCount.value = 0;
  }

  const isInitialized = ref(false);

  // Store handler references to remove them later
  let handleTaskCreated: ((data: any) => void) | null = null;
  let handleTaskReassigned: ((data: any) => void) | null = null;
  let handleTaskDeleted: ((data: any) => void) | null = null;
  let handleTaskCompleted: ((data: any) => void) | null = null;

  function initializeWebSocket() {
    // Prevent duplicate initialization
    if (isInitialized.value) {
      console.log('🔔 WebSocket already initialized, skipping...');
      return;
    }

    console.log('🔔 Initializing WebSocket for notifications...');
    isInitialized.value = true;

    // Connect first to create the socket instance
    websocketService.connect();

    // Wait a moment for socket to be created, then register listeners
    // Socket.io will queue listeners registered before connection
    setTimeout(() => {
      // Remove old listeners if they exist (in case of reconnection)
      if (handleTaskCreated) {
        websocketService.off('task:created', handleTaskCreated);
      }
      if (handleTaskReassigned) {
        websocketService.off('task:reassigned', handleTaskReassigned);
      }
      if (handleTaskDeleted) {
        websocketService.off('task:deleted', handleTaskDeleted);
      }
      if (handleTaskCompleted) {
        websocketService.off('task:completed', handleTaskCompleted);
      }

      // Create new handler functions
      handleTaskCreated = (data: any) => {
        console.log('📬 Received task:created notification:', data);
        addNotification({
          type: 'task:created',
          message: data.message || 'A new task has been assigned to you',
          task: data.task,
        });
      };

      handleTaskReassigned = (data: any) => {
        console.log('📬 Received task:reassigned notification:', data);
        addNotification({
          type: 'task:reassigned',
          message: data.message || 'A task has been reassigned to you',
          task: data.task,
        });
      };

      handleTaskDeleted = (data: any) => {
        console.log('📬 Received task:deleted notification:', data);
        addNotification({
          type: 'task:deleted',
          message: data.message || 'A task assigned to you has been deleted',
          task: data.task,
        });
      };

      handleTaskCompleted = (data: any) => {
        console.log('📬 Received task:completed notification:', data);
        addNotification({
          type: 'task:completed',
          message: data.message || 'A task has been completed',
          task: data.task,
        });
      };

      // Register listeners
      websocketService.on('task:created', handleTaskCreated);
      websocketService.on('task:reassigned', handleTaskReassigned);
      websocketService.on('task:deleted', handleTaskDeleted);
      websocketService.on('task:completed', handleTaskCompleted);

      console.log('✅ WebSocket event listeners registered');
    }, 100);
  }

  function disconnectWebSocket() {
    // Remove all listeners before disconnecting
    if (handleTaskCreated) {
      websocketService.off('task:created', handleTaskCreated);
      handleTaskCreated = null;
    }
    if (handleTaskReassigned) {
      websocketService.off('task:reassigned', handleTaskReassigned);
      handleTaskReassigned = null;
    }
    if (handleTaskDeleted) {
      websocketService.off('task:deleted', handleTaskDeleted);
      handleTaskDeleted = null;
    }
    if (handleTaskCompleted) {
      websocketService.off('task:completed', handleTaskCompleted);
      handleTaskCompleted = null;
    }

    isInitialized.value = false;
    websocketService.disconnect();
  }


  return {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    initializeWebSocket,
    disconnectWebSocket,
  };
});

