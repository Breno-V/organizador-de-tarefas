import { getDb } from '../db/init.js'
import { webpush } from '../routes/push.js'

const INTERVAL_MS = 30 * 60 * 1000

function getToday() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function sendNotification(sub, title, body) {
  const payload = JSON.stringify({
    title,
    body,
    tag: 'task-reminder',
    url: '/',
  })
  webpush.sendNotification(sub, payload).catch(err => {
    if (err.statusCode === 410 || err.statusCode === 404) {
      const db = getDb()
      db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(sub.endpoint)
    }
  })
}

function checkAndNotify() {
  try {
    const db = getDb()
    const today = getToday()

    const subscriptions = db.prepare(
      'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE reminders = 1'
    ).all()

    if (subscriptions.length === 0) return

    const dueTasks = db.prepare(
      `SELECT titulo, data_entrega FROM tarefas
       WHERE concluida = 0 AND data_entrega IS NOT NULL AND data_entrega <= ?
       ORDER BY data_entrega ASC`
    ).all(today)

    if (dueTasks.length === 0) return

    const todayTasks = dueTasks.filter(t => t.data_entrega === today)
    const overdueTasks = dueTasks.filter(t => t.data_entrega < today)

    let title = ''
    let body = ''

    if (todayTasks.length > 0 && overdueTasks.length > 0) {
      title = `${todayTasks.length + overdueTasks.length} tarefas pendentes`
      body = `${todayTasks.length} vencem hoje, ${overdueTasks.length} atrasadas`
    } else if (todayTasks.length > 0) {
      title = `${todayTasks.length} tarefa${todayTasks.length > 1 ? 's' : ''} vence${todayTasks.length > 1 ? 'm' : ''} hoje`
      body = todayTasks.slice(0, 3).map(t => t.titulo).join(', ')
      if (todayTasks.length > 3) body += ` e mais ${todayTasks.length - 3}`
    } else if (overdueTasks.length > 0) {
      title = `${overdueTasks.length} tarefa${overdueTasks.length > 1 ? 's' : ''} atrasada${overdueTasks.length > 1 ? 's' : ''}`
      body = overdueTasks.slice(0, 3).map(t => t.titulo).join(', ')
      if (overdueTasks.length > 3) body += ` e mais ${overdueTasks.length - 3}`
    }

    if (!title) return

    for (const sub of subscriptions) {
      sendNotification({
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      }, title, body)
    }
  } catch (err) {
    console.error('Scheduler error:', err)
  }
}

export function startScheduler() {
  checkAndNotify()
  setInterval(checkAndNotify, INTERVAL_MS)
  console.log(`Notificações: verificando a cada ${INTERVAL_MS / 60000} minutos`)
}
