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
│   ├── api/v1/         # FastAPI router endpoints (auth, books, qa, reviews, ingestion, recommendations, users, voice, app_configs)
│   ├── core/           # Security, config loading, logging, middleware
│   ├── db/             # SQLAlchemy engine & session factory
│   ├── infrastructure/ # LLM providers (Docker, OpenRouter, Ollama, OpenAI, Mock) & storage
│   ├── models/         # SQLAlchemy ORM database models
│   ├── repositories/   # Data-access repository layer
│   ├── schemas/        # Pydantic validation schemas
│   └── services/       # Core business logic (RAG pipeline, recommendation engine, review summarizer)
├── tests/              # 34 pytest unit & integration test files
├── pyproject.toml      # Package dependencies & build configuration
└── Dockerfile          # Single-stage Python 3.11 image
```

---

## 🧪 Running Automated Backend Tests

LuminaLib backend tests are powered by `pytest` and `pytest-asyncio`, utilizing an isolated in-memory SQLite database and mocked LLM providers.

### Running the Test Suite

```bash
cd Lumina-backend

# Run all 34 test cases
pytest

# Run with verbose test descriptions
pytest -v

# Run with code coverage report
pytest --cov=luminalib --cov-report=term-missing
```

### 🧪 Core Test Coverage (34 Passing Tests)

1. **Authentication (`test_auth.py`)**: Signup validation (email format, 12-char strict password requirements), JWT generation, profile fetching/updates.
2. **Books Management (`test_books.py`)**: Book CRUD operations, paginated queries, file upload ingestion mocks, metadata updates, deletion.
3. **Borrow Lifecycle (`test_reviews_and_borrows.py`)**: Borrow and return workflows, availability state toggles, conflict checks.
4. **Review System (`test_reviews_and_borrows.py`)**: Enforcing borrow-before-review constraint, rating range checks, rolling review consensus calculation.
5. **AI Q&A & RAG (`test_qa.py`)**: Q&A prompt execution, document chunk selection, high-yield topic question prompt handling.
6. **Voice API & Security (`test_voice.py`)**: Voice preference retrieval/updates, subprotocol JWT authentication, audio magic byte validation, log scrubbing, available Kokoro voice listing, conversation transcript history management.
7. **Dynamic App Configs (`test_config.py`, `test_docker_llm_provider.py`)**: Loading and updating `app_configs` table key-value pairs at runtime.

---

## 🔍 API Testing Flow (Swagger UI)

1. **Login as Admin**: Call `POST /api/v1/auth/login` with `udit.rajput@hotmail.com` / `Admin@12345!` to obtain your JWT Bearer token.
2. **Authorize**: Paste the token into the `Authorize` button at the top of Swagger (`http://localhost:8000/docs`).
3. **Upload a Book**: Call `POST /api/v1/books` with metadata and attach a sample PDF file.
4. **Q&A & Practice Questions**: Call `POST /api/v1/qa` with `{"question": "Ask me 5 questions on Python"}` to test topic practice question generation.
5. **Dynamic App Settings**: Call `GET /api/v1/config` and `PUT /api/v1/config` to verify runtime configuration updates.
