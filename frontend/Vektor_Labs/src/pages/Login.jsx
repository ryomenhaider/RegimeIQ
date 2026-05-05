import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import LoginForm from '../components/auth/LoginForm';

const Login = () => {
  const token = useAuthStore((state) => state.token);
  
  if (token) {
    return <Navigate to="/dashboard/user" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-app p-4">
      <LoginForm />
    </div>
  );
};

export default Login;
