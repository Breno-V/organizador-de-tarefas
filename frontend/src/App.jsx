import { useState, useEffect, useCallback } from 'react'
import { useTheme } from './hooks/useTheme'
import { AuthProvider, useAuth } from './context/AuthContext'
import KpiFilter from './components/KpiFilter'
import CardTarefa from './components/CardTarefa'
import FormTarefa from './components/FormTarefa'
import ProximasTarefas from './components/ProximasTarefas'
import ConfirmDialog from './components/ConfirmDialog'
import SettingsPanel from './components/SettingsPanel'
import NotificationBanner from './components/NotificationBanner'
import LoginForm from './components/LoginForm'
import RegisterForm from './components/RegisterForm'
import { ToastProvider, useToast } from './components/Toast'
import LoadingScreen from './components/LoadingScreen'
import { toLocalDate } from './utils/date'
import './App.css'

const API = '/api'

function getPeriodoTasks(tasks) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const duasSemanas = new Date(today)
  duasSemanas.setDate(duasSemanas.getDate() + 14)

  return tasks.filter(t => {
    if (!t.data_entrega) return true
    const target = toLocalDate(t.data_entrega)
    target.setHours(0, 0, 0, 0)
    return target <= duasSemanas
  }).sort((a, b) => {
    if (!a.data_entrega) return -1
    if (!b.data_entrega) return 1
    return toLocalDate(a.data_entrega) - toLocalDate(b.data_entrega)
  })
}

