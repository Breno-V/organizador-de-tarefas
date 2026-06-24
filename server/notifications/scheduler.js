import { getPool } from '../db/init.js'
import { webpush } from '../routes/push.js'

const INTERVAL_MS = 5 * 60 * 1000
const GRACE_MS = 60 * 60 * 1000

const MILESTONES = [
  { key: '24h', interval: 24 * 60 * 60 * 1000 },
  { key: '12h', interval: 12 * 60 * 60 * 1000 },
  { key: '3h', interval: 3 * 60 * 60 * 1000 },
]

function sendNotification(sub, title, body, taskId, milestone) {
  const tag = taskId ? `reminder-${milestone}-${taskId}` : `reminder-${milestone}`
  const payload = JSON.stringify({
    title,
    body: body || '',
    tag,
    renotify: false,
    data: {
      taskId: taskId || null,
      milestone,
      url: '/',
    },
  })
  webpush.sendNotification(sub, payload).catch(async err => {
    if (err.statusCode === 410 || err.statusCode === 404) {
      const db = getPool()
      await db.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [sub.endpoint])
    } else if (err.statusCode === 401 || err.statusCode === 403) {
      console.error('[Push] Erro de autenticação VAPID — chave pública/privada mudou?', err.statusCode)
    }
  })
}

function formatTime(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

async function checkAndNotify() {
  try {
    const db = getPool()
    const now = new Date()

    const { rows: subscriptions } = await db.query(
      `SELECT endpoint, p256dh, auth, usuario_id
       FROM push_subscriptions WHERE reminders = true AND usuario_id IS NOT NULL`
    )
    if (subscriptions.length === 0) return

    const userSubs = {}
    for (const sub of subscriptions) {
      if (!userSubs[sub.usuario_id]) userSubs[sub.usuario_id] = []
      userSubs[sub.usuario_id].push(sub)
    }

    for (const userId of Object.keys(userSubs)) {
      const { rows: tasks } = await db.query(
        `SELECT id, titulo, data_entrega FROM tarefas
         WHERE concluida = false AND usuario_id = $1
         AND data_entrega IS NOT NULL
         ORDER BY data_entrega ASC`,
        [userId]
      )
      if (tasks.length === 0) continue

      const taskIds = tasks.map(t => t.id)
      const { rows: sentRows } = await db.query(
        `SELECT tarefa_id, milestone FROM task_reminders_sent
         WHERE tarefa_id = ANY($1)`,
        [taskIds]
      )
      const sentSet = new Set(sentRows.map(r => `${r.tarefa_id}:${r.milestone}`))

      const toInsert = []
      const overdueTasks = []

      for (const task of tasks) {
        const dueRaw = task.data_entrega instanceof Date ? task.data_entrega : new Date(task.data_entrega)
        const dueMs = dueRaw.getTime() + dueRaw.getTimezoneOffset() * 60000
        const nowMs = now.getTime()
        const diffMs = dueMs - nowMs

        for (const ms of MILESTONES) {
          const msTime = dueMs - ms.interval
          const key = `${task.id}:${ms.key}`
          if (sentSet.has(key)) continue
          if (nowMs < msTime || nowMs > msTime + GRACE_MS) continue

          let title
          if (ms.key === '24h') title = 'Amanhã vence'
          else if (ms.key === '12h') title = `Vence às ${formatTime(due)}`
          else title = 'Em 3h'

          for (const sub of userSubs[userId]) {
            sendNotification({
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            }, title, task.titulo, task.id, ms.key)
          }
          toInsert.push({ tarefa_id: task.id, milestone: ms.key })
        }

        if (dueMs < nowMs) {
          const overdueKey = `${task.id}:overdue`
          if (!sentSet.has(overdueKey)) {
            overdueTasks.push(task)
            toInsert.push({ tarefa_id: task.id, milestone: 'overdue' })
          }
        }
      }

      if (overdueTasks.length > 0) {
        const more = overdueTasks.length > 3 ? ` e mais ${overdueTasks.length - 3}` : ''
        const title = overdueTasks.length === 1
          ? `${overdueTasks[0].titulo} atrasada`
          : `${overdueTasks.length} tarefas atrasadas`
        const body = overdueTasks.length === 1
          ? `Há ${Math.floor((now.getTime() - new Date(overdueTasks[0].data_entrega).getTime()) / 3600000)}h`
          : overdueTasks.slice(0, 3).map(t => t.titulo).join(', ') + more

        for (const sub of userSubs[userId]) {
          sendNotification({
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          }, title, body, null, 'overdue')
        }
      }

      if (toInsert.length > 0) {
        const values = toInsert.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(', ')
        const flatParams = toInsert.flatMap(t => [t.tarefa_id, t.milestone])
        await db.query(
          `INSERT INTO task_reminders_sent (tarefa_id, milestone) VALUES ${values} ON CONFLICT DO NOTHING`,
          flatParams
        )
      }
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
