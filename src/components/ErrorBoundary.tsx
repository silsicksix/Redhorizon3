import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('RedHorizon Uncaught React Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    try {
      localStorage.removeItem('redhorizon_session_active');
      sessionStorage.removeItem('redhorizon_terminal_unlocked');
    } catch {}
    window.location.href = window.location.pathname;
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: '#05070e',
          color: '#f8fafc',
          fontFamily: 'monospace',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          zIndex: 999999
        }}>
          <div style={{
            maxWidth: '650px',
            width: '100%',
            backgroundColor: '#0f172a',
            border: '1px solid #ef4444',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 0 40px rgba(239, 68, 68, 0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                backgroundColor: '#ef4444',
                boxShadow: '0 0 10px #ef4444'
              }} />
              <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#fca5a5', margin: 0, letterSpacing: '0.1em' }}>
                RED HORIZON // DIAGNOSIS SISTEM
              </h2>
            </div>

            <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.6', marginBottom: '16px' }}>
              Ralat masa-nyata dikesan semasa memaparkan komponen. Sila klik butang di bawah untuk memuat semula sistem operasi dengan selamat.
            </p>

            <pre style={{
              backgroundColor: '#020617',
              color: '#f87171',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '11px',
              overflowX: 'auto',
              border: '1px solid #1e293b',
              marginBottom: '20px'
            }}>
              {this.state.error?.message || 'Unknown runtime error'}
            </pre>

            <button
              onClick={this.handleReset}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#ef4444',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 900,
                fontSize: '13px',
                cursor: 'pointer',
                letterSpacing: '0.08em',
                textTransform: 'uppercase'
              }}
            >
              🔄 Reset Sesi & Buka Semula Workspace
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
