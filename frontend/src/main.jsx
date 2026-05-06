import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider, redirect, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import './index.css';

// App wrapper with providers
import AppContent from './App';

// Pages
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Billing from './pages/Billing';
import Docs from './pages/Docs';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';

// Components
import ProtectedRoute from './components/layout/ProtectedRoute';

/**
 * Protected route loader
 * Checks authentication before rendering protected pages
 */
const protectedLoader = async () => {
  const isAuthenticated = useAuthStore.getState().isAuthenticated();
  if (!isAuthenticated) {
    sessionStorage.setItem('intended_route', window.location.pathname);
    return redirect('/login');
  }
  return null;
};

/**
 * Auth redirect loader
 * If already authenticated, redirect to dashboard
 */
const authRedirectLoader = async () => {
  const isAuthenticated = useAuthStore.getState().isAuthenticated();
  const username = useAuthStore.getState().username;
  if (isAuthenticated && username) {
    return redirect(`/dashboard/${username}`);
  }
  return null;
};

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppContent><LandingPage /></AppContent>
  },
  {
    path: '/login',
    element: <AppContent><Login /></AppContent>,
    loader: authRedirectLoader
  },
  {
    path: '/register',
    element: <AppContent><Register /></AppContent>,
    loader: authRedirectLoader
  },
  {
    path: '/dashboard/:username',
    element: (
      <AppContent>
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </AppContent>
    ),
    loader: protectedLoader
  },
  {
    path: '/dashboard/:username/settings',
    element: (
      <AppContent>
        <ProtectedRoute>
          <Settings />
        </ProtectedRoute>
      </AppContent>
    ),
    loader: protectedLoader
  },
  {
    path: '/dashboard/:username/billing',
    element: (
      <AppContent>
        <ProtectedRoute>
          <Billing />
        </ProtectedRoute>
      </AppContent>
    ),
    loader: protectedLoader
  },
  {
    path: '/docs',
    element: <AppContent><Docs /></AppContent>
  },
  {
    path: '/privacy',
    element: <AppContent><Privacy /></AppContent>
  },
  {
    path: '/terms',
    element: <AppContent><Terms /></AppContent>
  },
  {
    path: '/admin',
    element: <AdminLogin />
  },
  {
    path: '/admin/dashboard',
    element: <AdminDashboard />
  },
  {
    path: '*',
    element: <Navigate to="/" replace />
  }
]);

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-right" />
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>
);
