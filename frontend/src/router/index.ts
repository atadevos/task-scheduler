import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { healthApi } from '@/services/api';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/LoginView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/',
      name: 'Home',
      component: () => import('@/views/HomeView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/users',
      name: 'Users',
      component: () => import('@/views/UsersView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/login',
    },
  ],
});

router.beforeEach(async (to, from, next) => {
  // For root path, let HomeView handle the health check
  if (to.path === '/') {
    next();
    return;
  }

  // Check setup status before allowing access to other routes
  let healthStatus = 'ok';
  try {
    const health = await healthApi.check();
    healthStatus = health.status;
  } catch (error) {
    // If health check fails, assume setup error
    healthStatus = 'error';
  }

  // If setup error, redirect to root to show setup error page
  if (healthStatus !== 'ok') {
    next('/');
    return;
  }

  // Setup is OK, continue with normal routing
  const authStore = useAuthStore();

  // Ensure auth is restored before checking
  // This should already be done on store initialization, but ensure it here too
  if (authStore.token && !authStore.user) {
    authStore.restoreAuth();
  }

  const requiresAuth = to.meta.requiresAuth !== false;

  if (requiresAuth && !authStore.isAuthenticated) {
    next('/login');
  } else if (!requiresAuth && authStore.isAuthenticated && to.path === '/login') {
    // Redirect authenticated users away from login page to dashboard
    next('/');
  } else {
    // Check role-based access for /users route
    if (to.path === '/users') {
      const userRole = authStore.user?.role;
      if (userRole !== 'admin' && userRole !== 'manager') {
        // Regular users don't have access to users page - redirect to dashboard
        next('/');
        return;
      }
    }
    next();
  }
});

export default router;

