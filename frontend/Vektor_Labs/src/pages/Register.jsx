import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import RegisterForm from '../components/auth/RegisterForm';

const Register = () => {
  const token = useAuthStore((state) => state.token);
  
  if (token) {
    return <Navigate to="/dashboard/user" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-app p-4">
      <RegisterForm />
    </div>
  );
};

export default Register;
