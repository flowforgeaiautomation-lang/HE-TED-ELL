import { Component } from "react";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}
interface State {
  hasError: boolean;
  retryKey: number;
  retryCount: number;
}

const MAX_RETRIES = 3;

export default class ErrorBoundary extends Component<Props, State> {
  retryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, retryKey: 0, retryCount: 0 };
  }

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("[ErrorBoundary] caught:", error.message);
    if (this.state.retryCount < MAX_RETRIES) {
      this.setState((prev) => ({ retryCount: prev.retryCount + 1 }));
      this.retryTimer = setTimeout(() => {
        this.setState((prev) => ({
          hasError: false,
          retryKey: prev.retryKey + 1,
        }));
      }, 2000);
    }
  }

  componentWillUnmount() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return <>{this.props.fallback}</>;
      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <div className="text-center max-w-md">
            <h1 className="display-2 mt-3">Something went wrong</h1>
            <p className="dek mt-3">
              We couldn't load this page. Try reloading.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 border border-foreground px-5 py-2 text-xs uppercase tracking-widest hover:bg-foreground hover:text-background transition"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return <div key={this.state.retryKey}>{this.props.children}</div>;
  }
}
