import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
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
    throw new Response('Unauthorized', { status: 401 });
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
    return <Navigate to={`/dashboard/${username}`} replace />;
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
    loader: async () => {
      const isAuthenticated = useAuthStore.getState().isAuthenticated();
      const username = useAuthStore.getState().username;
      if (isAuthenticated && username) {
        return <Navigate to={`/dashboard/${username}`} replace />;
      }
      return null;
    }
  },
  {
    path: '/register',
    element: <AppContent><Register /></AppContent>,
    loader: async () => {
      const isAuthenticated = useAuthStore.getState().isAuthenticated();
      const username = useAuthStore.getState().username;
      if (isAuthenticated && username) {
        return <Navigate to={`/dashboard/${username}`} replace />;
      }
      return null;
    }
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
    path: '*',
    element: <Navigate to="/" replace />
  }
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
