import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';

// Lazy load dashboard routes
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));
const Billing = lazy(() => import('./pages/Billing'));
const Docs = lazy(() => import('./pages/Docs'));

const PageSkeleton = () => <div className="p-4 text-white">Loading...</div>;

function App() {
  return (
    <Router>
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard/*" element={<Dashboard />} />
          <Route path="/dashboard/:username/settings" element={<Settings />} />
          <Route path="/dashboard/:username/billing" element={<Billing />} />
          <Route path="/docs" element={<Docs />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
