import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { register } from '../../services/auth';
import Button from '../ui/Button';
import Card from '../ui/Card';

const RegisterForm = () => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const data = await register(email, username, password);
      toast.success('Account created successfully!');
      navigate(`/dashboard/${data.username}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md p-8">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">VEKTOR<span className="text-brand-primary">LABS</span></h1>
        <p className="text-text-secondary text-sm">Join the next generation terminal</p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-xs font-semibold text-text-muted uppercase mb-2">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-bg-card-alt border border-border rounded-sm px-4 py-2.5 text-text-primary focus:outline-none focus:border-brand-primary transition-colors"
            placeholder="trader_joe"
            required
          />
        </div>

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
          Create Account
        </Button>
      </form>

      <div className="mt-6 text-center text-sm">
        <span className="text-text-secondary">Already have an account? </span>
        <Link to="/login" className="text-brand-primary hover:text-brand-light font-medium">Sign in</Link>
      </div>
    </Card>
  );
};

export default RegisterForm;
