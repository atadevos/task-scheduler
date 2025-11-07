import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth';

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect() {
    const authStore = useAuthStore();
    const token = authStore.token;

    if (!token) {
      console.warn('⚠️ Cannot connect WebSocket: No authentication token');
      return;
    }

    if (this.socket?.connected) {
      console.log('ℹ️ WebSocket already connected');
      return;
    }

    // Use the same base URL as the API, but without /api prefix
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
    const wsUrl = apiBaseUrl.replace('/api', '');

    console.log(`🔌 Attempting to connect WebSocket to: ${wsUrl}/notifications`);

    this.socket = io(`${wsUrl}/notifications`, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected successfully');
      console.log('Socket ID:', this.socket?.id);
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('⚠️ WebSocket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error);
      console.error('Error details:', {
        message: error.message,
        type: error.type,
        description: error.description,
      });
      this.reconnectAttempts++;
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('❌ Max WebSocket reconnection attempts reached');
      }
    });

  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('WebSocket disconnected');
    }
  }

  on(event: string, callback: (data: any) => void) {
    // Socket.io handles listeners registered before connection automatically
    // But we need to ensure socket exists first
    if (!this.socket) {
      console.warn(`⚠️ Cannot register listener for ${event}: Socket not initialized. Call connect() first.`);
      return;
    }
    this.socket.on(event, callback);
    console.log(`📌 Registered listener for event: ${event}`);
  }

  off(event: string, callback?: (data: any) => void) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  reconnect() {
    this.disconnect();
    this.connect();
  }
}

export const websocketService = new WebSocketService();

