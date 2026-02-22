import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class PerformanceErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(
      "Performance Error Boundary caught an error:",
      error,
      errorInfo,
    );

    // Log to performance monitoring service
    if ("performance" in window && "measure" in performance) {
      performance.mark("error-boundary-triggered");
      performance.measure("error-recovery", "error-boundary-triggered");
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md mx-auto text-center p-8">
              <div className="w-16 h-16 mx-auto mb-4 text-red-500">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Etwas ist schiefgelaufen
              </h2>
              <p className="text-gray-600 mb-6">
                Ein unerwarteter Fehler ist aufgetreten. Bitte laden Sie die
                Seite neu.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Seite neu laden
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
