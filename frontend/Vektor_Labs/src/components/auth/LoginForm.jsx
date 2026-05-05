import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { login } from '../../services/auth';
import Button from '../ui/Button';
import Card from '../ui/Card';

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const data = await login(email, password);
      toast.success(`Welcome back, ${data.username}!`);
      navigate(`/dashboard/${data.username}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md p-8">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">VEKTOR<span className="text-brand-primary">LABS</span></h1>
        <p className="text-text-secondary text-sm">Trading terminal for semi-pro traders</p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-xs font-semibold text-text-muted uppercase mb-2">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-bg-card-alt border border-border rounded-sm px-4 py-2.5 text-text-primary focus:outline-none focus:border-brand-primary transition-colors"
            placeholder="name@example.com"
            required
          />
        </div>
        
        <div>
          <label className="block text-xs font-semibold text-text-muted uppercase mb-2">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-bg-card-alt border border-border rounded-sm px-4 py-2.5 text-text-primary focus:outline-none focus:border-brand-primary transition-colors"
            placeholder="••••••••"
            required
          />
        </div>

        <Button type="submit" className="w-full py-3" isLoading={isLoading}>
          Sign In
        </Button>
      </form>

      <div className="mt-6 text-center text-sm">
        <span className="text-text-secondary">Don't have an account? </span>
        <Link to="/register" className="text-brand-primary hover:text-brand-light font-medium">Create one</Link>
      </div>
    </Card>
  );
};

export default LoginForm;
