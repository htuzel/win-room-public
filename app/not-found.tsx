export default function NotFound() {
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
        textAlign: 'center',
      }}>
        <h1 style={{
          fontSize: '3.75rem',
          fontWeight: 'bold',
          color: '#f5f5f5',
          marginBottom: '16px',
        }}>404</h1>
        <p style={{
          fontSize: '1.25rem',
          color: 'rgba(245, 245, 245, 0.6)',
          marginBottom: '32px',
        }}>Page not found</p>
        <a
          href="/"
          style={{
            padding: '12px 24px',
            background: '#22c55e',
            color: '#000',
            fontWeight: '500',
            borderRadius: '8px',
            textDecoration: 'none',
            display: 'inline-block',
          }}
        >
          Go back home
        </a>
      </div>
    </div>
  );
}
