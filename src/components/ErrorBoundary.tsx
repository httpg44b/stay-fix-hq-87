import React from 'react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background text-foreground">
          <h2 className="text-xl font-bold mb-4">Quelque chose s'est mal passé</h2>
          <p className="text-muted-foreground mb-4 text-center">
            {this.state.error?.message || 'Une erreur inattendue est survenue.'}
          </p>
          <Button onClick={() => {
            this.setState({ hasError: false, error: null });
            window.location.reload();
          }}>
            Recharger la page
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
