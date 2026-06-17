# organizador

> **Live at:** [organizador-de-tarefas-wtcf.onrender.com](https://organizador-de-tarefas-wtcf.onrender.com)

A lightweight task organizer for your daily life. Categorize tasks, set deadlines, get push notifications — all with a clean, dark-mode-ready interface.

## Features

- **Full CRUD** — Create, edit, complete, and delete tasks
- **Categories** — Tag tasks as Técnico, Normal, Eventos, or Doméstica
- **Deadline badges** — "Due today", "X days overdue", upcoming highlights
- **Smart filtering** — Filter by category + search by title
- **Drag & drop** — Reorder tasks by priority
- **Authentication** — Login/register with JWT and bcrypt
- **Push notifications** — Get browser reminders for upcoming tasks
- **PWA** — Installable on home screen with partial offline support
- **Dark mode** — Toggle between light and dark themes
- **Responsive** — Works on desktop and mobile

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Vite |
| Backend | Express.js |
| Database | PostgreSQL |
| Notifications | Web Push API |
| Deploy | Render |

## Getting started

### Prerequisites

- Node.js 20+
- PostgreSQL instance

### Setup

```bash
# Clone and install
git clone https://github.com/Breno-V/organizador-de-tarefas
cd organizador-de-tarefas
npm install

# Install client & server deps
npm install --prefix frontend
npm install --prefix server

# Create server .env file
echo 'DATABASE_URL=postgresql://user:pass@host:5432/organizador' > server/.env
echo 'JWT_SECRET=your-secret-here' >> server/.env

# Start in dev mode (client + server concurrently)
npm run dev
```

The server reads env vars from `server/.env` automatically via `--env-file` (built into Node 20.6+).

> **For push notifications on Render:** set `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` in the Render dashboard. To generate keys, run `npm run dev` locally and copy from `server/vapid.json` — or run `npx web-push generate-vapid-keys --json`. If unset, the server auto-generates keys (fine for local dev — on Render, keys change on every deploy without fixed env vars).

The client runs on `http://localhost:5173` and proxies API calls to the server on port `3001`.

### Build for production

```bash
npm run build
npm start
```

The server serves the built frontend from `frontend/dist/`.

## Daily usage tips

1. **Add tasks** with a deadline — the app highlights what's due soon
2. **Use categories** to separate work (Técnico), personal (Normal), events, and home tasks
3. **Check "Próximos dias"** at the top for a quick 7-day view
4. **Drag to reorder** — the most important tasks stay on top
5. **Enable notifications** — you'll get reminded before deadlines pass
6. **Toggle dark mode** in settings for late-night planning

## License

MIT
