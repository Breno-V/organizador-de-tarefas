import { getPool } from '../db/init.js'
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
  webpush.sendNotification(sub, payload).catch(async err => {
    if (err.statusCode === 410 || err.statusCode === 404) {
      const db = getPool()
      await db.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [sub.endpoint])
    }
  })
}

async function checkAndNotify() {
  try {
    const db = getPool()
    const today = getToday()

    const { rows: subscriptions } = await db.query(
      'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE reminders = true'
    )

    if (subscriptions.length === 0) return

    const { rows: dueTasks } = await db.query(
      `SELECT titulo, data_entrega FROM tarefas
       WHERE concluida = false AND data_entrega IS NOT NULL AND data_entrega <= $1
       ORDER BY data_entrega ASC`,
      [today]
    )

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
  checkAndNotify().catch(console.error)
  setInterval(() => checkAndNotify().catch(console.error), INTERVAL_MS)
  console.log(`Notificações: verificando a cada ${INTERVAL_MS / 60000} minutos`)
}
