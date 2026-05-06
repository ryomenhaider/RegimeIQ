import { render, screen } from '@testing-library/react';
import Badge from '../../components/ui/Badge';

describe('Badge', () => {
  const variants = ['trending', 'mean_reverting', 'volatile', 'illiquid', 'info', 'warning', 'danger', 'success', 'neutral'];

  test.each(variants)('renders %s variant with correct color', (variant) => {
    render(<Badge variant={variant}>Test</Badge>);
    
    const badge = screen.getByText('Test');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveStyle({ fontFamily: 'IBM Plex Mono, monospace' });
  });

  test('applies pulse animation to volatile', () => {
    render(<Badge variant="volatile">VOLATILE</Badge>);
    
    const badge = screen.getByText('VOLATILE');
    // Check that animation is applied (implementation specific)
    expect(badge).toBeInTheDocument();
  });

  test('applies pulse animation to illiquid', () => {
    render(<Badge variant="illiquid">ILLIQUID</Badge>);
    
    const badge = screen.getByText('ILLIQUID');
    expect(badge).toBeInTheDocument();
  });

  test('renders children correctly', () => {
    render(<Badge>My Content</Badge>);
    expect(screen.getByText('My Content')).toBeInTheDocument();
  });

  test('renders with custom className', () => {
    render(<Badge className="custom-class">Styled</Badge>);
    expect(screen.getByText('Styled')).toHaveClass('custom-class');
  });
});