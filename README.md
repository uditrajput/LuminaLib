<div align="center">

# 🌟 LuminaLib

### Enterprise Library Management Platform

*A full-stack, AI-powered library system — FastAPI backend · Next.js frontend · PostgreSQL · Redis · Docker · Voice AI*

[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)](https://python.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![Grafana](https://img.shields.io/badge/Grafana-F46800?logo=grafana&logoColor=white)](https://grafana.com/)
[![License](https://img.shields.io/badge/License-MIT-green)](./LICENSE)

</div>

---

## 📖 Overview

**LuminaLib** is a production-ready, full-stack library management platform that combines a high-performance **FastAPI** backend with an elegant **Next.js 15** frontend. Powered by machine learning and LLM-based AI, it offers **AI-generated quizzes (MCQ+Descriptive) with timed runner & auto-grading**, **PWA offline**, **hybrid semantic search with citation jump**, **gamification (streaks/XP/badges)**, **AI Study Companion (flashcards/mind-maps)**, smart book recommendations, interactive Gemini-style Q&A, auto-generated book summaries, hands-free voice AI, borrow/return tracking, customizable PDF reader frame themes, profile management with contact validation, and community reviews — all delivered through a beautifully designed, responsive UI.

---

## ✨ Feature Highlights

| Feature | Description |
|---|---|
| 🎙️ **Voice AI & Cross-Browser STT** | Real-time spoken Q&A, voice borrow/return, reviews, Web Speech API live streaming for Chrome/Edge, **Mozilla Firefox `MediaRecorder` + Whisper STT** (`Lumina-voice`), **Multi-Engine Neural TTS** (Microsoft Edge-TTS primary ~1.3s, Kokoro-82M offline fallback, gTTS Indic fallback), **in-memory LRU audio caching (<6ms)**, single-header WAV concatenation, 30s action confirmations, and Web Speech previewing |
| 🤖 **Gemini-Style AI Q&A & Topic Practice** | Interactive RAG Q&A — persistent session history, **draft chat auto-filtering** (empty new chats omitted from history), **interactive 3D glassmorphism deletion modal**, **Gemini-style prompt editor & in-place updates**, **in-place response regeneration (Redo)** without prompt duplication, and 1-click `✨ Answer` action buttons for high-yield topic practice |
| 🗣️ **Clean Speech Synthesis** | Studio-quality neural voice narration with automatic text filtering that strips page numbers (e.g. *"On Page 12"*), bracketed citations (`[1]`), table pipes (`|`), and formatting artifacts for clean, natural speech in English, Hindi, and Sanskrit |
| 📖 **PDF Reader & Frame Themes** | Integrated PDF reader featuring 8 customizable book frame themes, single-column enlarged thumbnails with page numbers below, text search panel, space-preserved text selection, and frame-anchored glassmorphism navigation buttons |
| 👤 **Profile & Contact Integrity** | Custom avatar picture upload with persistence, **strict mobile validation** (Primary and Secondary mobile numbers must be different), and **password reset session revocation** (invalidates active sessions for clean re-login) |
| 📊 **Clean User Dashboard** | Optimized dashboard layout with non-functioning search bar and notification bell icon removed for clean, focused user library tracking |
| 📚 **Book Catalogue** | Full CRUD with multi-format file upload (PDF/Text), paginated listing, genre tagging, and background chunking/ingestion |
| ⚙️ **Dynamic App Settings** | Reorganized Config page (`/admin/config`): General Configurations placed at the top (default open with `+ Add Config` button hiding when collapsed), collapsible LLM Provider with unclipped dropdown & Voice Settings panels, and smart save button state management |
| 🛡️ **Security Audit Remediated** | Full remediation of security audit findings (`CRIT-001` to `LOW-004`): subprotocol JWT WebSocket auth, 500-char transcript sanitization, JWT log scrubbing, audio header magic byte validation, and security headers |
| 🔌 **LLM Provider Options** | Dynamically switch between Docker Model Runner, OpenRouter, Ollama, OpenAI API, and Mock without restarting servers |
| 💡 **Smart Recommendations** | 3-tier recommendation engine combining ML-based collaborative filtering (scikit-learn), content similarity, and user preference profiles |
| 📝 **Quiz & Assessment (v4.0)** | **MCQ (single/multi) + Descriptive**, **AI generation from book/topic** via LLM Factory, **group assignment** (`quiz_group_entitlements`), **Instruction → Start → server-timed Runner (palette/flag/autosave `10s`/`sendBeacon`/reaper) → auto/manual submit → MCQ auto-grade + descriptive AI-assisted grading**, RBAC `quiz_manage/attempt/review` |
| 🔍 **Hybrid Search + Citations** | BM25 LIKE + embedding fallback, page snippet + **jump-to-page** in `PDFReaderModal` `text-search` tab, `GET /search` |
| 🎮 **Gamification** | Streak days, XP/Level, badges (`5 Books`, `Hour Reader`), `ReadingJourney` `GET /progress/stats` |
| 🧠 **AI Study Companion** | Flashcards/Anki TSV, MCQs, summaries, **mermaid mindmaps** from highlights `POST /study/generate`, Dashboard `StudyCompanion` + Highlights drawer button |
| 🎧 **Audiobook Narration** | Native Indic (Hindi/Sanskrit) and English audio narration via Multi-Engine Neural TTS (`GET /books/{id}/audio/stream`) |
| 💬 **Social Reading** | Per-book threads `GET/POST /books/{id}/discussions` (reviews reuse) + follow stub |
| 📊 **Notifications** | In-app bell `NotificationBell` `GET /notifications` 30s poll + `POST /notifications/read-all`, quiz assign creates `quiz_assigned` notification |
| 📖 **PWA Offline** | `manifest.json` + `sw.js` `luminalib-v4` cache-first pdfs, network-first api |
| 🌐 **i18n + a11y** | `LangContext` `en|hi|es`, `LangToggle`, skip link `DashboardLayout`, `prefers-reduced-motion` in `globals.css` |
| 📄 **Document Ingestion** | Async background chunking & embedding pipeline with job tracking |
| 📖 **Borrow / Return** | Track borrow lifecycle per user with availability conflict detection |
| ⭐ **Reviews & Ratings** | Post-borrow user reviews with rolling AI review consensus summary |
| 🔐 **Secure Auth** | JWT signup/login, 12-character strict password enforcement, profile updates, `GET /users/me/completeness` 12-field weighted |
| 📊 **Observability & SSO** | Full-stack Loki log aggregation & secure Grafana dashboards proxied via Next.js Edge Middleware SSO |
| 🐳 **Docker Deployment** | One-command full-stack orchestration (`docker compose up --build -d`) with health checks & named bridge network |
| 📈 **Reading Telemetry** | `reading_sessions` + `POST /progress` heartbeat `15s`, `GET /progress/stats`, highlights `POST /progress/highlights` sync to RAG |

---

## 🗂️ Repository Structure

```
LuminaLib/                          ← Monorepo root
├── Lumina-backend/                 ← FastAPI · Python 3.11 · SQLAlchemy 2 · asyncpg
│   ├── luminalib/
│   │   ├── api/v1/endpoints/       ← auth, books, qa, reviews, ingestion, recommendations, users, voice, app_configs
│   │   ├── services/               ← business logic, rag_service, recommendation_engine, llm_factory
│   │   ├── repositories/           ← data-access layer & ORM mappings
│   ├── tests/                      ← 34 pytest unit & integration tests (auth, books, qa, users, reviews, voice, config)
│   ├── Dockerfile                  ← python:3.11-slim single-stage image
│   ├── pyproject.toml
│   └── .env.example
│
├── Lumina-voice/                   ← Voice AI Agent Microservice · FastAPI · WebSockets · Multi-Engine TTS (Edge-TTS / Kokoro / gTTS) · Whisper STT
│   ├── app/                        ← main, pipeline, action_executor, intent, security, stt (faster-whisper), tts (Multi-Engine)
│   ├── tests/                      ← 7 pytest unit tests (auth, intent, multi-engine TTS, caching, Indic detection)
│   ├── Dockerfile
│   └── requirements.txt
│
├── Lumina-frontend/                ← Next.js 15 · React 19 · TypeScript · TailwindCSS 4
│   ├── src/
│   │   ├── app/                    ← App Router pages (/, /books, /books/[id], /qa, /profile, /recommendations, /admin/config, /admin/users, /login, /signup)
│   │   ├── components/             ← ui/ · books/ · layout/ · pdf/ · qa/ (DeleteChatModal.tsx) · voice/
│   │   ├── services/               ← apiClient, authService, bookService, reviewService, qaService, voiceService, configService
│   │   ├── hooks/                  ← useAuth, useBooks, useRecommendations, usePreferences, useAppConfigs
│   │   ├── types/                  ← TypeScript DTOs mirroring backend schemas
│   │   └── context/                ← AuthContext (JWT token management)
│   ├── __tests__/                  ← 11 Jest test suites / 51 tests (admin-config, admin-users, profile, books, auth, qa)
│   ├── Dockerfile                  ← node:20-alpine multi-stage standalone build
│   └── jest.config.js
│
├── docs/                           ← Centralized Documentation
│   ├── architecture.md             ← Core architectural design decisions
│   ├── backend_setup.md            ← Backend installation, testing & API details
│   ├── frontend_setup.md           ← Frontend setup, Next.js standalone build & Jest tests
│   ├── functional_guide.md         ← Walkthroughs on platform features & voice workflows
│   └── contributing.md             ← PR protocols & repository rules
│
├── new_doc/                        ← Security & Compliance Reports
│   └── security_audit.md           ← Complete security audit report & resolution sign-off tracker
│
├── grafana/                        ← Grafana Provisioning (Dashboards & Datasources)
│   ├── provisioning/
│   │   ├── dashboards/             ← Pre-configured JSON dashboards (Executive, AI/Voice, System Health, Logs)
│   │   └── datasources/            ← Dual datasources (PostgreSQL & Loki log aggregation)
│   │
├── docker-compose.yml              ← Orchestrates all 7 microservices on lumina-net
├── deploy.ps1                      ← PowerShell deployment helper script
└── README.md                       ← You are here
```

---

## 🛠️ Tech Stack

### Backend (`Lumina-backend`)

| Layer | Technology |
|---|---|
| Web Framework | FastAPI 0.111 (async) |
| Language | Python 3.11 |
| ORM | SQLAlchemy 2 (async) + asyncpg |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Auth | JWT via `python-jose` + `passlib[bcrypt]` |
| AI / LLM | Docker Model Runner, OpenRouter API, Ollama, OpenAI API, Mock |
| ML | scikit-learn (collaborative filtering & cosine similarity) |
| PDF Parsing | pypdf |
| Storage | Local filesystem / S3-compatible (boto3) |
| Testing | pytest 9.0 + pytest-asyncio (34 passing test cases) |

### Voice AI (`Lumina-voice`)

| Layer | Technology |
|---|---|
| Service Framework | FastAPI + WebSockets (`:8001`) |
| Speech-to-Text | Whisper STT (`faster-whisper`) for Firefox & Cross-Browser audio transcription |
| Text-to-Speech | Multi-Engine Neural TTS (Microsoft Edge-TTS primary ~1.3s, Kokoro-82M offline fallback, gTTS Indic fallback, LRU Audio Cache) |
| Intent Parser | Natural language pattern matcher & action executor |
| Testing | pytest 9.1 + pytest-asyncio (7 passing test cases) |

### Frontend (`Lumina-frontend`)

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router · SSR · RSC · Standalone Output) |
| Language | TypeScript 5 |
| UI | TailwindCSS 4 |
| State / Fetching | TanStack React Query 5 |
| Forms | React Hook Form + Zod |
| HTTP Client | Axios (wrapped in service layer) |
| Icons | Lucide React |
| PDF Viewer | `@react-pdf-viewer/core` + custom frame renderer & space-preserved text selection |
| Testing | Jest + React Testing Library (11 suites / 51 tests) |

---

## 🐳 Docker Architecture

```
                       ┌────────────────────────────────────────┐
                       │          lumina-net (bridge)           │
                       │                                         │
   Browser ──:3000──►  │  frontend (Next.js proxy & app)   ◄────┐│
   Browser ──:8000──►  │  backend  (FastAPI REST API)  ─────┼───┼┼──► postgres:5432
   WS      ──:8001──►  │  voice    (FastAPI WebSockets)─────┤   ││     pgdata volume
                       │  redis    (cache)                  │   ││
                       │  loki     (log storage)       ◄────┴───┘│
                       │  grafana  (dashboards SSO)    ──────────┘│
                       └────────────────────────────────────────┘
```

### Container Summary

| Service | Container Name | Port | Description |
|---|---|---|---|
| `frontend` | `luminalib-frontend` | `:3000` | Next.js standalone web UI & SSO proxy |
| `backend` | `luminalib-backend` | `:8000` | FastAPI REST API & RAG pipeline |
| `voice` | `luminalib-voice` | `:8001` | Voice AI WebSockets audio streaming microservice |
| `postgres` | `luminalib-postgres` | `:5432` | PostgreSQL 16 database |
| `redis` | `luminalib-redis` | `:6379` | Redis 7 caching service |
| `loki` | `luminalib-loki` | `:3100` | Log aggregation engine |
| `grafana` | `luminalib-grafana` | `:3000/grafana` | Observability dashboards (SSO proxied) |

---

## 🚀 Quick Start

### Prerequisites

| Requirement | Minimum Version |
|---|---|
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | 4.x (with Compose V2) |
| Node.js *(local dev only)* | 20.x LTS |
| Python *(local dev only)* | 3.11+ |

---

### ▶️ Option 1 — Single-Command Build & Deploy (Docker Compose)

Run the following command at the repository root to build all microservice images and deploy the complete LuminaLib stack in detached mode:

```bash
docker-compose up --build -d
```

---

### ▶️ Option 2 — Deployment Helper Scripts

**Linux / macOS / Git Bash:**
```bash
chmod +x deploy.sh
./deploy.sh          # Build & deploy
./deploy.sh --rebuild # Force fresh image rebuild
./deploy.sh --down    # Stop containers
./deploy.sh --logs    # Stream container logs
```

**PowerShell (Windows):**
```powershell
.\deploy.ps1          # Build & deploy
.\deploy.ps1 -Rebuild # Force fresh image rebuild
.\deploy.ps1 -Down    # Stop containers
.\deploy.ps1 -Logs    # Stream container logs
```

---

### 🛠️ Useful Management Commands

```bash
# View live logs across all microservices
docker-compose logs -f

# View logs for backend specifically
docker-compose logs -f backend

# Stop containers (preserves database data)
docker-compose down

# Stop containers and reset database volume
docker-compose down -v
```

---

### 🌍 Access URLs

| Service | URL | Notes |
|---|---|---|
| **Frontend UI** | [http://localhost:3000](http://localhost:3000) | Next.js application |
| **Backend REST API** | [http://localhost:8000/api/v1](http://localhost:8000/api/v1) | FastAPI JSON API |
| **Voice WS Endpoint** | `ws://localhost:8001/voice/ws/{book_id}` | Real-time bi-directional audio stream |
| **Swagger Docs** | [http://localhost:8000/docs](http://localhost:8000/docs) | Interactive API explorer |
| **ReDoc Reference** | [http://localhost:8000/redoc](http://localhost:8000/redoc) | Clean API documentation |
| **Grafana Dashboards** | [http://localhost:3000/grafana/dashboards](http://localhost:3000/grafana/dashboards) | Full-stack Loki logs via SSO proxy |
| **PostgreSQL** | `localhost:5432` · DB `luminalib` | `postgres/postgres` |
| **Redis Cache** | `localhost:6379` | In-memory cache |

---

## ⚙️ Dynamic Application Settings

Application settings are stored in the PostgreSQL `app_configs` table and managed directly from the **App Settings** page (`/admin/config`):

1. **General Configurations (Top Section, Default Open)**:
   - Search and edit application properties (e.g. storage paths, CORS origins, max upload size).
   - Click `+ Add Config` directly in the section header bar to add custom key-value settings. The `+ Add Config` button automatically hides when the section is collapsed (`Hide`).
2. **LLM Provider Panel (Default Collapsed)**:
   - Dynamic selection between Docker Model Runner, OpenRouter, Ollama, OpenAI, or Mock.
   - Dropdown menu opens in an unclipped, scrollable overlay (`max-h-72 overflow-y-auto z-50`).
   - Enter and save provider API keys dynamically without `.env` edits or container restarts.
3. **Voice Assistant & Speech Settings (Default Collapsed)**:
   - Select Kokoro TTS voice model (`af_bella`, `am_adam`, `bf_emma`, etc.), speech rate (0.5x–2.0x), auto-play setting, and transcript display.
   - Click **`Test Active Voice`** to trigger an instant Web Speech API audio sample preview in human voice.
   - Smart **`Save Voice Settings`** button stays disabled until settings are modified, preventing accidental saves.

---

## 🧪 Documentation & Testing

Comprehensive guides are available in the [docs/](./docs/) directory:

- [Functional User Guide](./docs/functional_guide.md)
- [Backend Setup & Testing](./docs/backend_setup.md)
- [Frontend Setup & Testing](./docs/frontend_setup.md)
- [Architecture Overview](./docs/architecture.md)
- [Contributing Guidelines](./docs/contributing.md)

### 🏃 Running Automated Tests

**Backend Test Cases (pytest):**
```bash
cd Lumina-backend
pytest           # Run all 34 backend unit & integration tests
pytest --cov     # Run with code coverage report
```

**Voice Microservice Test Cases (pytest):**
```bash
cd Lumina-voice
pytest tests/    # Run all 7 voice microservice unit tests (auth, intent, TTS, caching)
```

**Frontend Test Cases (Jest):**
```bash
cd Lumina-frontend
npm run test     # Run all 11 Jest test suites (51 tests passed)
```

---

## 📡 API Endpoint Overview

All REST API endpoints are prefixed with `/api/v1` and protected via **Bearer JWT authentication**.

| Tag | Method | Path | Description |
|---|---|---|---|
| **auth** | `POST` | `/auth/signup` | Register new user account |
| **auth** | `POST` | `/auth/login` | Authenticate user & return JWT token |
| **auth** | `GET` | `/auth/profile` | Retrieve current user profile |
| **auth** | `PUT` | `/auth/profile` | Update profile information & avatar persistence |
| **books** | `GET` | `/books` | Paginated book listing with search & filters |
| **books** | `POST` | `/books` | Upload book file (PDF/Text) & metadata |
| **books** | `GET` | `/books/{id}` | Get book details & ingestion status |
| **books** | `PUT` | `/books/{id}` | Update book metadata or file |
| **books** | `DELETE` | `/books/{id}` | Delete book & associated chunks |
| **books** | `GET` | `/books/{id}/summary` | Retrieve AI-generated 5-point summary |
| **books** | `POST` | `/books/{id}/borrow` | Borrow book for active user |
| **books** | `POST` | `/books/{id}/return` | Return borrowed book |
| **books** | `GET` | `/books/{id}/borrow-status` | Check current user borrow status |
| **reviews** | `GET` | `/books/{id}/reviews` | List book reviews & rolling AI consensus |
| **reviews** | `POST` | `/books/{id}/reviews` | Submit star rating & review (requires borrow) |
| **qa** | `POST` | `/qa` | Ask semantic question, edit prompt in-place, or request topic practice questions |
| **ingestion** | `POST` | `/ingestion/{doc_id}` | Initiate async background chunking & embedding |
| **ingestion** | `GET` | `/ingestion/jobs` | Track background document ingestion status |
| **recommendations** | `GET` | `/recommendations` | Get personalized ML book recommendations |
| **users** | `GET` | `/users/me/preferences` | Get user reading preferences |
| **users** | `PUT` | `/users/me/preferences` | Update reading preferences |
| **voice** | `POST` | `/voice/transcribe` | Transcribe audio stream to text (Whisper STT for Firefox/Cross-Browser) |
| **voice** | `GET/POST` | `/voice/tts` | Synthesize text to speech audio stream (Multi-Engine Neural TTS) |
| **voice** | `GET` | `/voice/sample` | Generate voice model audio preview sample |
| **voice** | `GET` | `/voice/conversations` | List user voice conversation history |
| **voice** | `GET` | `/voice/conversations/{id}` | Get specific voice conversation transcript |
| **voice** | `DELETE` | `/voice/conversations/{id}` | Clear voice conversation history |
| **voice** | `GET` | `/voice/voices` | List available neural TTS voice models (English & Indic) |
| **voice** | `GET/PUT` | `/voice/preferences` | Retrieve or update user voice preferences |
| **voice** | `WS` | `ws://localhost:8001/voice/ws/{book_id}` | Real-time bi-directional audio stream |
| **audiobook** | `GET` | `/books/{id}/audio` | Get audiobook status, chapters, and stream URL |
| **audiobook** | `GET` | `/books/{id}/audio/stream` | Stream synthesized audiobook audio narration |
| **config** | `GET` | `/config` | Get application configuration settings |
| **config** | `POST/PUT` | `/config` | Create or update dynamic application config key |
| **telemetry** | `POST` | `/api/log` | Client activity tracking telemetry (Frontend) |
| **telemetry** | `ANY` | `/grafana/*` | Proxied Grafana Loki dashboards (SSO Protected) |

---

## 🤝 Contributing

Contributions are welcome! Please review [CONTRIBUTING.md](./docs/contributing.md) for guidelines.

## 📄 License

This project is licensed under the **MIT License** — see [LICENSE](./LICENSE) for details.
