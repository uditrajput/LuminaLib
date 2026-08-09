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

**LuminaLib** is a production-ready, full-stack library management platform that combines a high-performance **FastAPI** backend with an elegant **Next.js 15** frontend. Powered by machine learning and LLM-based AI, it offers smart book recommendations, semantic Q&A over ingested documents with high-yield topic question generation, auto-generated book summaries, hands-free voice AI interaction, borrow/return tracking, customizable PDF reader frame themes, and community reviews — all delivered through a beautifully designed, responsive UI.

---

## ✨ Feature Highlights

| Feature | Descrip| 🎙️ **Voice AI Assistant** | Real-time spoken Q&A, voice borrow/return, reviews, 30s action confirmations, Web Speech API client-side voice sample previewing, and Kokoro TTS audio streaming via `Lumina-voice` microservice |
| 🤖 **AI Q&A & Topic Practice** | RAG pipeline — ask questions against ingested books or request high-yield exam & interview questions on any topic with 1-click `✨ Answer` action buttons |
| 🗣️ **Clean Speech Synthesis** | Voice mode automatically strips page numbers (e.g. *"On Page 12"*), citations (`[1]`), table pipes (`|`), and formatting artifacts for clean, natural narration |
| 📖 **PDF Reader & Frame Themes** | Integrated PDF reader featuring 8 customizable book frame themes, single-column enlarged thumbnails with page numbers below, text search panel, space-preserved text selection, and frame-anchored glassmorphism navigation buttons |
| 📚 **Book Catalogue** | Full CRUD with multi-format file upload (PDF/Text), paginated listing, genre tagging, and background chunking/ingestion |
| ⚙️ **Dynamic App Settings** | Reorganized Config page (`/admin/config`): General Configurations placed at the top (default open with `+ Add Config` button hiding when collapsed), collapsible LLM Provider with unclipped dropdown & Voice Settings panels, and smart save button state management |
| 🛡️ **Security Audit Remediated** | Full remediation of security audit findings (`CRIT-001` to `LOW-004`): subprotocol JWT WebSocket auth, 500-char transcript sanitization, JWT log scrubbing, audio header magic byte validation, and security headers |
| 🔌 **LLM Provider Options** | Dynamically switch between Docker Model Runner, OpenRouter, Ollama, OpenAI API, and Mock without restarting servers |
| 💡 **Smart Recommendations** | 3-tier recommendation engine combining ML-based collaborative filtering (scikit-learn), content similarity, and user preference profiles |
| 📄 **Document Ingestion** | Async background chunking & embedding pipeline with job tracking |
| 📖 **Borrow / Return** | Track borrow lifecycle per user with availability conflict detection |
| ⭐ **Reviews & Ratings** | Post-borrow user reviews with rolling AI review consensus summary |
| 🔐 **Secure Auth** | JWT signup/login, 12-character strict password enforcement, profile updates |
| 📊 **Observability & SSO** | Full-stack Loki log aggregation & secure Grafana dashboards proxied via Next.js Edge Middleware SSO |
| 🐳 **Docker Deployment** | One-command full-stack orchestration (`docker compose up --build -d`) with health checks & named bridge network |

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
├── Lumina-voice/                   ← Voice AI Agent Microservice · FastAPI · WebSockets · Kokoro TTS · Whisper STT
│   ├── app/                        ← main, pipeline, action_executor, intent, security, stt, tts
│   ├── Dockerfile
│   └── requirements.txt
│
├── Lumina-frontend/                ← Next.js 15 · React 19 · TypeScript · TailwindCSS 4
│   ├── src/
│   │   ├── app/                    ← App Router pages (/, /books, /books/[id], /qa, /profile, /recommendations, /admin/config, /admin/users, /login, /signup)
│   │   ├── components/             ← ui/ · books/ · layout/ · pdf/ · voice/
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
│   │   ├── dashboards/             ← Pre-configured JSON dashboards (Backend & Frontend Loki logs)
│   │   └── datasources/             subterranean Loki datasource configuration
│   │
├── docker-compose.yml              ← Orchestrates all 6 microservices on lumina-net
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
| Speech-to-Text | Whisper STT (`faster-whisper`) |
| Text-to-Speech | Kokoro-82M TTS (ONNX Runtime CPU) + Web Speech API browser previewing |
| Intent Parser | Natural language pattern matcher & action executor |

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

### ▶️ Option 1 — PowerShell Script (Recommended on Windows)

Open **PowerShell** at the repository root and run:

```powershell
# Standard deploy
.\deploy.ps1

# Force a clean rebuild after code changes
.\deploy.ps1 -Rebuild

# Tear down all containers
.\deploy.ps1 -Down

# Stream live logs from all containers
.\deploy.ps1 -Logs
```

---

### ▶️ Option 2 — Docker Compose Directly

```bash
# Build & start all containers in detached mode
docker-compose up --build -d

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
   - Smart **`Save Voice Settings`** button stays disabled until settings are modified, preventing accidental saves.in/config`):

1. **General Configurations (Top Section, Default Open)**:
   - Search and edit application properties (e.g. storage paths, CORS origins, max upload size).
   - Click `+ Add Config` directly in the section header bar to add custom key-value settings.
2. **LLM Provider Panel (Default Collapsed)**:
   - Dynamic selection between Docker Model Runner, OpenRouter, Ollama, OpenAI, or Mock.
   - Enter and save provider API keys dynamically without `.env` edits or container restarts.
3. **Voice Assistant & Speech Settings (Default Collapsed)**:
   - Select Kokoro TTS voice model (`af_bella`, `am_adam`, `bf_emma`, etc.), speech rate (0.5x–2.0x), auto-play setting, and transcript display.
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
| **auth** | `PUT` | `/auth/profile` | Update profile information |
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
| **qa** | `POST` | `/qa` | Ask semantic question or request topic practice questions |
| **ingestion** | `POST` | `/ingestion/{doc_id}` | Initiate async background chunking & embedding |
| **ingestion** | `GET` | `/ingestion/jobs` | Track background document ingestion status |
| **recommendations** | `GET` | `/recommendations` | Get personalized ML book recommendations |
| **users** | `GET` | `/users/me/preferences` | Get user reading preferences |
| **users** | `PUT` | `/users/me/preferences` | Update reading preferences |
| **voice** | `GET` | `/voice/conversations` | List user voice conversation history |
| **voice** | `GET` | `/voice/conversations/{id}` | Get specific voice conversation transcript |
| **voice** | `DELETE` | `/voice/conversations/{id}` | Clear voice conversation history |
| **voice** | `GET` | `/voice/voices` | List available Kokoro TTS voice models |
| **voice** | `GET/PUT` | `/voice/preferences` | Retrieve or update user voice preferences |
| **voice** | `WS` | `ws://localhost:8001/voice/ws/{book_id}` | Real-time bi-directional audio stream |
| **config** | `GET` | `/config` | Get application configuration settings |
| **config** | `POST/PUT` | `/config` | Create or update dynamic application config key |
| **telemetry** | `POST` | `/api/log` | Client activity tracking telemetry (Frontend) |
| **telemetry** | `ANY` | `/grafana/*` | Proxied Grafana Loki dashboards (SSO Protected) |

---

## 🤝 Contributing

Contributions are welcome! Please review [CONTRIBUTING.md](./docs/contributing.md) for guidelines.

## 📄 License

This project is licensed under the **MIT License** — see [LICENSE](./LICENSE) for details.
