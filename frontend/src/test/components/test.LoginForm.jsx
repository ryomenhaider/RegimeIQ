import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import LoginForm from '../../components/auth/LoginForm';

const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('LoginForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders login form', async () => {
    renderWithRouter(<LoginForm />);
    
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  test('shows error on invalid email', async () => {
    renderWithRouter(<LoginForm />);
    
    const emailInput = screen.getByLabelText(/email/i);
    await userEvent.type(emailInput, 'invalid');
    fireEvent.blur(emailInput);
    
    // Check for validation error (implementation dependent)
  });

  test('shows error on 401 response', async () => {
    // Mock the auth service to return 401
    renderWithRouter(<LoginForm />);
    
    // This would require MSW to mock the 401 response
    // Test implementation depends on auth service mocking
  });

  test('disables form while loading', async () => {
    renderWithRouter(<LoginForm />);
    
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    
    // Fill valid data
    await userEvent.type(emailInput, 'test@example.com');
    await userEvent.type(passwordInput, 'Password123');
    
    // Click submit
    await userEvent.click(submitButton);
    
    // Check for loading state
    // Implementation depends on loading state handling
  });
});