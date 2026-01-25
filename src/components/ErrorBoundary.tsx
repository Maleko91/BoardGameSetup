import { Component, type ErrorInfo, type ReactNode } from "react";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unexpected render error", error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const baseUrl = import.meta.env.BASE_URL ?? "/";
    const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;

    return (
      <section className="stage">
        <div className="panel">
          <h2>Something went wrong</h2>
          <p className="hint">
            We hit an unexpected error. Try again or return home.
          </p>
          {import.meta.env.DEV && this.state.error ? (
            <div className="status error" role="alert">
              {this.state.error.message}
            </div>
          ) : null}
          <div className="stage-actions">
            <button type="button" className="btn primary" onClick={this.handleRetry}>
              Try again
            </button>
            <a className="btn ghost" href={normalizedBase}>
              Go home
            </a>
          </div>
        </div>
      </section>
    );
  }
}
