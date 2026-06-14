import { Router } from 'express'
import { getDb } from '../db/init.js'
import webpush from 'web-push'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const VAPID_PATH = join(__dirname, '..', 'vapid.json')
const APP_URL = process.env.APP_URL || 'http://localhost:3001'

function getVapidKeys() {
  if (existsSync(VAPID_PATH)) {
    return JSON.parse(readFileSync(VAPID_PATH, 'utf-8'))
  }
  const keys = webpush.generateVAPIDKeys()
  writeFileSync(VAPID_PATH, JSON.stringify(keys, null, 2))
  return keys
}

const vapidKeys = getVapidKeys()
webpush.setVapidDetails(
  `mailto:organizador@localhost`,
  vapidKeys.publicKey,
  vapidKeys.privateKey
)

const router = Router()

router.get('/vapid-public-key', (req, res) => {
  res.type('text/plain').send(vapidKeys.publicKey)
})

router.post('/subscribe', (req, res) => {
  try {
    const { endpoint, keys, reminders } = req.body
    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({ error: 'Invalid subscription.' })
    }
    const db = getDb()
    const existing = db.prepare('SELECT id FROM push_subscriptions WHERE endpoint = ?').get(endpoint)
    if (existing) {
      db.prepare('UPDATE push_subscriptions SET p256dh = ?, auth = ?, reminders = ?, updated_at = datetime(\'now\') WHERE id = ?')
        .run(keys.p256dh, keys.auth, reminders ? 1 : 0, existing.id)
    } else {
      db.prepare('INSERT INTO push_subscriptions (endpoint, p256dh, auth, reminders) VALUES (?, ?, ?, ?)')
        .run(endpoint, keys.p256dh, keys.auth, reminders ? 1 : 0)
    }
    res.json({ ok: true })
  } catch (err) {
    console.error('Push subscribe error:', err)
    res.status(500).json({ error: 'Erro ao salvar inscrição.' })
  }
})

router.post('/unsubscribe', (req, res) => {
  try {
    const { endpoint } = req.body
    if (!endpoint) return res.status(400).json({ error: 'Missing endpoint.' })
    const db = getDb()
    db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(endpoint)
    res.json({ ok: true })
  } catch (err) {
    console.error('Push unsubscribe error:', err)
    res.status(500).json({ error: 'Erro ao remover inscrição.' })
  }
})

export { webpush, vapidKeys, router as pushRouter }
