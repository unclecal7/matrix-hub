import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack); // eslint-disable-line no-console
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            background: 'var(--mh-bg, #0a0c10)',
            color: 'var(--mh-text, #e2e8f0)',
            fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
            gap: 16,
            padding: 32,
          }}
        >
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 24,
              fontWeight: 700,
              color: 'var(--mh-danger, #f43f5e)',
            }}
          >
            Something went wrong
          </div>
          <div style={{ fontSize: 13, color: 'var(--mh-text-dim, #64748b)', maxWidth: 500, textAlign: 'center' }}>
            {this.state.error?.message || 'An unexpected error occurred in the UI.'}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              marginTop: 8,
              padding: '8px 20px',
              borderRadius: 6,
              border: '1px solid var(--mh-accent, #00e5a0)',
              background: 'transparent',
              color: 'var(--mh-accent, #00e5a0)',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
