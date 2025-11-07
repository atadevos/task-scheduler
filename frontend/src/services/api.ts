import axios, {
  AxiosInstance,
  AxiosHeaders,
  type InternalAxiosRequestConfig,
  type AxiosResponse,
  type AxiosError,
} from 'axios';
import type { Task, User, TaskStatus, LoginResponse } from '@/types';
import { useAuthStore } from '@/stores/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth token to requests
    this.client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
      const authStore = useAuthStore();
      if (authStore.token) {
        const headers =
          config.headers instanceof AxiosHeaders
            ? config.headers
            : AxiosHeaders.from(config.headers || {});

        headers.set('Authorization', `Bearer ${authStore.token}`);
        config.headers = headers;
      }
      return config;
    });

    // Handle auth errors and setup errors
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          const authStore = useAuthStore();
          authStore.logout();
          window.location.href = '/login';
        }
        // Don't redirect on 403 (permission denied) - let components handle it
        // Check if error message indicates setup error
        const responseData = error.response?.data as { message?: string } | undefined;
        if (responseData?.message?.includes('SETUP_ERROR') ||
            responseData?.message?.includes('No admin user')) {
          window.location.href = '/';
        }
        return Promise.reject(error);
      },
    );
  }

  get axios() {
    return this.client;
  }
}

const apiClient = new ApiClient();

export const healthApi = {
  async check(): Promise<{ status: string; adminExists: boolean; message: string }> {
    const response = await apiClient.axios.get('/health');
    return response.data;
  },
};

export const authApi = {
  async login(email: string, password: string): Promise<LoginResponse> {
    console.log('🌐 Making API call to /auth/login for:', email);

    try {
      const response = await apiClient.axios.post('/auth/login', { email, password });
      console.log('📨 API response received:', {
        status: response.status,
        statusText: response.statusText,
        hasData: !!response.data,
        dataKeys: response.data ? Object.keys(response.data) : null
      });

      if (response.data) {
        console.log('📊 Response data structure:', {
          hasAccessToken: !!response.data.access_token,
          hasUser: !!response.data.user,
          userKeys: response.data.user ? Object.keys(response.data.user) : null
        });
      }

      return response.data;
    } catch (error: any) {
      console.error('❌ API call failed:', error);
      console.error('Error response:', error.response);
      console.error('Error config:', error.config);
      throw error;
    }
  },
};

export const usersApi = {
  async getAll(): Promise<User[]> {
    const response = await apiClient.axios.get('/users');
    return response.data;
  },

  async getOne(id: number): Promise<User> {
    const response = await apiClient.axios.get(`/users/${id}`);
    return response.data;
  },

  async create(user: { email: string; password: string; name: string; role?: 'admin' | 'user' }): Promise<User> {
    const response = await apiClient.axios.post('/users', user);
    return response.data;
  },

  async update(id: number, user: Partial<{ email: string; password: string; name: string; role: 'admin' | 'user' }>): Promise<User> {
    const response = await apiClient.axios.put(`/users/${id}`, user);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient.axios.delete(`/users/${id}`);
  },
};

export const tasksApi = {
  async getAll(filters?: {
    status?: TaskStatus;
    assignedUserId?: number;
    search?: string;
  }): Promise<Task[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.assignedUserId) params.append('assignedUserId', String(filters.assignedUserId));
    if (filters?.search) params.append('search', filters.search);

    const response = await apiClient.axios.get(`/tasks?${params.toString()}`);
    return response.data;
  },

  async getOne(id: number): Promise<Task> {
    const response = await apiClient.axios.get(`/tasks/${id}`);
    return response.data;
  },

  async create(task: Partial<Task>): Promise<Task> {
    const response = await apiClient.axios.post('/tasks', task);
    return response.data;
  },

  async update(id: number, task: Partial<Task>): Promise<Task> {
    const response = await apiClient.axios.put(`/tasks/${id}`, task);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient.axios.delete(`/tasks/${id}`);
  },

  async reassign(id: number, assignedUserId: number): Promise<Task> {
    const response = await apiClient.axios.put(`/tasks/${id}/reassign`, {
      assignedUserId,
    });
    return response.data;
  },
};

