import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { User } from '@/types';
import { authApi } from '@/services/api';

// Helper function to decode JWT token
function decodeJWT(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
}

// Helper function to restore user from token
function restoreUserFromToken(token: string | null): User | null {
  if (!token) return null;

  try {
    const decoded = decodeJWT(token);
    if (!decoded || !decoded.sub || !decoded.email) {
      console.warn('Token decode failed or missing required fields:', { decoded });
      return null;
    }

    // Check if token is expired
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      console.warn('Token expired');
      return null;
    }

    const restoredUser = {
      id: decoded.sub,
      email: decoded.email,
      name: decoded.name || decoded.email.split('@')[0] || 'User', // Fallback if name not in token
      role: decoded.role || 'user',
    };

    console.debug('User restored from token:', { email: restoredUser.email, role: restoredUser.role });
    return restoredUser;
  } catch (error) {
    console.error('Error restoring user from token:', error);
    return null;
  }
}

export const useAuthStore = defineStore('auth', () => {
  // Get token from localStorage
  const storedToken = localStorage.getItem('token');
  const token = ref<string | null>(storedToken);

  // Restore user from token on initialization (synchronous)
  const user = ref<User | null>(storedToken ? restoreUserFromToken(storedToken) : null);

  // Function to restore user from token (can be called if user is null but token exists)
  function restoreAuth() {
    if (token.value && !user.value) {
      const restored = restoreUserFromToken(token.value);
      if (restored) {
        user.value = restored;
        console.debug('Auth restored successfully');
      } else {
        // Token is invalid or expired, clear it
        console.warn('Token invalid, clearing auth');
        user.value = null;
        token.value = null;
        localStorage.removeItem('token');
      }
    }
  }

  const isAuthenticated = computed(() => {
    // Simple check: both token and user must exist
    return !!(token.value && user.value);
  });

  async function login(email: string, password: string) {
    console.log('🔑 Auth store login called for:', email);

    try {
      console.log('📡 Calling authApi.login...');
      const response = await authApi.login(email, password);
      console.log('📨 Auth API response received:', {
        hasAccessToken: !!response.access_token,
        user: response.user,
        responseKeys: Object.keys(response)
      });

      console.log('💾 Setting token and user in store...');
      token.value = response.access_token;
      user.value = response.user;
      localStorage.setItem('token', response.access_token);

      console.log('✅ Auth store login completed successfully');
      return response;
    } catch (error) {
      console.error('❌ Auth store login failed:', error);
      throw error;
    }
  }

  function logout() {
    // Disconnect WebSocket before logout
    import('./notifications').then(({ useNotificationsStore }) => {
      const notificationsStore = useNotificationsStore();
      notificationsStore.disconnectWebSocket();
      notificationsStore.clearAll();
    });

    user.value = null;
    token.value = null;
    localStorage.removeItem('token');
  }

  function setUser(userData: User) {
    user.value = userData;
  }

  // Initialize auth on store creation - ensure user is restored
  if (storedToken && !user.value) {
    restoreAuth();
  }

  return {
    user,
    token,
    isAuthenticated,
    login,
    logout,
    setUser,
    restoreAuth,
  };
});

