import { useState, useEffect, useRef } from 'react'
import { urlBase64ToUint8Array } from '../utils/push'

async function unsubscribePush(swReg) {
  const sub = await swReg.pushManager.getSubscription()
  if (sub) {
    await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ endpoint: sub.endpoint }),
    })
    await sub.unsubscribe()
  }
}

function BellIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 2a4.5 4.5 0 0 0-4.5 4.5v2l-1 2h11l-1-2v-2A4.5 4.5 0 0 0 8 2Z" />
      <path d="M6.5 12.5a1.5 1.5 0 0 0 3 0" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 4.5V8l2 1" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 1v9" />
      <path d="M4 6l4 4 4-4" />
      <path d="M1 12v2a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 2.5h10l1 2.5C14 9 11.5 13 8 14.5 4.5 13 2 9 2 5l1-2.5Z" />
      <path d="M6.5 7.5l1.5 1.5 2.5-3" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <line x1="4" y1="4" x2="14" y2="14" />
      <line x1="14" y1="4" x2="4" y2="14" />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="8" cy="5.5" r="2.5" />
      <path d="M3 14c0-2.5 2-4.5 5-4.5s5 2 5 4.5" />
    </svg>
  )
}

function Toggle({ checked, onChange, id }) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`toggle ${checked ? 'toggle--on' : ''}`}
    >
      <span className="toggle-knob" />
    </button>
  )
}

