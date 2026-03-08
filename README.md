<div align="center">

# 🌟 LuminaLib

### Enterprise Library Management Platform

*A full-stack, AI-powered library system — FastAPI backend · Next.js frontend · PostgreSQL · Redis · Docker*

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

**LuminaLib** is a production-ready, full-stack library management platform that combines a high-performance **FastAPI** backend with an elegant **Next.js** frontend. Powered by machine learning and LLM-based AI, it offers smart book recommendations, semantic Q&A over ingested documents, auto-generated summaries, borrow/return tracking, and community reviews — all delivered through a beautifully designed, responsive UI.

---

## ✨ Feature Highlights

| Feature | Description |
|---|---|
| 📚 **Book Catalogue** | Full CRUD with file upload (PDF/text), paginated listing, genre tagging |
| 🤖 **AI Summaries** | Automatic book & review summarisation powered by LLM |
| 🔌 **LLM Providers** | OpenRouter, Ollama, OpenAI API, and Mock |
| ⚙️ **App Settings UI** | Configure API keys, active LLMs, and dynamic settings directly in the browser — no `.env` required |
| 💡 **Smart Recommendations** | ML-based personalised suggestions (scikit-learn collaborative filtering) |
| 🔍 **Semantic Q&A** | RAG pipeline — ask questions against ingested documents |
| 📄 **Document Ingestion** | Async background chunking & embedding pipeline with job tracking |
| 📖 **Borrow / Return** | Track borrow lifecycle per user with conflict detection |
| ⭐ **Reviews & Ratings** | Submit reviews post-borrow; running average maintained automatically |
| 🔐 **Secure Auth** | JWT signup/login, 12-character strict password enforcement, profile updates |
| 👤 **User Preferences** | Configurable reading preferences feed the recommendation engine |
| 📊 **Observability** | Full-stack Loki logging & secure Grafana dashboards proxied via Next.js SSO; Includes real-time user activity tracking |
| 🐳 **Docker Ready** | One-command full-stack deployment with health checks & named network |

---

## 🗂️ Repository Structure

```
LuminaLib/                          ← Monorepo root
├── Lumina-backend/                 ← FastAPI · Python 3.11 · SQLAlchemy · asyncpg
│   ├── luminalib/
│   │   ├── api/v1/endpoints/       ← auth, books, qa, reviews, ingestion, recommendations, users
│   │   ├── services/               ← business logic & ML engines
│   │   ├── repositories/           ← data-access layer
│   │   ├── models/                 ← SQLAlchemy ORM models
│   │   ├── schemas/                ← Pydantic request / response DTOs
│   │   └── core/                   ← config, security, constants
│   ├── tests/                      ← pytest integrations (auth, books, users, reviews)
│   ├── Dockerfile                  ← python:3.11-slim single-stage image
│   ├── pyproject.toml
│   └── .env.example
│
├── Lumina-frontend/                ← Next.js 15 · React 19 · TypeScript · TailwindCSS
│   ├── src/
│   │   ├── app/                    ← App Router pages (/, /books, /books/[id], /qa, /profile, /recommendations, /login, /signup)
│   │   ├── components/             ← ui/ · books/ · layout/
│   │   ├── services/               ← apiClient, authService, bookService, reviewService, qaService, …
│   │   ├── hooks/                  ← useAuth, useBooks, useRecommendations, usePreferences
│   │   ├── types/                  ← TypeScript DTOs mirroring backend schemas
│   │   └── context/                ← AuthContext (JWT token management)
│   ├── __tests__/                  ← Jest UI bounds rendering & context tests
│   ├── Dockerfile                  ← node:20-alpine multi-stage standalone build
│   └── jest.config.js
│
├── docs/                           ← Centralized Documentation
│   ├── architecture.md             ← Core design decisions
│   ├── backend_setup.md            ← Backend installation & testing
│   ├── frontend_setup.md           ← Frontend installation & testing
│   ├── functional_guide.md         ← Walkthroughs on platform features
│   └── contributing.md             ← PR protocols & repository structures
│
├── grafana/                        ← Grafana Provisioning (Dashboards & Datasources)
│   ├── provisioning/
│   │   ├── dashboards/             ← Pre-configured JSON dashboards (Backend/Frontend)
│   │   └── datasources/            ← Loki datasource configuration
│
├── docker-compose.yml              ← Orchestrates all services on lumina-net
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
| AI / LLM | OpenRouter API (configurable model) |
| ML | scikit-learn (collaborative filtering) |
| PDF Parsing | pypdf |
| Storage | Local filesystem / S3-compatible (boto3) |
| Testing | pytest + pytest-asyncio |

### Frontend (`Lumina-frontend`)

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router · SSR · RSC) |
| Language | TypeScript 5 |
| UI | TailwindCSS 4 |
| State / Fetching | TanStack React Query 5 |
| Forms | React Hook Form + Zod |
| HTTP Client | Axios (wrapped in service layer) |
| Icons | Lucide React |
| Testing | Jest + React Testing Library |

---

## 🐳 Docker Architecture

```
                       ┌─────────────────────────────────┐
                       │         lumina-net (bridge)      │
                       │                                  │
   Browser ──:3000──►  │  frontend (Next.js proxy)   ◄───┐│
   Browser ──:8000──►  │  backend  (FastAPI / uvicorn) ──┼┼──► postgres:5432
                       │  redis    (cache)               ││     pgdata volume
                       │  loki     (log storage)   ◄─────┘│
                       │  grafana  (dashboards)   ───────┘│
                       └─────────────────────────────────┘
