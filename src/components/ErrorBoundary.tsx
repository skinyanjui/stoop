import React from 'react';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    let msg = error.message || 'Something went wrong.';
    try {
      const parsed = JSON.parse(msg);
      if (parsed && typeof parsed.error === 'string') {
        msg = parsed.error.includes('Missing or insufficient permissions')
          ? 'You do not have permission to perform that action. Please sign in and try again.'
          : parsed.error;
      }
    } catch {
      // plain error message
    }
    return { hasError: true, message: msg };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Stoop ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--background)] text-[var(--foreground)]">
          <div
            role="alert"
            className="max-w-md w-full border border-[var(--border)] rounded-xl p-6 text-center space-y-4"
          >
            <h2 className="text-lg font-semibold">Something hit a snag</h2>
            <p className="text-sm text-[var(--text-muted)]">{this.state.message}</p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => this.setState({ hasError: false, message: '' })}
              >
                Try again
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => window.location.reload()}
              >
                Reload Stoop
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
