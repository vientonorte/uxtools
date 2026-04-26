import type { Toast as ToastItem } from '../hooks/useToast';

interface ToastProps {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastProps) {
  if (!toasts.length) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="false"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        zIndex: 9000,
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            background: 'rgba(0,26,114,0.95)',
            border: '1px solid rgba(0,181,226,0.3)',
            borderRadius: '10px',
            padding: '12px 20px',
            fontFamily: 'var(--font-display)',
            fontSize: '14px',
            color: 'var(--white)',
            boxShadow: '0 4px 24px rgba(0,13,58,0.4)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            minWidth: '220px',
          }}
        >
          <span style={{ flex: 1 }}>{t.message}</span>
          <button
            onClick={() => onDismiss(t.id)}
            aria-label="Cerrar notificación"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--muted)',
              cursor: 'pointer',
              fontSize: '16px',
              lineHeight: 1,
              padding: '0 2px',
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
