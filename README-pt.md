# organizador

> **Acesse em:** [organizador-de-tarefas-wtcf.onrender.com](https://organizador-de-tarefas-wtcf.onrender.com)

Um organizador de tarefas leve para o seu dia a dia. Categorize tarefas, defina prazos, receba notificações push — tudo com uma interface limpa e suporte a tema escuro.

## Funcionalidades

- **CRUD completo** — Crie, edite, conclua e exclua tarefas
- **Categorias** — Marque tarefas como Técnico, Normal, Eventos ou Doméstica
- **Badges de prazo** — "Vence hoje", "X dias atrasado", destaque de próximos prazos
- **Filtros inteligentes** — Filtre por categoria + busque por título
- **Arrastar e soltar** — Reordene tarefas por prioridade
- **Autenticação** — Login/registro com JWT e bcrypt
- **Notificações push** — Receba lembretes no navegador
- **PWA** — Instalável na tela inicial com suporte offline parcial
- **Modo escuro** — Alterne entre temas claro e escuro
- **Responsivo** — Funciona no desktop e no celular

## Stack

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 18 + Vite |
| Backend | Express.js |
| Banco de dados | PostgreSQL |
| Notificações | Web Push API |
| Deploy | Render |

## Começando

### Pré-requisitos

- Node.js 20+
- Instância PostgreSQL

### Configuração

```bash
# Clone e instale
git clone <repo-url>
cd organizador-de-tarefas
npm install

# Instale dependências do cliente e servidor
npm install --prefix frontend
npm install --prefix server

# Crie o arquivo .env do servidor
echo 'DATABASE_URL=postgresql://usuario:senha@host:5432/organizador' > server/.env
echo 'JWT_SECRET=seu-segredo-aqui' >> server/.env

# Inicie em modo dev (cliente + servidor em paralelo)
npm run dev
```

O servidor lê as variáveis do `server/.env` automaticamente via `--env-file` (nativo do Node 20.6+).

> **Para notificações push no Render:** defina `VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY` no painel do Render. Para gerar as chaves, execute `npm run dev` localmente e copie de `server/vapid.json` — ou use `npx web-push generate-vapid-keys --json`. Se não definidas, o servidor gera chaves automaticamente (válido apenas para dev local — no Render, chaves mudam a cada deploy se não forem fixadas via env var).

O cliente roda em `http://localhost:5173` e faz proxy das chamadas de API para o servidor na porta `3001`.

### Build para produção

```bash
npm run build
npm start
```

O servidor serve o frontend compilado de `frontend/dist/`.

## Dicas de uso no cotidiano

1. **Adicione tarefas** com prazo — o app destaca o que está perto de vencer
2. **Use categorias** para separar trabalho (Técnico), pessoal (Normal), eventos e tarefas domésticas
3. **Veja "Próximos dias"** no topo para uma visão rápida dos próximos 7 dias
4. **Arraste para reordenar** — as tarefas mais importantes ficam no topo
5. **Ative notificações** — você será lembrado antes dos prazos passarem
6. **Altere para o modo escuro** nas configurações para planejar à noite

## Licença

MIT
