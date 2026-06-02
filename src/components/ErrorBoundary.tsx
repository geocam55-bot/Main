import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Reusable Error Fallback UI
 */
export function ErrorBoundaryFallback({ error, onReset, onReload }: { error: any; onReset?: () => void; onReload?: () => void }) {
  const handleReload = onReload || (() => window.location.reload());
  const handleReset = onReset || (() => { window.location.href = '/'; });

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <CardTitle className="text-2xl">Something went wrong</CardTitle>
              <CardDescription>
                An unexpected error occurred in the application
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Error Message */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="font-medium text-red-900 mb-1">Error Details:</p>
            <p className="text-sm text-red-700 font-mono">
              {error?.message || String(error) || 'Unknown error'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleReload}
              className="flex-1"
              variant="default"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Reload Application
            </Button>
            <Button
              onClick={handleReset}
              className="flex-1"
              variant="outline"
            >
              Try Again
            </Button>
          </div>

          {/* Help Text */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
            <p className="text-blue-900">
              <strong>What you can do:</strong>
            </p>
            <ul className="list-disc list-inside text-blue-800 mt-2 space-y-1">
              <li>Try reloading the application</li>
              <li>Clear your browser cache and cookies</li>
              <li>Check your internet connection</li>
              <li>Contact support if the problem persists</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Error Boundary Component
 * Catches React errors and displays a fallback UI
 * Prevents the entire app from crashing
 */
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Update state with error details
    this.setState({
      error,
      errorInfo,
    });

    // Handle chunk loading and dynamic import errors by self-healing (reloading)
    const isDynamicImportError = 
      error?.message?.includes('Failed to fetch dynamically imported module') ||
      error?.message?.includes('Importing a module script failed') ||
      error?.message?.includes('chunk');

    if (isDynamicImportError) {
      const lastReload = sessionStorage.getItem('last-chunk-reload');
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
        sessionStorage.setItem('last-chunk-reload', String(now));
        window.location.reload();
      }
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorBoundaryFallback 
          error={this.state.error} 
          onReset={this.handleReset} 
          onReload={this.handleReload} 
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;