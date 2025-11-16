'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div style={{
          minHeight: '100vh',
          background: '#0a0a0a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}>
          <div style={{
            maxWidth: '28rem',
            textAlign: 'center',
          }}>
            <h1 style={{
              fontSize: '3.75rem',
              fontWeight: 'bold',
              color: '#f5f5f5',
              marginBottom: '16px',
            }}>500</h1>
            <p style={{
              fontSize: '1.25rem',
              color: 'rgba(245, 245, 245, 0.6)',
              marginBottom: '8px',
            }}>Global error</p>
            <p style={{
              fontSize: '0.875rem',
              color: 'rgba(245, 245, 245, 0.4)',
              marginBottom: '32px',
            }}>
              {error.message || 'A critical error occurred'}
            </p>
            <button
              onClick={reset}
              style={{
                padding: '12px 24px',
                background: '#22c55e',
                color: '#000',
                fontWeight: '500',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