```

### Image Details

| Service | Base Image | Strategy |
|---|---|---|
| `backend` | `python:3.11-slim` | Single-stage; installs via `pyproject.toml` |
| `frontend` | `node:20-alpine` | **3-stage** (`deps` → `builder` → `runner`); `output: standalone` |
| `loki` | `grafana/loki:latest` | High-availability log aggregation |
| `grafana` | `grafana/grafana:latest` | Observability with SSO proxy integration |
| `postgres` | `postgres:16-alpine` | Official Alpine image with persistent named volume |
| `redis` | `redis:7-alpine` | Official Alpine image |

### Key Compose Features

- **Named bridge network** `lumina-net` — services resolve each other by container name
- **Named containers** — `luminalib-postgres`, `luminalib-redis`, `luminalib-backend`, `luminalib-frontend`, `luminalib-loki`, `luminalib-grafana`
- **Healthchecks** — postgres and redis must pass before backend starts (`depends_on: condition: service_healthy`)
- **Restart policy** `unless-stopped` on all services
- **Persistent volume** `luminalib-pgdata` survives container restarts
- **Storage bind-mount** `./Lumina-backend/storage:/app/storage` for uploaded files
- **Full environment variables** — JWT secret, CORS origins, admin seed, LLM config

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

The script:
1. Verifies Docker is running
2. Validates the project directory structure
3. Builds & starts all services in detached mode (`--build -d`)
4. Waits up to 45 s for the backend `/docs` endpoint to become healthy
5. Prints all access URLs in a formatted summary box

---

### ▶️ Option 2 — Docker Compose Directly

```bash
# Build & start (detached)
docker-compose up --build -d

# View logs (all services)
docker-compose logs -f

# View logs for a single service
docker-compose logs -f backend

# Stop all containers (keep volumes)
docker-compose down

# Stop and destroy volumes (full reset)
docker-compose down -v
```

---

### 🌍 Access URLs

| Service | URL | Notes |
|---|---|---|
| **Frontend** | [http://localhost:3000](http://localhost:3000) | Next.js app |
| **Backend API** | [http://localhost:8000/api/v1](http://localhost:8000/api/v1) | FastAPI JSON API |
| **Swagger UI** | [http://localhost:8000/docs](http://localhost:8000/docs) | Interactive API explorer |
| **ReDoc** | [http://localhost:8000/redoc](http://localhost:8000/redoc) | Clean API reference |
| **Grafana** | [http://localhost:3000/grafana/dashboards](http://localhost:3000/grafana/dashboards) | Application Logs (Loki) via SSO |
| **PostgreSQL** | `localhost:5432` · DB `luminalib` | User/pass: `postgres/postgres` |
| **Redis** | `localhost:6379` | No auth in dev |

---

## ⚙️ Environment Variables

### Backend — Key Variables (see `Lumina-backend/.env.example`)

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://postgres...` | PostgreSQL connection string |
| `JWT_SECRET` | `change-me-in-production` | **Change this before going live!** |
| `JWT_ALGORITHM` | `HS256` | JWT signing algorithm |

