# Take-home Assignment: Auth with JWT (TypeScript)

Build a small application in **TypeScript/Go/C#** that supports user **registration** and **login** using **JWT**.
You can choose any stack or structure you want.
As long as the core flow works end-to-end, it’s accepted.
Please note User will be using the app in place with very bad connections, like jungle or caves.

---

## Requirements

### 1. Register

- Fields: `email`, `password`, `confirmPassword`

### 2. Login

- Input: `email`, `password`
- Return: **JWT**
- Token should contain at least:
  - `email`
  - `user id` or similar identifier

### 3. Authenticated View / Endpoint

After successful login, calling the protected route / loading the protected screen should show:

```
Hello [email], welcome back
```

user should be logged out after 15 minutes of inacitvity

---

### 4. Manager wallet

User should be able to see and transfer his money to other user.
fields are: recipient, amount, and notes

## What to deliver

- Fork this repository and then send the link
- A runnable project (any structure).
- README explaining:
  - How to build and run it (prepare docker compose)
  - Required environment variables

---

## Acceptance criteria

- Registration works with validation.
- Login returns a usable JWT.
- A protected route or screen shows the welcome message using JWT auth.
- User able to transfer funds

---

## Optional bonus

- Docker
- Backend built using Go (or their frameworks)
- Frontend built using React/Vue (or their frameworks)
- Tests (unit or integration)

This keeps the scope tight: just registration, login, and a protected “Hello [email]” flow.

---

# Solution

Stack: NestJS + Prisma + PostgreSQL (backend), React + Vite (frontend), Docker Compose.

```
backend/    NestJS API
frontend/   React app, served by nginx (proxies /api to backend)
```

## Run with Docker

```bash
cp .env.example .env   # optional, defaults work out of the box
docker compose up --build
```

- App: http://localhost:8080
- API: http://localhost:3000/api

Migrations run automatically when the backend container starts. Every new user gets an initial balance of 1,000,000 so transfers can be tried right away.

## Environment variables

| Name | Default | Description |
| --- | --- | --- |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | `wallet` | Database credentials |
| `JWT_SECRET` | `change-me` | Secret used to sign tokens, change it outside local dev |
| `JWT_EXPIRES_IN` | `15m` | Token lifetime |
| `IDLE_MINUTES` | `15` | Frontend logs out after this many minutes without activity |
| `INITIAL_BALANCE` | `1000000` | Balance given to new users |
| `BACKEND_PORT` | `3000` | Host port for the API |
| `FRONTEND_PORT` | `8080` | Host port for the web app |

For running the backend without Docker, see `backend/.env.example` (`DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `INITIAL_BALANCE`, `PORT`).

## Run locally (without Docker)

```bash
# backend
cd backend
cp .env.example .env    # point DATABASE_URL to your postgres
npm install
npx prisma migrate deploy
npm run start:dev

# frontend (another terminal)
cd frontend
npm install
npm run dev             # http://localhost:5173, /api is proxied to :3000
```

## API

| Method | Path | Auth | Body |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | - | `email`, `password`, `confirmPassword` |
| POST | `/api/auth/login` | - | `email`, `password` → `{ accessToken }` |
| POST | `/api/auth/refresh` | Bearer | → `{ accessToken }` |
| GET | `/api/me` | Bearer | → `Hello [email], welcome back` |
| GET | `/api/wallet` | Bearer | → balance and last 20 transfers |
| POST | `/api/wallet/transfer` | Bearer | `recipient` (email), `amount`, `notes`; optional `Idempotency-Key` header |

JWT payload contains `sub` (user id) and `email`.

## Notes

**Inactivity logout.** Tokens live for 15 minutes. While the user is active, the frontend refreshes the token before it expires. If there is no activity for 15 minutes the frontend logs out, and the server rejects the token anyway once it expires, so an idle session can't be reused.

**Bad connections.** Requests have a timeout and are retried with backoff. Each transfer is sent with an `Idempotency-Key`, so retrying a transfer after a dropped response won't move money twice. The server returns the original transfer instead. Responses are gzipped and the frontend bundle is small (~57 KB gzipped).

**Transfers.** The balance is debited with a conditional update (`balance >= amount`) inside a transaction, so concurrent transfers can't push a balance below zero.

## Tests

```bash
cd backend
npm test            # unit tests
npm run test:e2e    # needs a running postgres (DATABASE_URL)
```
