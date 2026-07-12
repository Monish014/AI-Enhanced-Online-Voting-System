# AI-Enhanced Online Voting System

A full-stack secure e-voting platform with AI face recognition, liveness detection,
blockchain-style vote receipts, real-time fraud monitoring, and a chatbot assistant.

---

## Project Structure

```
/
├── backend/      Node.js + Express + MongoDB API
└── frontend/     React (Vite) + Tailwind CSS SPA
```

---

## Quick Start

### 1. Backend

```bash
cd backend
cp .env.example .env          # fill in MONGODB_URI, JWT secrets, etc.
npm install
npm run dev                   # starts on http://localhost:5000
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env          # set VITE_API_URL, VITE_SOCKET_URL
npm install
npm run dev                   # starts on http://localhost:5173
```

### 3. face-api.js Models

Download the required model weights and place them in `frontend/public/models/`:

```
tiny_face_detector_model-weights_manifest.json + shard(s)
face_landmark_68_model-weights_manifest.json   + shard(s)
face_recognition_model-weights_manifest.json   + shard(s)
face_expression_recognition_model-*            + shard(s)
```

Download from: https://github.com/justadudewhohacks/face-api.js/tree/master/weights

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Access token secret (min 32 chars) |
| `JWT_REFRESH_SECRET` | Refresh token secret (min 32 chars) |
| `JWT_EXPIRES_IN` | Access token TTL (e.g. `15m`) |
| `JWT_REFRESH_EXPIRES_IN` | Refresh TTL (e.g. `7d`) |
| `ENCRYPTION_KEY` | AES-256 key (32 chars) |
| `ENCRYPTION_IV` | AES IV (16 chars) |
| `FRONTEND_URL` | CORS origin (e.g. `http://localhost:5173`) |
| `NLP_SERVICE_URL` | Optional Python chatbot microservice URL |

### Frontend (`frontend/.env`)

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API base (e.g. `http://localhost:5000/api`) |
| `VITE_SOCKET_URL` | Socket.io server (e.g. `http://localhost:5000`) |
| `VITE_FACE_MODEL_URL` | face-api.js model path (default `/models`) |

---

## Key Features

| Feature | Implementation |
|---|---|
| Face Recognition Login | face-api.js (128-dim descriptor, euclidean distance < 0.6) |
| Liveness Detection | EAR blink, yaw head-turn, mouth-open check via landmarks |
| Blockchain Receipts | SHA-256 hash chain — every vote links to previous |
| Vote Encryption | AES-256-CBC with random IV per vote |
| Fraud Detection | Duplicate check, bot-pattern (< 3s), IP clustering, deepfake flag |
| Real-time Alerts | Socket.io → admin dashboard |
| Analytics | Recharts bar/pie/line charts |
| Accessibility | ARIA labels, keyboard nav, high-contrast, TTS ballot reading |
| Multi-language | i18next — English + Hindi |

---

## API Overview

| Prefix | Description |
|---|---|
| `POST /api/auth/register` | Register voter with face + document upload |
| `POST /api/auth/login` | Login, returns JWT pair |
| `POST /api/auth/face-verify` | Compare face descriptor, returns face token |
| `POST /api/votes/cast` | Cast encrypted vote with fraud checks |
| `GET  /api/votes/verify/:hash` | Public vote verification |
| `GET  /api/admin/dashboard-stats` | Admin live stats |
| `GET  /api/fraud/alerts` | Paginated fraud alert list |
| `POST /api/chatbot/ask` | NLP chatbot query |

---

## Roles

- **voter** — register, face-verify, cast vote, view receipt
- **admin** — manage elections/candidates, view dashboard, resolve fraud alerts, export results
