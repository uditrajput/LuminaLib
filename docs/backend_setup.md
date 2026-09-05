# LuminaLib Backend Setup and Testing Guide

This document provides step-by-step instructions on how to set up, run, and test the **LuminaLib** FastAPI backend application on your local machine, either natively or via Docker Compose.

---

## 📋 Prerequisites

Before starting, ensure your local environment includes:

- **Python 3.11+**: Required for native execution.
- **Docker & Docker Compose**: Recommended for containerized deployment.
- **PostgreSQL 16**: (Optional) For native development without Docker.
- **Git**: For version control.

---

## 🐳 Option 1: Setup using Docker (Recommended)

Docker Compose orchestrates the entire platform (`luminalib-backend`, `luminalib-voice`, `luminalib-frontend`, `luminalib-postgres`, `luminalib-redis`, `luminalib-loki`, `luminalib-grafana`).

### Step 1: Configure Environment
Navigate to `Lumina-backend` and copy the environment template:
```bash
cd Lumina-backend
cp .env.example .env
```

### Step 2: Build and Launch Services
From the monorepo root:
```bash
docker-compose up --build -d
```

Verify container health:
```bash
docker-compose ps
```

### Step 3: Access API Documentation
Open your browser and navigate to:
- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

### Service Operations
- Stream live backend logs:
  ```bash
  docker-compose logs -f backend
  ```
- Stop services while preserving data:
  ```bash
  docker-compose stop
  ```
- Stop services and reset database volume:
  ```bash
  docker-compose down -v
  ```

---

## 💻 Option 2: Setup for Native Local Development

### Step 1: Start PostgreSQL & Redis
Spin up PostgreSQL and Redis instances locally via Docker:
```bash
docker run -d --name luminalib-pg -e POSTGRES_DB=luminalib -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16-alpine
docker run -d --name luminalib-redis -p 6379:6379 redis:7-alpine
```

### Step 2: Configure Environment
Copy `.env.example` to `.env` and verify database credentials:
```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/luminalib
REDIS_URL=redis://localhost:6379/0
JWT_SECRET=your-secret-key-change-in-production
JWT_ALGORITHM=HS256
VOICE_SERVICE_URL=http://localhost:8001
```

### Step 3: Setup Virtual Environment & Install Dependencies
```bash
# Windows
python -m venv .venv
.venv\Scripts\activate

# macOS/Linux
python3 -m venv .venv
source .venv/bin/activate

# Install editable package with test & ML dependencies
pip install -e ".[test,ml]"
```

### Step 4: Launch Development Server
```bash
uvicorn luminalib.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 📂 Backend Project Structure

```
Lumina-backend/
├── luminalib/          # Main application package
│   ├── api/v1/         # FastAPI router endpoints (auth, books, qa, reviews, ingestion, recommendations, users, voice, app_configs, quizzes, groups, rbac)
│   ├── core/           # Security, config loading, logging, middleware
│   ├── db/             # SQLAlchemy engine & session factory
│   ├── infrastructure/ # LLM providers (Docker, OpenRouter, Ollama, OpenAI, Mock) & storage
│   ├── models/         # SQLAlchemy ORM database models
│   ├── repositories/   # Data-access repository layer
│   ├── schemas/        # Pydantic validation schemas
│   └── services/       # Core business logic (RAG pipeline, recommendation engine, quiz runner, review summarizer)
├── tests/              # 52 pytest unit & integration test files across 20 test suites
├── pyproject.toml      # Package dependencies & build configuration
└── Dockerfile          # Single-stage Python 3.11 image
```

---

## 🧪 Running Automated Backend Tests

LuminaLib backend tests are powered by `pytest` and `pytest-asyncio`, utilizing an isolated in-memory SQLite database and mocked LLM providers.

### Running the Test Suite

```bash
cd Lumina-backend

# Run all 52 test cases
pytest

# Run with verbose test descriptions
pytest -v

