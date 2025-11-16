'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Error:', error);
  }, [error]);

  return (
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
        }}>Oops!</h1>
        <p style={{
          fontSize: '1.25rem',
          color: 'rgba(245, 245, 245, 0.6)',
          marginBottom: '8px',
        }}>Something went wrong</p>
        <p style={{
          fontSize: '0.875rem',
          color: 'rgba(245, 245, 245, 0.4)',
          marginBottom: '32px',
        }}>
          {error.message || 'An unexpected error occurred'}
        </p>
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center',
        }}>
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
          <a
            href="/"
            style={{
              padding: '12px 24px',
              background: '#1a1a1a',
              border: '1px solid #333',
              color: '#f5f5f5',
              fontWeight: '500',
              borderRadius: '8px',
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}
