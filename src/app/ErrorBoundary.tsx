import { Component, type ReactNode } from "react";
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <main className="fatal">
          <h1>Something went wrong</h1>
          <p>
            Reload to start a fresh session. Unsaved inputs will be cleared.
          </p>
          <a href="/">Reload application</a>
        </main>
      );
    return this.props.children;
  }
}