*Note: As of v1.0, application settings (LLM Provider, API Keys, CORS, Storage Path, Admin Defaults, etc.) have been moved from `.env` to the `app_configs` database table. You can manage them directly via the **App Settings Dashboard** in the frontend UI.*

### Frontend — Key Variables

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000/api/v1` | Backend API base URL seen by the browser |
| `NODE_ENV` | `production` | Set to `development` for local HMR |

---

## 🧪 Documentation & Testing

Comprehensive guides are available in the [docs/](./docs/) directory:

- [Functional User Guide](./docs/functional_guide.md)
- [Backend Setup & Testing](./docs/backend_setup.md)
- [Frontend Setup & Testing](./docs/frontend_setup.md)
- [Architecture Overview](./docs/architecture.md)
- [Contributing Guidelines](./docs/contributing.md)

### 🏃 Running Tests

**Backend Test Cases:**
```bash
cd Lumina-backend
pytest           # Run all backend test cases
pytest --cov    # Run with coverage report
```
*Test coverage covers Auth workflows, Book CRUD, User Preferences, Borrow logic, Review & GenAI Mocking.*

**Frontend Test Cases:**
```bash
cd Lumina-frontend
npm run test    # Run Jest test suites
```
*Test coverage covers UI component rendering, hooks behavior, mock data API fetching, and auth states.*

---

## 🏗️ Local Development (without Docker)

### Backend

```bash
cd Lumina-backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

pip install -e .
cp .env.example .env   # edit DATABASE_URL to point at your local postgres

uvicorn luminalib.main:app --reload --port 8000
```

### Frontend

```bash
cd Lumina-frontend
npm install

# Create .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1" > .env.local

npm run dev   # → http://localhost:3000
```

---

## 📡 API Overview

All routes are prefixed `/api/v1`. Authentication uses **Bearer JWT tokens**.

| Tag | Method | Path | Description |
|---|---|---|---|
| **auth** | `POST` | `/auth/signup` | Register new user |
| **auth** | `POST` | `/auth/login` | Login — returns JWT |
| **auth** | `GET` | `/auth/profile` | Current user profile |
| **auth** | `PUT` | `/auth/profile` | Update profile |
| **books** | `GET` | `/books` | Paginated book list |
| **books** | `POST` | `/books` | Upload book (multipart) |
| **books** | `GET` | `/books/{id}` | Book detail |
| **books** | `PUT` | `/books/{id}` | Update metadata / file |
| **books** | `DELETE` | `/books/{id}` | Delete book |
| **books** | `GET` | `/books/{id}/summary` | AI-generated summary |
| **books** | `POST` | `/books/{id}/borrow` | Borrow book |
| **books** | `POST` | `/books/{id}/return` | Return book |
| **books** | `GET` | `/books/{id}/borrow-status` | Check borrow status |
| **reviews** | `GET` | `/books/{id}/reviews` | List reviews |
| **reviews** | `POST` | `/books/{id}/reviews` | Add review (requires borrow) |
| **qa** | `POST` | `/qa` | Ask question (RAG pipeline) |
| **ingestion** | `POST` | `/ingestion/{doc_id}` | Start document ingestion |
| **ingestion** | `GET` | `/ingestion/jobs` | List ingestion jobs |
| **recommendations** | `GET` | `/recommendations` | Get ML recommendations |
| **users** | `GET` | `/users/me/preferences` | Get user preferences |
| **users** | `PUT` | `/users/me/preferences` | Update preferences |
| **telemetry** | `POST` | `/api/log` | Internal client activity tracker (Frontend) |
| **telemetry** | `ANY` | `/grafana/*` | Proxied Grafana dashboards (SSO Protected) |
| **system** | `GET` | `/docs` | Interactive Swagger UI documentation |
| **system** | `GET` | `/redoc` | Alternative ReDoc API reference |

---

> [!NOTE]
> REST API endpoints are prefixed with `/api/v1`. Documentation (`/docs`, `/redoc`) is served from the backend root. Telemetry and Grafana proxying are managed by the Next.js runtime at the application root.

---
---

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./docs/contributing.md) for guidelines.

## 📄 License

This project is licensed under the **MIT License** — see [LICENSE](./LICENSE) for details.
