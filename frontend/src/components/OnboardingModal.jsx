import { useState, useEffect, useRef } from 'react'

const STEPS = [
  {
    title: 'Seu bloco',
    text: 'Crie tarefas, defina prazos, receba lembretes. É só apertar + Nova.',
  },
  {
    title: 'Tags que colam',
    text: 'Cada tarefa ganha uma cor. Filtre por categoria, encontre o que importa.',
  },
  {
    title: 'Mãos à obra',
    text: 'Sua primeira tarefa está esperando. O que você precisa fazer hoje?',
  },
]

function Illustration({ step }) {
  const fill = step === 0 ? '#2D6A4F' : step === 1 ? '#5B4FCF' : '#B34A4A'
  return (
    <svg viewBox="0 0 120 80" aria-hidden="true" className="onboarding-illustration-svg">
      <rect x="10" y="5" width="100" height="70" rx="3" fill="#F5F0EB" stroke="#D4C9B8" strokeWidth="1.5" />
      <line x1="25" y1="22" x2="95" y2="22" stroke="#E0D5C4" strokeWidth="0.8" />
      <line x1="25" y1="32" x2="95" y2="32" stroke="#E0D5C4" strokeWidth="0.8" />
      <line x1="25" y1="42" x2="95" y2="42" stroke="#E0D5C4" strokeWidth="0.8" />
      <line x1="25" y1="52" x2="95" y2="52" stroke="#E0D5C4" strokeWidth="0.8" />
      {step === 0 && (
        <line x1="25" y1="22" x2="72" y2="22" stroke={fill} strokeWidth="2.5" strokeLinecap="round" />
      )}
      {step === 1 && (
        <>
          <circle cx="40" cy="32" r="5" fill="#2D6A4F" opacity="0.7" />
          <circle cx="55" cy="32" r="5" fill="#5B4FCF" opacity="0.7" />
          <circle cx="70" cy="32" r="5" fill="#B87A3A" opacity="0.7" />
        </>
      )}
      {step === 2 && (
        <line x1="25" y1="32" x2="88" y2="32" stroke={fill} strokeWidth="2.5" strokeLinecap="round" />
      )}
    </svg>
  )
}

export default function OnboardingModal({ onComplete, onCreateTask }) {
  const [step, setStep] = useState(0)
  const cardRef = useRef(null)
  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    const focusable = el.querySelectorAll('button')
    if (focusable.length) focusable[0].focus()

    function trap(e) {
      if (e.key !== 'Tab') return
      const buttons = el.querySelectorAll('button')
      const first = buttons[0]
      const last = buttons[buttons.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    el.addEventListener('keydown', trap)
    return () => el.removeEventListener('keydown', trap)
  }, [step])

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onComplete()
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') onComplete()
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick} onKeyDown={handleKeyDown}>
      <div className="onboarding-card" ref={cardRef} role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
        <div className="onboarding-illustration">
          <Illustration step={step} />
        </div>
        <h2 className="onboarding-title" id="onboarding-title">{current.title}</h2>
        <p className="onboarding-text">{current.text}</p>

        <div className="onboarding-dots" role="tablist" aria-label="Progresso">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={'onboarding-dot' + (i === step ? ' active' : i < step ? ' past' : ' future')}
              role="tab"
              aria-selected={i === step}
              aria-label={'Etapa ' + (i + 1)}
            />
          ))}
        </div>

        {isLast ? (
          <div className="onboarding-last-actions">
            <button className="onboarding-create" onClick={onCreateTask}>
              Criar primeira tarefa
            </button>
            <button className="onboarding-explore" onClick={onComplete}>
              Explorar sozinho
            </button>
          </div>
        ) : (
          <div className="onboarding-actions">
            <button className="onboarding-skip" onClick={onComplete}>Saltar</button>
            <button className="onboarding-next" onClick={() => setStep(s => s + 1)}>Continuar</button>
          </div>
        )}
      </div>
    </div>
  )
}
