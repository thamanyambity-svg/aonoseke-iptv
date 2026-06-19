import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('ErrorBoundary captured error:', error, info.componentStack);
  }

  private resetError = (): void => {
    this.setState({ hasError: false, error: null });
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="error-boundary">
          <h2>Une erreur est survenue</h2>
          <p>Le rendu de cette partie de l'application a échoué.</p>
          {this.state.error && (
            <pre>{this.state.error.message}</pre>
          )}
          <button type="button" onClick={this.resetError}>
            Réessayer
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
