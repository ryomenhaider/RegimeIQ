import React, { Component } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import api from '../services/api';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    } else {
      // Production: Fire-and-forget error logging
      api.post('/errors', {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        url: window.location.href,
        timestamp: new Date().toISOString()
      }).catch(() => {}); // Never block UI on logging failure
    }
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReload) {
      this.props.onReload();
    } else {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default minimal fallback for widgets
      return (
        <Card className="h-full w-full flex flex-col items-center justify-center p-6 text-center bg-bg-card-alt/50 border-dashed">
          <AlertTriangle className="h-8 w-8 text-regime-volatile mb-4 opacity-50" />
          <h3 className="text-xs font-bold text-text-primary uppercase tracking-widest mb-2">Widget Unavailable</h3>
          <p className="text-[10px] text-text-muted mb-4 max-w-[200px]">
            An unexpected error occurred while rendering this component.
          </p>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={this.handleReload}
            className="text-[10px] font-bold uppercase"
          >
            <RefreshCw className="h-3 w-3 mr-2" />
            Reload Widget
          </Button>
        </Card>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
