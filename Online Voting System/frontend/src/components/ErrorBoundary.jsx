import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // In production, forward to error tracking (e.g. Sentry)
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="card max-w-md w-full text-center space-y-4">
            <div className="text-5xl" aria-hidden="true">⚠️</div>
            <h1 className="text-2xl font-bold text-slate-900">Something went wrong</h1>
            <p className="text-slate-600 text-sm">
              An unexpected error occurred. Our team has been notified.
            </p>
            {import.meta.env.DEV && this.state.error && (
              <details className="text-left bg-red-50 rounded-lg p-3 text-xs text-red-800 font-mono">
                <summary className="cursor-pointer font-semibold mb-1">Error details</summary>
                <p>{this.state.error.toString()}</p>
                <pre className="mt-2 whitespace-pre-wrap overflow-auto max-h-40">
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
            <button onClick={this.handleReset} className="btn-primary w-full">
              Return to Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