function InnerApp() {
  const { theme, toggle: toggleTheme } = useTheme()
  const { user, loading: authLoading, logout } = useAuth()
  const [showRegister, setShowRegister] = useState(false)
  const [tasks, setTasks] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState(() => {
    const stored = localStorage.getItem('taskFilter')
    const n = Number(stored)
    return Number.isInteger(n) && n > 0 ? n : null
  })
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [search, setSearch] = useState('')
  const [draggedId, setDraggedId] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const toast = useToast()

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API}/tarefas`, { credentials: 'include' })
      const data = await res.json()
      setTasks(data)
    } catch (err) {
      console.error('Erro ao carregar tarefas:', err)
      toast('Erro ao carregar tarefas', 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch(`${API}/categorias`, { credentials: 'include' })
      const data = await res.json()
      setCategories(data)
    } catch (err) {
      console.error('Erro ao carregar categorias:', err)
    }
  }, [])

  useEffect(() => { if (user) { fetchTasks(); fetchCategories() } }, [fetchTasks, fetchCategories, user])

  useEffect(() => {
    if (!user || tasks.length === 0) return
    const params = new URLSearchParams(window.location.search)
    const editId = params.get('editTask')
    if (editId) {
      const task = tasks.find(t => t.id === Number(editId))
      if (task) {
        openEdit(task)
        window.history.replaceState({}, '', '/')
      }
    }
  }, [user, tasks])

  useEffect(() => {
    if (Number.isInteger(filter) && filter > 0) {
      localStorage.setItem('taskFilter', String(filter))
    } else {
      localStorage.removeItem('taskFilter')
    }
  }, [filter])

  const periodoTasks = getPeriodoTasks(tasks)
  const allSearchedTasks = search
    ? tasks.filter(t => t.titulo?.toLowerCase().includes(search.toLowerCase()))
    : tasks
  const allFilteredTasks = filter
    ? allSearchedTasks.filter(t => t.categorias?.some(c => c.id === filter))
    : allSearchedTasks

  async function handleSave(data) {
    try {
      if (editing) {
        await fetch(`${API}/tarefas/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(data),
        })
        toast('Tarefa salva')
      } else {
        await fetch(`${API}/tarefas`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(data),
        })
        toast('Tarefa criada')
      }
      setShowForm(false)
      setEditing(null)
      fetchTasks()
    } catch (err) {
      console.error('Erro ao salvar tarefa:', err)
      toast('Erro ao salvar tarefa', 'error')
    }
  }

  async function handleToggle(tarefa) {
    try {
      await fetch(`${API}/tarefas/${tarefa.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ concluida: tarefa.concluida ? 0 : 1 }),
      })
      fetchTasks()
      toast(tarefa.concluida ? 'Tarefa reaberta' : 'Tarefa concluída')
    } catch (err) {
      console.error('Erro ao alternar tarefa:', err)
      toast('Erro ao alternar tarefa', 'error')
    }
  }

  function handleDelete(id) {
    setConfirmDelete(id)
  }

  async function confirmDeleteTask() {
    if (!confirmDelete) return
    try {
      await fetch(`${API}/tarefas/${confirmDelete}`, { method: 'DELETE', credentials: 'include' })
      setConfirmDelete(null)
      fetchTasks()
      toast('Tarefa excluída')
    } catch (err) {
      console.error('Erro ao excluir tarefa:', err)
      toast('Erro ao excluir tarefa', 'error')
    }
  }

  async function handleReorder(tasks) {
    const orders = tasks.map((t, i) => ({ id: t.id, ordem: i }))
    try {
      await fetch(`${API}/tarefas/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ orders }),
      })
    } catch (err) {
      console.error('Erro ao reordenar:', err)
      toast('Erro ao reordenar', 'error')
    }
  }

  function handleDragStart(id) {
    setDraggedId(id)
  }

  function handleDragOver(e) {
    e.preventDefault()
  }

  function handleDrop(targetId) {
    if (draggedId === null || draggedId === targetId) {
      setDraggedId(null)
      return
    }
    const reordered = [...allFilteredTasks]
    const fromIdx = reordered.findIndex(t => t.id === draggedId)
    const toIdx = reordered.findIndex(t => t.id === targetId)
    if (fromIdx === -1 || toIdx === -1) { setDraggedId(null); return }
    const [moved] = reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, moved)
    handleReorder(reordered)
    setDraggedId(null)
  }

  function openEdit(tarefa) {
    setEditing(tarefa)
    setShowForm(true)
  }

  function openNew() {
    setEditing(null)
    setShowForm(true)
  }

  if (authLoading) return <LoadingScreen />

  if (!user) {
    return showRegister
      ? <RegisterForm onSwitchToLogin={() => setShowRegister(false)} theme={theme} onToggleTheme={toggleTheme} />
      : <LoginForm onSwitchToRegister={() => setShowRegister(true)} theme={theme} onToggleTheme={toggleTheme} />
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <h1 className="app-title">organizador</h1>
          <span className="app-subtitle">{user.nome}</span>
        </div>
        <div className="header-actions">
          <button className="auth-logout-btn" onClick={logout} title="Sair" aria-label="Sair">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
              <polyline points="10 12 14 8 10 4" />
              <line x1="14" y1="8" x2="6" y2="8" />
            </svg>
          </button>
          <button className="theme-toggle" onClick={() => setShowSettings(true)} title="Configurar" aria-label="Configurar">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="9" cy="9" r="5" />
              <circle cx="9" cy="9" r="2" opacity="0.4" />
              <path d="M9 3.5V2M9 14.5V16M3.5 9H2M14.5 9H16" strokeWidth="2" />
              <path d="M5.5 5.5L4 4M12.5 12.5L14 14M5.5 12.5L4 14M12.5 5.5L14 4" strokeWidth="2" />
            </svg>
          </button>
        </div>
      </header>

      <KpiFilter
        tasks={tasks}
        active={filter}
        onChange={setFilter}
        categories={categories}
      />

      <ProximasTarefas
        tasks={periodoTasks}
        search={search}
        onToggle={handleToggle}
        onEdit={openEdit}
        onDelete={handleDelete}
      />

      <div className="search-bar">
        <svg className="search-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" width="14" height="14">
          <circle cx="7" cy="7" r="5" />
          <line x1="11" y1="11" x2="14.5" y2="14.5" />
        </svg>
        <input
          className="search-input"
          type="text"
          placeholder="Buscar tarefa..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button className="search-clear" onClick={() => setSearch('')}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" width="14" height="14">
              <line x1="3" y1="3" x2="13" y2="13" />
              <line x1="13" y1="3" x2="3" y2="13" />
            </svg>
          </button>
        )}
      </div>

      {loading ? (
        <div className="section">
          <div className="section-header">
            <div className="skeleton skeleton-text skeleton-title" />
          </div>
          {[1, 2, 3].map(i => (
            <div key={i} className="card skeleton-card">
              <div className="skeleton skeleton-line skeleton-line--short" />
              <div className="skeleton skeleton-line" />
              <div className="skeleton skeleton-line skeleton-line--long" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="section">
            <div className="section-header">
              <h2 className="section-title">Todas as tarefas</h2>
              <button className="add-btn" onClick={openNew}>
                + Nova
              </button>
            </div>

            {allFilteredTasks.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon" aria-hidden="true">📋</div>
                <p className="empty-state-text">
                  {search
                    ? `Nenhum resultado para "${search}".`
                    : filter
                      ? 'Nenhuma tarefa com essa tag.'
                      : 'Nenhuma tarefa ainda. Clique em "+ Nova" para começar.'}
                </p>
              </div>
            ) : (
              allFilteredTasks.map(t => (
                <CardTarefa
                  key={t.id}
                  tarefa={t}
                  onToggle={handleToggle}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  isDragging={draggedId === t.id}
                />
              ))
            )}
          </div>
        </>
      )}

      {showForm && (
        <FormTarefa
          tarefa={editing}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditing(null) }}
          categories={categories}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          titulo={tasks.find(t => t.id === confirmDelete)?.titulo || ''}
          onConfirm={confirmDeleteTask}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      <NotificationBanner />

      <SettingsPanel
        open={showSettings}
        onClose={() => setShowSettings(false)}
        theme={theme}
        onToggleTheme={toggleTheme}
        categories={categories}
        onCategoryChange={fetchCategories}
        tasks={tasks}
      />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <InnerApp />
      </ToastProvider>
    </AuthProvider>
  )
}
