import { useState, useEffect } from 'react'
import { urlBase64ToUint8Array } from '../utils/push'

export default function NotificationBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return
    if (Notification.permission === 'default') {
      const dismissed = localStorage.getItem('notif-banner-dismissed')
      if (!dismissed) setVisible(true)
    }
  }, [])

  async function handleAllow() {
    setVisible(false)
    const perm = await Notification.requestPermission()
    if (perm === 'granted') {
      try {
        const reg = await navigator.serviceWorker.ready
        const keyRes = await fetch('/api/push/vapid-public-key')
        const publicKey = await keyRes.text()
        if (!publicKey) return
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        })
        const subBody = sub.toJSON()
        subBody.reminders = true
        const res = await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(subBody),
        })
        if (!res.ok) throw new Error('Falha ao salvar inscrição')
      } catch {}
    }
  }

  function handleDismiss() {
    setVisible(false)
    localStorage.setItem('notif-banner-dismissed', 'true')
  }

  if (!visible) return null

  return (
    <div className="notif-banner" role="alert">
      <svg className="notif-banner-icon" width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 2.5A4.5 4.5 0 0 0 4.5 7v2l-1 2h11l-1-2V7A4.5 4.5 0 0 0 9 2.5Z" />
        <path d="M7.5 13.5a1.5 1.5 0 0 0 3 0" />
      </svg>
      <div className="notif-banner-content">
        <div className="notif-banner-title">Receber lembretes</div>
        <div className="notif-banner-text">
          Ative as notificações para ser avisado quando tarefas estiverem perto do vencimento.
        </div>
      </div>
      <div className="notif-banner-actions">
        <button className="notif-banner-btn notif-banner-btn--allow" onClick={handleAllow}>
          Permitir
        </button>
        <button className="notif-banner-btn notif-banner-btn--later" onClick={handleDismiss}>
          Agora não
        </button>
      </div>
    </div>
  )
}
