import { Router } from 'express'
import { getPool } from '../db/init.js'
import webpush from 'web-push'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { authMiddleware } from '../middleware/auth.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const VAPID_PATH = join(__dirname, '..', 'vapid.json')

function getVapidKeys() {
  const envPublic = process.env.VAPID_PUBLIC_KEY
  const envPrivate = process.env.VAPID_PRIVATE_KEY
  if (envPublic && envPrivate) {
    return { publicKey: envPublic, privateKey: envPrivate }
  }
  if (existsSync(VAPID_PATH)) {
    return JSON.parse(readFileSync(VAPID_PATH, 'utf-8'))
  }
  const keys = webpush.generateVAPIDKeys()
  writeFileSync(VAPID_PATH, JSON.stringify(keys, null, 2))
  console.log('Chaves VAPID geradas e salvas em server/vapid.json')
  return keys
}

const vapidKeys = getVapidKeys()
webpush.setVapidDetails(
  'mailto:organizador@localhost',
  vapidKeys.publicKey,
  vapidKeys.privateKey
)

const router = Router()

router.get('/vapid-public-key', (req, res) => {
  res.type('text/plain').send(vapidKeys.publicKey)
})

router.post('/subscribe', authMiddleware, async (req, res) => {
  try {
    const { endpoint, keys, reminders } = req.body
    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({ error: 'Invalid subscription.' })
    }
    const db = getPool()
    const { rows: existing } = await db.query(
      'SELECT id FROM push_subscriptions WHERE endpoint = $1', [endpoint]
    )
    if (existing.length > 0) {
      await db.query(
        'UPDATE push_subscriptions SET p256dh = $1, auth = $2, reminders = $3, usuario_id = $4, updated_at = NOW() WHERE id = $5',
        [keys.p256dh, keys.auth, reminders, req.user.id, existing[0].id]
      )
    } else {
      await db.query(
        'INSERT INTO push_subscriptions (endpoint, p256dh, auth, reminders, usuario_id) VALUES ($1, $2, $3, $4, $5)',
        [endpoint, keys.p256dh, keys.auth, reminders, req.user.id]
      )
    }
    res.json({ ok: true })
  } catch (err) {
    console.error('Push subscribe error:', err)
    res.status(500).json({ error: 'Erro ao salvar inscrição.' })
  }
})

router.post('/unsubscribe', authMiddleware, async (req, res) => {
  try {
    const { endpoint } = req.body
    if (!endpoint) return res.status(400).json({ error: 'Missing endpoint.' })
    const db = getPool()
    await db.query('DELETE FROM push_subscriptions WHERE endpoint = $1 AND usuario_id = $2', [endpoint, req.user.id])
    res.json({ ok: true })
  } catch (err) {
    console.error('Push unsubscribe error:', err)
    res.status(500).json({ error: 'Erro ao remover inscrição.' })
  }
})

export { webpush, vapidKeys, router as pushRouter }
