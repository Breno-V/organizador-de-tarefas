import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const addToast = useCallback((message, type = 'success') => {
    const id = ++idRef.current
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3500)
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="toast-container" role="status" aria-live="polite">
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onDismiss={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onDismiss }) {
  const barRef = useRef(null)

  useEffect(() => {
    const bar = barRef.current
    if (!bar) return
    bar.style.transition = 'none'
    bar.style.width = '100%'
    requestAnimationFrame(() => {
      bar.style.transition = 'width 3.5s linear'
      bar.style.width = '0%'
    })
  }, [])

  return (
    <div className={`toast toast--${toast.type}`} onClick={onDismiss}>
      <div className="toast-notch" />
      {toast.type === 'success' ? (
        <svg className="toast-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="16" height="16">
          <path d="M3 8l3.5 3.5L13 4" />
        </svg>
      ) : (
        <svg className="toast-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="16" height="16">
          <circle cx="8" cy="8" r="6" />
          <line x1="8" y1="5" x2="8" y2="9" />
          <line x1="8" y1="11" x2="8" y2="11" />
        </svg>
      )}
      <span className="toast-message">{toast.message}</span>
      <div className="toast-progress-track">
        <div ref={barRef} className="toast-progress-bar" />
      </div>
    </div>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
