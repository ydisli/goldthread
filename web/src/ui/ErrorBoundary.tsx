import { Component, type ReactNode } from 'react';

export class ErrorBoundary extends Component<{ children: ReactNode; resetKey: string }, { error: Error | null; key: string }> {
  state = { error: null as Error | null, key: this.props.resetKey };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  static getDerivedStateFromProps(props: { resetKey: string }, state: { key: string }) {
    return props.resetKey !== state.key ? { error: null, key: props.resetKey } : null;
  }

  render() {
    if (this.state.error) {
      return (
        <div className="page" data-error="true">
          <div className="card pad">
            <h2>Something went wrong on this page</h2>
            <p className="small muted">The rest of Goldthread still works — pick another page from the sidebar.</p>
            <pre className="small mono" style={{ whiteSpace: 'pre-wrap', color: 'var(--red)' }}>{this.state.error.message}</pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
