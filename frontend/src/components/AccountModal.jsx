import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from './Toast'

export default function AccountModal({ onClose }) {
  const { user, logout, updateUser } = useAuth()
  const toast = useToast()
  const nomeRef = useRef(null)

  const [nome, setNome] = useState(user?.nome || '')
  const [nomeSubmitting, setNomeSubmitting] = useState(false)

  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confSenha, setConfSenha] = useState('')
  const [senhaSubmitting, setSenhaSubmitting] = useState(false)
  const [senhaError, setSenhaError] = useState('')

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteText, setDeleteText] = useState('')
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)

  useEffect(() => {
    nomeRef.current?.focus()
  }, [])

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const nomeChanged = nome.trim() !== (user?.nome || '')

  async function handleSaveNome(e) {
    e.preventDefault()
    if (!nome.trim() || !nomeChanged) return
    setNomeSubmitting(true)
    try {
      const res = await fetch('/api/auth/nome', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ nome: nome.trim() }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao salvar nome')
      }
      const data = await res.json()
      updateUser({ nome: data.nome })
      toast('Nome atualizado')
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setNomeSubmitting(false)
    }
  }

  async function handleAlterarSenha(e) {
    e.preventDefault()
    setSenhaError('')

    if (!senhaAtual) { setSenhaError('Digite sua senha atual.'); return }
    if (novaSenha.length < 6) { setSenhaError('A nova senha deve ter no mínimo 6 caracteres.'); return }
    if (novaSenha !== confSenha) { setSenhaError('As senhas não conferem.'); return }

    setSenhaSubmitting(true)
    try {
      const res = await fetch('/api/auth/senha', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ senha_atual: senhaAtual, nova_senha: novaSenha }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao alterar senha')
      }
      setSenhaAtual('')
      setNovaSenha('')
      setConfSenha('')
      toast('Senha alterada')
    } catch (err) {
      setSenhaError(err.message)
    } finally {
      setSenhaSubmitting(false)
    }
  }

  async function handleDeleteConta() {
    setDeleteSubmitting(true)
    try {
      const res = await fetch('/api/auth/conta', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ confirmacao: 'DELETAR' }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao apagar conta')
      }
      toast('Conta apagada')
      onClose()
      logout()
    } catch (err) {
      toast(err.message, 'error')
      setDeleteSubmitting(false)
    }
  }

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Gerenciar conta">
        <h2 className="modal-title">Conta</h2>

        <p className="account-email">{user?.email}</p>

        <div className="modal-section">
          <h3 className="modal-section-label">Nome</h3>
          <form onSubmit={handleSaveNome} className="account-nome-form">
            <input
              ref={nomeRef}
              className="form-input"
              value={nome}
              onChange={e => setNome(e.target.value)}
              maxLength={200}
              aria-label="Nome"
            />
            <button
              type="submit"
              className="btn btn-primary account-btn"
              disabled={nomeSubmitting || !nome.trim() || !nomeChanged}
            >
              {nomeSubmitting ? 'Salvando…' : 'Salvar'}
            </button>
          </form>
        </div>

        <div className="modal-section">
          <h3 className="modal-section-label">Senha</h3>
          <form onSubmit={handleAlterarSenha} className="account-senha-form">
            <div className="form-group">
              <label className="form-label">Senha atual</label>
              <input
                className="form-input"
                type="password"
                value={senhaAtual}
                onChange={e => { setSenhaAtual(e.target.value); setSenhaError('') }}
                autoComplete="current-password"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Nova senha</label>
              <input
                className="form-input"
                type="password"
                value={novaSenha}
                onChange={e => { setNovaSenha(e.target.value); setSenhaError('') }}
                autoComplete="new-password"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Confirmar nova senha</label>
              <input
                className="form-input"
                type="password"
                value={confSenha}
                onChange={e => { setConfSenha(e.target.value); setSenhaError('') }}
                autoComplete="new-password"
              />
            </div>
            {senhaError && <p className="form-error">{senhaError}</p>}
            <button
              type="submit"
              className="btn btn-primary account-btn"
              disabled={senhaSubmitting || !senhaAtual || !novaSenha || !confSenha}
            >
              {senhaSubmitting ? 'Alterando…' : 'Alterar senha'}
            </button>
          </form>
        </div>

        <div className="danger-zone">
          <div className="danger-zone-rule" />
          <h3 className="danger-zone-label">Zona de perigo</h3>

          {!showDeleteConfirm ? (
            <>
              <p className="danger-zone-text">
                Apagar sua conta remove todas as tarefas, tags e configurações.
                Esta ação é irreversível.
              </p>
              <button
                className="btn btn-danger"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Apagar conta
              </button>
            </>
          ) : (
            <div className="delete-confirm-box">
              <p className="danger-zone-text">
                Digite <strong>DELETAR</strong> para confirmar:
              </p>
              <input
                className="form-input"
                value={deleteText}
                onChange={e => setDeleteText(e.target.value)}
                placeholder='Digite "DELETAR" para confirmar'
                aria-label='Digite DELETAR para confirmar'
                disabled={deleteSubmitting}
              />
              <div className="delete-confirm-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => { setShowDeleteConfirm(false); setDeleteText('') }}
                  disabled={deleteSubmitting}
                >
                  Cancelar
                </button>
                <button
                  className="btn btn-danger"
                  disabled={deleteText !== 'DELETAR' || deleteSubmitting}
                  onClick={handleDeleteConta}
                >
                  {deleteSubmitting ? 'Apagando…' : 'Apagar permanentemente'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