export default function SettingsPanel({ open, onClose, theme, onToggleTheme, user, onOpenAccount }) {
  const panelRef = useRef(null)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [reminderEnabled, setReminderEnabled] = useState(false)
  const [installable, setInstallable] = useState(false)
  const [installEvent, setInstallEvent] = useState(null)
  const [vapidKey, setVapidKey] = useState('')
  const triggerRef = useRef(null)

  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement
    } else if (triggerRef.current) {
      triggerRef.current.focus()
      triggerRef.current = null
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    fetch('/api/push/vapid-public-key')
      .then(r => r.text())
      .then(setVapidKey)
      .catch(() => {})
    checkSubscription()
  }, [open])

  async function checkSubscription() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPushEnabled(false)
      setReminderEnabled(false)
      return
    }
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        setPushEnabled(true)
        setReminderEnabled(true)
      }
    } catch {}
  }

  async function togglePush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await unsubscribePush(reg)
        setPushEnabled(false)
        setReminderEnabled(false)
      } else {
        const perm = await Notification.requestPermission()
        if (perm !== 'granted') return
        const publicKey = vapidKey || await fetch('/api/push/vapid-public-key').then(r => r.text())
        const newSub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        })
        const subBody = newSub.toJSON()
        subBody.reminders = true
        const res = await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(subBody),
        })
        if (!res.ok) throw new Error('Falha ao salvar inscrição')
        setPushEnabled(true)
        setReminderEnabled(true)
      }
    } catch {}
  }

  async function toggleReminder() {
    if (pushEnabled) {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        const newSub = sub.toJSON()
        newSub.reminders = !reminderEnabled
        const res = await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(newSub),
        })
        if (!res.ok) throw new Error('Falha ao salvar inscrição')
        setReminderEnabled(!reminderEnabled)
      }
    }
  }

  async function handleInstall() {
    if (installEvent) {
      installEvent.prompt()
      const result = await installEvent.userChoice
      if (result.outcome === 'accepted') {
        setInstallable(false)
      }
      setInstallEvent(null)
    }
  }

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose()
  }

  useEffect(() => {
    if (!open) return
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  return (
    <>
      <div className={`drawer-overlay ${open ? 'drawer-overlay--open' : ''}`} onClick={handleOverlayClick} />
      <aside
        ref={panelRef}
        className={`drawer ${open ? 'drawer--open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Configurar"
      >
        <div className="drawer-header">
          <h2 className="drawer-title">Configurar</h2>
          <button className="drawer-close" onClick={onClose} aria-label="Fechar configurações">
            <CloseIcon />
          </button>
        </div>

        <div className="drawer-body">
          <div className="drawer-group">
            <div className="drawer-group-label">Alertas</div>

            <div className="drawer-item">
              <div className="drawer-item-left">
                <span className="drawer-item-icon"><BellIcon /></span>
                <div>
                  <div className="drawer-item-label">Notificações</div>
                  <div className="drawer-item-desc">Receber alertas no navegador</div>
                </div>
              </div>
              <Toggle
                id="push-toggle"
                checked={pushEnabled}
                onChange={togglePush}
              />
            </div>

            <div className={`drawer-item ${!pushEnabled ? 'drawer-item--disabled' : ''}`}>
              <div className="drawer-item-left">
                <span className="drawer-item-icon"><ClockIcon /></span>
                <div>
                  <div className="drawer-item-label">Lembretes de vencimento</div>
                  <div className="drawer-item-desc drawer-item-mono">Lembretes por data de vencimento</div>
                </div>
              </div>
              <Toggle
                id="reminder-toggle"
                checked={reminderEnabled}
                onChange={toggleReminder}
              />
            </div>
          </div>

          <div className="drawer-group">
            <div className="drawer-group-label">Instalação</div>

            <div className="drawer-item">
              <div className="drawer-item-left">
                <span className="drawer-item-icon"><DownloadIcon /></span>
                <div>
                  <div className="drawer-item-label">Instalar na tela inicial</div>
                  <div className="drawer-item-desc">Usar como aplicativo</div>
                </div>
              </div>
            </div>
            {installable ? (
              <button className="drawer-install-btn" onClick={handleInstall}>
                <DownloadIcon />
                Instalar
              </button>
            ) : (
              <p className="drawer-install-hint">
                Abra pelo Chrome no celular e use "Adicionar à tela inicial" pelo menu.
              </p>
            )}
          </div>

          <div className="drawer-group">
            <div className="drawer-group-label">Aparência</div>

            <div className="drawer-item">
              <div className="drawer-item-left">
                <span className="drawer-item-icon">
                  {theme === 'light' ? (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
                      <circle cx="8" cy="8" r="3" />
                      <line x1="8" y1="1" x2="8" y2="2.5" />
                      <line x1="8" y1="13.5" x2="8" y2="15" />
                      <line x1="1" y1="8" x2="2.5" y2="8" />
                      <line x1="13.5" y1="8" x2="15" y2="8" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
                      <path d="M14 8.5A5.5 5.5 0 1 1 7.5 2a4.5 4.5 0 0 0 6.5 6.5Z" />
                    </svg>
                  )}
                </span>
                <div>
                  <div className="drawer-item-label">Tema</div>
                  <div className="drawer-item-desc">{theme === 'light' ? 'Claro' : 'Escuro'}</div>
                </div>
              </div>
              <Toggle
                id="theme-toggle-drawer"
                checked={theme === 'dark'}
                onChange={onToggleTheme}
              />
            </div>
          </div>

          <div className="drawer-group">
            <div className="drawer-group-label">Conta</div>
            <div className="drawer-item">
              <div className="drawer-item-left">
                <span className="drawer-item-icon"><UserIcon /></span>
                <div>
                  <div className="drawer-item-label">{user?.nome}</div>
                  <div className="drawer-item-desc drawer-item-mono">{user?.email}</div>
                </div>
              </div>
            </div>
            <button className="drawer-account-btn" onClick={onOpenAccount}>
              Gerenciar conta
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="5 3 9 7 5 11" />
              </svg>
            </button>
          </div>

          <div className="drawer-group">
            <div className="drawer-group-label">Sobre</div>
            <div className="drawer-item">
              <div className="drawer-item-left">
                <span className="drawer-item-icon"><ShieldIcon /></span>
                <div>
                  <div className="drawer-item-label">Dados</div>
                  <div className="drawer-item-desc drawer-item-mono">Armazenados localmente no servidor</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
