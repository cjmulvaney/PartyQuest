import { createContext, useContext, useState, useCallback, useRef } from 'react'

const ToastContext = createContext(null)

export function AdminToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++idRef.current
    setToasts((prev) => [...prev, { id, message, type }])
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, duration)
    }
    return id
  }, [])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback({
    info: (msg, dur) => addToast(msg, 'info', dur),
    success: (msg, dur) => addToast(msg, 'success', dur),
    error: (msg, dur) => addToast(msg, 'error', dur ?? 6000),
    warning: (msg, dur) => addToast(msg, 'warning', dur),
  }, [addToast])

  // Wrap toast functions so they're stable
  const value = { toast: { info: toast.info, success: toast.success, error: toast.error, warning: toast.warning }, removeToast }

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast container */}
      {toasts.length > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: '1.5rem',
            right: '1.5rem',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            maxWidth: '420px',
          }}
        >
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onDismiss={() => removeToast(t.id)} />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onDismiss }) {
  const colorMap = {
    info: { bg: 'var(--color-primary-subtle)', border: 'var(--color-primary-light)', text: 'var(--color-primary)' },
    success: { bg: 'var(--color-success-light, #dcfce7)', border: 'var(--color-success, #22c55e)', text: 'var(--color-success, #16a34a)' },
    error: { bg: 'var(--color-danger-light, #fee2e2)', border: 'var(--color-danger, #ef4444)', text: 'var(--color-danger, #dc2626)' },
    warning: { bg: 'var(--color-warning-light, #fef3c7)', border: 'var(--color-warning, #f59e0b)', text: 'var(--color-warning, #d97706)' },
  }
  const colors = colorMap[toast.type] || colorMap.info

  return (
    <div
      style={{
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}`,
        color: colors.text,
        borderRadius: 'var(--radius-md, 8px)',
        padding: '0.75rem 1rem',
        fontFamily: 'var(--font-body)',
        fontSize: '0.875rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        boxShadow: 'var(--shadow-md, 0 4px 6px rgba(0,0,0,0.1))',
        animation: 'slideUp 0.2s ease-out',
      }}
    >
      <span style={{ flex: 1 }}>{toast.message}</span>
      <button
        onClick={onDismiss}
        style={{
          background: 'none',
          border: 'none',
          color: colors.text,
          cursor: 'pointer',
          fontSize: '1.25rem',
          lineHeight: 1,
          padding: '0 0.25rem',
          opacity: 0.7,
        }}
      >
        &times;
      </button>
    </div>
  )
}

export function useAdminToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useAdminToast must be used within AdminToastProvider')
  return ctx
}