# Run with code coverage report
pytest --cov=luminalib --cov-report=term-missing
```

### 🧪 Core Test Coverage (52 Passing Tests across 20 Files)

1. **Authentication (`test_auth.py`, `test_oauth.py`)**: Signup validation (email format, 12-char strict password requirements), JWT generation, password reset session revocation, OAuth status checks, and profile fetching/updates (avatar persistence & unique primary/secondary mobile numbers).
2. **Books Management (`test_books.py`, `test_documents.py`, `test_private_library.py`)**: Book CRUD operations, paginated queries, file upload ingestion mocks, metadata updates, deletion, document chunk queries, and private library group entitlements.
3. **Borrow Lifecycle & Reviews (`test_reviews_and_borrows.py`)**: Borrow and return workflows, availability state toggles, conflict checks, enforcing borrow-before-review constraint, rating range checks, and rolling review consensus calculation.
4. **AI Q&A & RAG (`test_qa.py`)**: Q&A prompt execution, document chunk selection, high-yield topic question prompt handling, in-place prompt edit & redo regeneration.
5. **Quiz Engine & Anti-Cheat (`test_quiz_v4.py`)**: Server-side timed runner, MCQ auto-grading, descriptive AI-assisted grading, attempt lockouts, and anti-cheat event tracking (`visibility_hidden`).
6. **Role-Based Access Control & User Groups (`test_rbac.py`, `test_user_groups.py`)**: RBAC permissions matrix checking, immutable Admin role boundaries, user cohort assignments, and group membership verification.
7. **Domain Whitelist & SMTP Security (`test_domain_whitelist_and_smtp.py`)**: Allowed domain verification, account verification state progression, and SMTP configuration encryption.
8. **Voice API & Security (`test_voice.py`)**: Voice preference retrieval/updates, subprotocol JWT authentication, audio magic byte validation, Whisper STT proxy transcription (`POST /api/v1/voice/transcribe`), Multi-Engine TTS proxying (`GET/POST /api/v1/voice/tts` supporting up to 10,000 characters, `GET /api/v1/voice/sample`), log scrubbing, available neural voice listing, conversation transcript history management.
9. **Dynamic App Configs (`test_config.py`, `test_app_configs.py`, `test_docker_llm_provider.py`)**: Loading and updating `app_configs` table key-value pairs at runtime without server restarts.

### 🎙️ Running Voice Microservice Tests (7 Passing Tests)

The dedicated voice service in `Lumina-voice` has its own automated test suite:

```bash
cd Lumina-voice
pytest tests/
```

Test coverage includes:
- Subprotocol JWT token extraction (`voice-v1, jwt-<token>`)
- 500-char transcript sanitization & control character stripping
- Natural language intent classification (borrow, return, review, summary, recommend, qa)
- CORS origin validation
- Multi-engine TTS audio synthesis and in-memory LRU audio caching
- Automatic Indic / Devanagari text detection
- Valid binary audio bytes generation (preventing WebSocket tuple errors)

---

## 🔍 API Testing Flow (Swagger UI)

1. **Login as Admin**: Call `POST /api/v1/auth/login` with `udit.rajput@hotmail.com` / `Admin@12345!` to obtain your JWT Bearer token.
2. **Authorize**: Paste the token into the `Authorize` button at the top of Swagger (`http://localhost:8000/docs`).
3. **Upload a Book**: Call `POST /api/v1/books` with metadata and attach a sample PDF file.
4. **Q&A & Practice Questions**: Call `POST /api/v1/qa` with `{"question": "Ask me 5 questions on Python"}` to test topic practice question generation.
5. **Whisper Speech-to-Text Proxy**: Call `POST /api/v1/voice/transcribe` with audio form data to verify backend audio transcription.
6. **Multi-Engine Neural TTS Proxy**: Call `GET /api/v1/voice/tts?text=Hello+world&voice=af_bella` or `GET /api/v1/voice/sample` to verify low-latency (~1.3s fresh, <6ms cached) audio streaming.
7. **Dynamic App Settings**: Call `GET /api/v1/config` and `PUT /api/v1/config` to verify runtime configuration updates.
