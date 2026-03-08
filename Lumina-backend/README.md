<p align="center">
  <img src="docs/luminalib_logo.png" alt="LuminaLib Logo" width="180" />
</p>

<h1 align="center">LuminaLib</h1>

<p align="center">
  <strong>Enterprise Library Management System with GenAI Intelligence</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/python-3.11+-blue?logo=python&logoColor=white" alt="Python 3.11+" />
  <img src="https://img.shields.io/badge/FastAPI-0.111+-009688?logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/SQLAlchemy-2.0+-red?logo=sqlalchemy&logoColor=white" alt="SQLAlchemy" />
  <img src="https://img.shields.io/badge/Pydantic-v2-E92063?logo=pydantic&logoColor=white" alt="Pydantic v2" />
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License" />
</p>

<p align="center">
  A production-grade, <strong>Clean Architecture</strong> backend for an intelligent library management system.<br/>
  Features JWT authentication, book ingestion with AI-powered summarization, review sentiment analysis,<br/>
  ML-based recommendations, and runtime-configurable infrastructure providers.
</p>

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation (Local)](#option-1-local-development)
  - [Installation (Docker)](#option-2-docker-recommended)
- [Configuration](#-configuration)
  - [Environment Variables](#environment-variables)
  - [Runtime Configuration API](#runtime-configuration-api)
- [API Documentation](#-api-documentation)
  - [Authentication](#authentication--user-management)
  - [Books](#books)
  - [Reviews](#reviews)
  - [Recommendations](#recommendations)
  - [System Configuration](#system-configuration)
  - [Documents & QA](#documents--qa)
- [Design Patterns](#-design-patterns)
  - [Audit Logging](#1-audit-logging)
  - [Repository Pattern](#2-repository-pattern)
  - [Interface-Driven Infrastructure](#3-interface-driven-infrastructure)
  - [Factory Pattern](#4-factory-pattern)
  - [Dependency Injection](#5-dependency-injection)
- [Database Schema](#-database-schema)
- [LLM Provider Integration](#-llm-provider-integration)
- [Storage Provider Integration](#-storage-provider-integration)
- [Background Processing](#-background-processing)
- [Logging & Observability](#-logging--observability)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

**LuminaLib** is a full-featured backend system for managing a digital library with integrated AI capabilities. It goes beyond simple CRUD by providing:

- **True Book Ingestion** — Upload PDF/text files, extract content, and generate AI summaries asynchronously
- **Intelligence Layer** — LLM-powered book summarization, review sentiment analysis, and ML-based recommendations
- **Runtime Configuration** — Switch LLM providers, storage backends, and recommendation engines at runtime without restarting
- **Enterprise Audit Trail** — Every database record tracks who created/updated it and when

---

## ✨ Key Features

| Category | Features |
|----------|----------|
| **🔐 Authentication** | JWT-based stateless auth, signup/login/logout, profile management, role-based access (admin/user) |
| **📚 Book Management** | Full CRUD, file upload (PDF/text), content extraction, paginated listing |
| **🤖 AI Intelligence** | Async book summarization, review sentiment analysis, rolling consensus generation |
| **📊 Recommendations** | Content-based filtering, TF-IDF similarity (scikit-learn), user preference-driven |
| **📖 Borrow System** | Borrow/return lifecycle, constraint enforcement (must borrow before reviewing) |
| ⭐ **Reviews** | Submit reviews with ratings, automatic AI analysis of review corpus |
| ⚙️ **Configuration** | Runtime-switchable LLM, storage, and recommendation engine via API |
| 📊 **Observability** | Push-based structured logging mapped natively to **Loki** and monitored via **Grafana** |
| 📝 **Audit Logging** | `created_by`, `created_date`, `updated_by`, `updated_date` on all tables |
| **📄 Document QA** | Upload documents, chunk & embed content, RAG-based question answering |
| **📋 Swagger UI** | Auto-generated interactive API docs at `/docs` and `/redoc` |

---

## 🏗 Architecture

LuminaLib follows **Clean Architecture** principles with strict layer separation:

```
┌──────────────────────────────────────────────────────────────┐
│                    Client / Swagger UI                       │
└──────────────────────┬───────────────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────────────┐
│               API Layer (FastAPI Endpoints)                  │
│   auth · books · reviews · recommendations · config · qa     │
└──────────────────────┬───────────────────────────────────────┘
                       │  Dependency Injection (deps.py)
┌──────────────────────▼───────────────────────────────────────┐
│               Service Layer (Business Logic)                 │
│   AuthService · BookService · ReviewService · ConfigService  │
└──────────┬───────────────────────────────────┬───────────────┘
           │                                   │
┌──────────▼───────────────┐    ┌──────────────▼──────────────┐
│   Repository Layer       │    │   Interfaces (Protocols)     │
│   BaseRepo · UserRepo    │    │   LLMInterface               │
│   BookRepo · ReviewRepo  │    │   StorageInterface           │
└──────────┬───────────────┘    └──────────────┬──────────────┘
           │                                   │
┌──────────▼───────────────┐    ┌──────────────▼──────────────┐
│   Database               │    │   Infrastructure             │
│   PostgreSQL / SQLAlchemy │    │   OpenAI · Llama · Mock      │
│                          │    │   LocalStorage · S3Storage    │
└──────────────────────────┘    └──────────────────────────────┘
```

**Data flows top-down** — each layer only depends on the layer directly below it. Infrastructure implementations are resolved at runtime through **factory pattern** and **dependency injection**.

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Language** | Python 3.11+ |
| **Framework** | FastAPI |
| **ORM** | SQLAlchemy 2.0 (async) |
| **Validation** | Pydantic v2 |
| **Database** | PostgreSQL 16 |
| **Authentication** | JWT (python-jose) + bcrypt |
| **AI / LLM** | OpenRouter API, Ollama, OpenAI-compatible endpoints |
| **ML** | scikit-learn (TF-IDF + cosine similarity) |
| **File Storage** | Local filesystem, Amazon S3 / MinIO |
| **PDF Parsing** | pypdf |
| **HTTP Client** | httpx (async) |
| **Containerization** | Docker, Docker Compose |
| **API Docs** | Swagger UI (built-in), ReDoc |

---

## 📁 Project Structure

```
Lumina-backend/
│
├── luminalib/                          # Main application package
│   │
│   ├── api/                            # 📡 API Layer
│   │   └── v1/
│   │       ├── deps.py                 #   Dependency injection hub
│   │       └── endpoints/
│   │           ├── auth.py             #   POST /auth/signup, /login
│   │           ├── users.py            #   User management + preferences
│   │           ├── books.py            #   Book CRUD + borrow/return
│   │           ├── reviews.py          #   POST /books/{id}/reviews
│   │           ├── recommendations.py  #   GET /recommendations
│   │           ├── config.py           #   GET/PUT /config
│   │           ├── documents.py        #   Document CRUD
│   │           ├── ingestion.py        #   Async document processing
│   │           ├── qa.py               #   RAG-based Q&A
│   │           └── ai.py              #   POST /generate-summary
│   │
│   ├── core/                           # ⚙️ Configuration & Cross-cutting
│   │   ├── config.py                   #   Pydantic settings (.env)
│   │   ├── security.py                 #   JWT + password hashing
│   │   ├── logging_config.py           #   Structured logging setup
│   │   ├── constants.py                #   Application constants
│   │   ├── middleware.py               #   Response wrapper + request timing
│   │   └── exceptions.py              #   Custom exceptions + handlers
│   │
│   ├── db/                             # 💾 Database Layer
│   │   ├── base.py                     #   SQLAlchemy DeclarativeBase
│   │   └── session.py                  #   Async engine + session factory
│   │
│   ├── models/                         # 📊 Domain Models
│   │   ├── base_audit_model.py         #   AuditBase (4 audit columns)
│   │   ├── user.py                     #   User model
│   │   ├── book.py                     #   Book model
│   │   ├── borrow.py                   #   BookBorrow model
│   │   ├── review.py                   #   Review model
│   │   ├── recommendation.py           #   UserPreference model
│   │   ├── system_config.py            #   SystemConfig model
│   │   ├── document.py                 #   Document model
│   │   ├── document_chunk.py           #   DocumentChunk model
│   │   └── ingestion_job.py            #   IngestionJob model
│   │
│   ├── schemas/                        # 📐 Pydantic Schemas
│   │   ├── auth_schema.py              #   LoginRequest, Token
│   │   ├── user_schema.py              #   UserCreate, UserRead, UserUpdate
│   │   ├── book_schema.py              #   BookRead, BookListResponse, etc.
│   │   ├── review_schema.py            #   ReviewCreate, ReviewRead
│   │   ├── config_schema.py            #   SystemConfigRead, SystemConfigUpdate
│   │   ├── borrow_schema.py            #   BorrowRead, BorrowStatusRead
│   │   ├── preferences_schema.py       #   UserPreferencesRead/Update
│   │   ├── document_schema.py          #   DocumentCreate, DocumentRead
│   │   ├── ingestion_schema.py         #   IngestionJobRead
│   │   └── qa_schema.py               #   QuestionRequest, AnswerResponse
│   │
│   ├── repositories/                   # 🗄️ Data Access Layer
│   │   ├── base_repository.py          #   Generic async CRUD
│   │   ├── user_repository.py          #   User queries
│   │   ├── book_repository.py          #   Book queries + pagination
│   │   ├── review_repository.py        #   Review queries
│   │   ├── borrow_repository.py        #   Borrow lifecycle queries
│   │   ├── config_repository.py        #   System config singleton
│   │   └── document_repository.py      #   Document queries
│   │
│   ├── services/                       # 🧠 Business Logic Layer
│   │   ├── auth_service.py             #   Auth orchestration
│   │   ├── book_service.py             #   Book CRUD + file + summary
│   │   ├── review_service.py           #   Review + sentiment analysis
│   │   ├── recommendation_service.py   #   Content-based recommendations
│   │   ├── config_service.py           #   System config management
│   │   ├── summarizer_service.py       #   LLM summarization
│   │   ├── review_analysis_service.py  #   Review corpus analysis
│   │   ├── embedding_service.py        #   Text embedding (hash-based)
│   │   ├── ingestion_service.py        #   Document chunking
│   │   ├── rag_service.py              #   RAG retrieval
│   │   ├── text_extraction_service.py  #   PDF/text extraction
│   │   └── recommender_model_service.py#   scikit-learn model
│   │
│   ├── interfaces/                     # 🔌 Abstraction Contracts
│   │   ├── llm_interface.py            #   LLMInterface Protocol
│   │   └── storage_interface.py        #   StorageInterface Protocol
│   │
│   ├── infrastructure/                 # 🏭 Concrete Implementations
│   │   ├── llm/
│   │   │   ├── openai_provider.py      #   OpenRouter/OpenAI provider
│   │   │   ├── llama_provider.py       #   Ollama/vLLM provider
│   │   │   ├── mock_provider.py        #   Mock provider (dev/test)
│   │   │   └── llm_factory.py          #   Provider factory
│   │   └── storage/
│   │       ├── local_storage.py        #   Local filesystem
│   │       ├── s3_storage.py           #   Amazon S3 / MinIO
│   │       └── storage_factory.py      #   Provider factory
│   │
│   ├── utils/                          # 🔧 Utilities
│   │   ├── pagination.py               #   Pagination helpers
│   │   ├── hashing.py                  #   Password hashing shortcuts
│   │   └── audit.py                    #   Audit field helpers
│   │
│   └── main.py                         # 🚀 Application entry point
│
├── docs/                               # Documentation assets
├── pyproject.toml                      # Dependencies & build config
├── .env.example                        # Environment template
├── Dockerfile                          # Container build
├── docker-compose.yml                  # Full stack orchestration
└── .dockerignore                       # Docker build exclusions
```

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.11+**
- **PostgreSQL 16+** (or Docker)
- **Git**

### Option 1: Local Development

```bash
# 1. Clone the repository
git clone https://github.com/your-username/luminalib-backend.git
cd luminalib-backend

# 2. Create and configure environment
cp .env.example .env
# Edit .env with your database credentials and secrets

# 3. Create a virtual environment
python -m venv .venv
source .venv/bin/activate    # Linux/macOS
.venv\Scripts\activate       # Windows

# 4. Install dependencies
pip install -e .

# 5. (Optional) Install ML dependencies for recommendations
pip install -e ".[ml]"

# 6. Create the PostgreSQL database
createdb luminalib
# OR: psql -c "CREATE DATABASE luminalib;"

# 7. Start the server
uvicorn luminalib.main:app --host 0.0.0.0 --port 8000 --reload
```

### Option 2: Docker (Recommended)

```bash
# 1. Clone and configure
git clone https://github.com/your-username/luminalib-backend.git
cd luminalib-backend
cp .env.example .env

# 2. Build and start all services
docker-compose up --build

# The API will be available at http://localhost:8000
# PostgreSQL at localhost:5432
# Redis at localhost:6379
```

### Verify Installation

Once running, open your browser:

| URL | Description |
|-----|-------------|
| [http://localhost:8000/docs](http://localhost:8000/docs) | **Swagger UI** — Interactive API documentation |
| [http://localhost:8000/redoc](http://localhost:8000/redoc) | **ReDoc** — Alternative API documentation |
| [http://localhost:8000/health](http://localhost:8000/health) | **Health Check** — `{"status": "ok"}` |

> **Note:** On first startup, the application automatically creates all database tables and seeds a default **admin user** (`udit.rajput@hotmail.com` / `Admin@12345!`) and a default **system configuration** row.

---

## ⚙️ Configuration

### Environment Variables

As of v1.0, LuminaLib uses a **Dynamic Configuration Database Table** for nearly all application settings. The `.env` file only handles the most sensitive or early-load secrets (the database connection and JWT signing).

A minimal `.env` looks like:

```bash
DATABASE_URL=postgresql+asyncpg://postgres:postgres@postgres:5432/luminalib
JWT_SECRET=change-me-to-a-strong-secret
JWT_ALGORITHM=HS256
```

All other settings — including CORS origins, token expiries, LLM provider switching, and admin seed defaults — are loaded from the `app_configs` table via the `dynamic_config` module.

### Runtime Configuration API

LuminaLib supports **runtime configuration** through the `app_configs` database table and `dynamic_config.py` in-memory cache, which can be modified seamlessly via the frontend **App Settings Dashboard** or the API:

```bash
# Get current configuration
curl -s http://localhost:8000/api/v1/config \
  -H "Authorization: Bearer <token>" | jq

# Switch LLM provider at runtime (admin only)
curl -s -X PUT http://localhost:8000/api/v1/config \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "llm_provider": "openrouter",
    "llm_model": "meta-llama/llama-3-8b-instruct",
    "llm_api_key": "sk-or-v1-...",
    "storage_provider": "s3"
  }' | jq
```

Changes take effect **immediately** — no restart required. The dependency injection layer reads from `system_config` on every request.

---

## 📡 API Documentation

All endpoints are prefixed with `/api/v1`. Interactive documentation is available at `/docs` (Swagger) and `/redoc` (ReDoc).

### Standard Response Envelope

All JSON responses are wrapped in a standard envelope:

```json
{
  "status": 200,
  "data": { ... },
  "error_message": null
}
```

Error responses:

```json
{
  "status": 404,
  "data": null,
  "error_message": "Book not found"
}
```

---

### Authentication & User Management

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/auth/signup` | ❌ | Register a new user |
| `POST` | `/api/v1/auth/login` | ❌ | Login, returns JWT token |
| `GET` | `/api/v1/auth/profile` | 🔐 | Get current user profile |
| `PUT` | `/api/v1/auth/profile` | 🔐 | Update email/password |
| `POST` | `/api/v1/auth/logout` | 🔐 | Logout (client discards token) |
| `GET` | `/api/v1/users` | 👑 | List all users (admin only) |
| `PUT` | `/api/v1/users/{id}/role` | 👑 | Update user role (admin only) |
| `GET` | `/api/v1/users/me/preferences` | 🔐 | Get recommendation preferences |
| `PUT` | `/api/v1/users/me/preferences` | 🔐 | Update recommendation preferences |

<details>
<summary><strong>Example: Signup & Login</strong></summary>

```bash
# Register
curl -s -X POST http://localhost:8000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "reader@example.com", "password": "MySecurePass123"}' | jq

# Login
curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "reader@example.com", "password": "MySecurePass123"}' | jq

# Response:
# {
#   "status": 200,
#   "data": {
#     "access_token": "eyJhbGciOiJIUzI1NiIs...",
#     "token_type": "bearer"
#   },
#   "error_message": null
# }
```

</details>

---

### Books

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/books` | 🔐 | Upload book (multipart: file + metadata) |
| `GET` | `/api/v1/books` | ❌ | List books (paginated: `?page=1&size=10`) |
| `GET` | `/api/v1/books/{id}` | ❌ | Get book details |
| `PUT` | `/api/v1/books/{id}` | 🔐 | Update book metadata or file |
| `DELETE` | `/api/v1/books/{id}` | 🔐 | Delete book and associated file |
| `POST` | `/api/v1/books/{id}/borrow` | 🔐 | Borrow a book |
| `POST` | `/api/v1/books/{id}/return` | 🔐 | Return a borrowed book |
| `GET` | `/api/v1/books/{id}/borrow-status` | 🔐 | Check borrow status |
| `GET` | `/api/v1/books/{id}/summary` | ❌ | Get AI-generated book summary |
| `GET` | `/api/v1/books/{id}/analysis` | ❌ | Get GenAI review analysis |
| `GET` | `/api/v1/books/{id}/reviews` | ❌ | List reviews for a book |
| `DELETE` | `/api/v1/books/{id}/file` | 🔐 | Remove book file only |

<details>
<summary><strong>Example: Upload a Book</strong></summary>

```bash
curl -s -X POST http://localhost:8000/api/v1/books \
  -H "Authorization: Bearer <token>" \
  -F "file=@mybook.pdf" \
  -F "title=Clean Architecture" \
  -F "author=Robert C. Martin" \
  -F "genre=Software Engineering" \
  -F "year_published=2017" | jq
```

This triggers an **asynchronous background task** that:
1. Extracts text from the uploaded PDF
2. Sends the content to the configured LLM provider
3. Saves the AI-generated summary back to the book record

</details>

---

### Reviews

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/books/{id}/reviews` | 🔐 | Submit a review (requires prior borrow) |

> **Constraint:** A user must have borrowed the book before they can submit a review.

<details>
<summary><strong>Example: Submit a Review</strong></summary>

```bash
curl -s -X POST http://localhost:8000/api/v1/books/1/reviews \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"review_text": "Excellent guide to software architecture.", "rating": 5}' | jq
```

This triggers a background task that regenerates the **rolling review consensus** using the LLM.

</details>

---

### Recommendations

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/v1/recommendations` | 🔐 | Get personalized book recommendations |
| `GET` | `/api/v1/recommendations?book_id=1` | 🔐 | Get similar books to a specific book |
| `POST` | `/api/v1/recommendations/train` | 👑 | Train the ML model (admin only) |

The recommendation engine uses a **three-tier approach**:

1. **ML Model (TF-IDF)** — If a trained model exists, use scikit-learn cosine similarity
2. **Content-Based Similarity** — Fall back to hash-based embedding similarity
3. **Preference-Based** — Use user's genre/author/keyword preferences

---

### System Configuration

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/v1/config` | 🔐 | Get current system configuration |
| `PUT` | `/api/v1/config` | 👑 | Update configuration (admin only) |

<details>
<summary><strong>Example: Switch to OpenRouter LLM</strong></summary>

```bash
curl -s -X PUT http://localhost:8000/api/v1/config \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "llm_provider": "openrouter",
    "llm_model": "openai/gpt-4o-mini",
    "llm_api_key": "sk-or-v1-your-api-key-here"
  }' | jq

# Response:
# {
#   "status": 200,
#   "data": {
#     "id": 1,
#     "llm_provider": "openrouter",
#     "llm_model": "openai/gpt-4o-mini",
#     "storage_provider": "local",
#     "recommendation_engine": "content_based",
#     "created_by": "system",
#     "created_date": "2026-03-04T12:00:00Z",
#     "updated_by": "udit.rajput@hotmail.com",
#     "updated_date": "2026-03-04T18:10:00Z"
#   }
# }
```

</details>

**Configurable Fields:**

| Field | Values | Description |
|-------|--------|-------------|
| `llm_provider` | `mock`, `openrouter`, `http` | LLM provider to use |
| `llm_model` | Any model string | Model identifier |
| `llm_api_key` | API key string | Provider API key |
| `llm_base_url` | URL | Base URL for self-hosted LLM |
| `storage_provider` | `local`, `s3` | File storage backend |
| `recommendation_engine` | `content_based`, `ml` | Recommendation algorithm |

---

### Documents & QA

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/documents` | 🔐 | Create a document (JSON body) |
| `POST` | `/api/v1/documents/upload` | 🔐 | Upload a document file |
| `GET` | `/api/v1/documents` | 🔐 | List user's documents |
| `GET` | `/api/v1/documents/{id}` | 🔐 | Get a document |
| `POST` | `/api/v1/ingestion/{id}` | 🔐 | Start async document ingestion |
| `GET` | `/api/v1/ingestion/jobs` | 🔐 | List ingestion jobs |
| `GET` | `/api/v1/ingestion/jobs/{id}` | 🔐 | Get job status |
| `POST` | `/api/v1/qa` | 🔐 | Ask a question (RAG-based) |
| `POST` | `/api/v1/generate-summary` | 🔐 | Generate AI summary from text |

---

## 🎨 Design Patterns

### 1. Audit Logging

Every database table automatically tracks **who** made changes and **when**:

```python
class AuditBase(Base):
    __abstract__ = True

    created_by  = Column(String(255))       # User who created the record
    created_date = Column(DateTime,          # Auto-set on INSERT
                         server_default=func.now())
    updated_by  = Column(String(255))       # User who last modified
    updated_date = Column(DateTime,          # Auto-set on INSERT & UPDATE
                         server_default=func.now(),
                         onupdate=func.now())
```

All 11 domain models inherit from `AuditBase`:

`Role` · `User` · `AppConfig` · `SystemConfig` · `Book` · `UserPreference` · `BookBorrow` · `Review` · `Document` · `DocumentChunk` · `IngestionJob`

---

### 2. Repository Pattern

Services **never** import SQLAlchemy. All database access goes through repositories:

```
Endpoint  →  Service  →  Repository  →  Database
```

**Generic Base Repository** provides:
- `get_by_id(id)` — Find by primary key
- `get_all()` — Fetch all records
- `get_paginated(page, size, order_by)` — Paginated queries with total count
- `create(entity)` — Insert + commit + refresh
- `update(entity)` — Commit + refresh
- `delete(entity)` — Delete + commit

Domain repositories extend this with entity-specific queries (e.g., `UserRepository.get_by_email()`).

---

### 3. Interface-Driven Infrastructure

External services are defined as **Python Protocols** (structural typing):

```python
class LLMInterface(Protocol):
    async def summarize(self, content: str) -> str: ...
    async def analyze_review(self, content: str) -> str: ...

class StorageInterface(Protocol):
    async def upload(self, filename: str, content: bytes) -> str: ...
    async def download(self, key: str) -> bytes: ...
    async def delete(self, key: str) -> None: ...
```

**Benefits:**
- Services depend on abstractions, not implementations
- New providers can be added without changing existing code
- Easy to mock for testing

---

### 4. Factory Pattern

Infrastructure factories resolve the correct implementation at runtime:

```python
# llm_factory.py
async def get_llm_provider(provider_override=None, ...) -> LLMInterface:
    provider = provider_override or settings.llm_provider
    if provider == "openrouter": return OpenAIProvider(...)
    if provider == "http":       return LlamaProvider(...)
    return MockProvider()
```

The factory accepts **override parameters** from the `system_config` table, enabling runtime switching.

---

### 5. Dependency Injection

FastAPI's `Depends()` system wires everything together in `deps.py`:

```python
# Repository injection
def get_book_repo(session = Depends(get_db)) -> BookRepository:
    return BookRepository(session)

# Service injection (with infrastructure)
async def get_book_service(
    book_repo = Depends(get_book_repo),
    storage   = Depends(get_storage),    # Factory-resolved
    llm       = Depends(get_llm),        # Factory-resolved
) -> BookService:
    return BookService(book_repo, storage, llm)
```

This makes every component **testable in isolation** — just swap the dependency.

---

## 💾 Database Schema

```
┌────────────────┐    ┌──────────────────────────┐    ┌──────────────────┐
│     roles      │◄───┤         users            │    │  system_config   │
├────────────────┤    ├──────────────────────────┤    ├──────────────────┤
│ id (PK)        │    │ id (PK)                  │    │ id (PK)          │
│ name (UNIQUE)  │    │ email (UNIQUE)           │    │ llm_provider     │
│ description    │    │ hashed_password          │    │ llm_model        │
│ + audit cols   │    │ role_id (FK)             │    │ storage_provider │
└────────────────┘    │ is_active                │    │ recommendation_* │
                      │ + audit cols             │    │ + audit cols     │
                      └──────────┬───────────────┘    └──────────────────┘
                                 │
                                 │                    ┌──────────────────┐
    ┌────────────────────────────┴────────┐           │   app_configs    │
    │                                     │           ├──────────────────┤
    ▼                                     ▼           │ id (PK)          │
┌─────────┐    ┌────────────────┐  ┌──────────────────┤ key (UNIQUE)     │
│ books   │    │user_preferences│  │   documents      │ value            │
├─────────┤    ├────────────────┤  ├──────────────────┤ description      │
│ id (PK) │    │ id (PK)        │  │ id (PK)          │ + audit cols     │
│ title   │    │ user_id (FK)   │  │ filename         └──────────────────┘
│ author  │    │ preferences    │  │ content          │
│ genre   │    │ + audit cols   │  │ owner_id (FK)    │
│ year    │    └────────────────┘  │ + audit cols     │
│ file_*  │                        └────────┬─────────┘
│ summary │                                 │
│ + audit │                          ┌──────┴────────┐
└────┬────┘                          ▼               ▼
     │                     ┌───────────────┐ ┌────────────────┐
     ├──────────┐          │document_chunks│ │ ingestion_jobs │
     ▼          ▼          ├───────────────┤ ├────────────────┤
┌────────────┐ ┌─────────┐ │ document_id   │ │ document_id    │
│book_borrows│ │ reviews │ │ book_id       │ │ status         │
├────────────┤ ├─────────┤ │ content       │ │ error          │
│ book_id    │ │ book_id │ │ embedding     │ │ + audit cols   │
│ user_id    │ │ user_id │ │ + audit cols  │ └────────────────┘
│ borrow_at  │ │ text    │ └───────────────┘
│ return_at  │ │ rating  │
│ + audit    │ │ + audit │
└────────────┘ └─────────┘
```

> **All tables** include `created_by`, `created_date`, `updated_by`, and `updated_date` columns.

---

## 🤖 LLM Provider Integration

LuminaLib supports 4 LLM providers, switchable at runtime through the dynamic settings:

| Provider | Config Value | Description |
|----------|-------------|-------------|
| **OpenRouter** | `openrouter` | Cloud-based via [OpenRouter](https://openrouter.ai/) (GPT-4, Llama, Claude, etc.) |
| **Ollama** | `ollama` | Fully local models served by an Ollama instance |
| **OpenAI** | `openai` | Direct integration with the official OpenAI API (`api.openai.com`) |
| **Mock** | `mock` | Returns deterministic mock responses — no API calls (for testing) |

**LLM is used for:**
- 📖 **Book summarization** — 5 concise bullet points on ingestion
- 📝 **Review analysis** — Rolling 3-point sentiment consensus
- 💬 **QA** — Context-grounded question answering

---

## 📦 Storage Provider Integration

| Provider | Config Value | Description |
|----------|-------------|-------------|
| **Local** | `local` | Files saved to `./storage/` directory |
| **S3** | `s3` | Amazon S3 or S3-compatible (MinIO, DigitalOcean Spaces) |

Both implement the same `StorageInterface` protocol (`upload`, `download`, `delete`).

---

## ⚡ Background Processing

Heavy AI tasks run asynchronously via FastAPI's `BackgroundTasks`:

```
Upload Book → Save File → Save Metadata → Background: LLM Summary
Submit Review → Save Review → Background: Review Consensus Update
Start Ingestion → Create Job → Background: Chunk + Embed Document
```

This ensures API responses remain fast (<100ms) while AI processing happens in the background.

---

## 📊 Logging & Observability

### Structured Logging (Loki + Grafana)

All components use Python's structured logging with consistent formatting. In production (via Docker), logs natively support the loki protocol. The provided **Grafana** dashboard is securely routed via the frontend at `http://localhost:3000/grafana/dashboards`.

```
2026-03-04 18:10:32 | INFO     | luminalib.services.book | Book created: id=5 title=Clean Code by=udit.rajput@hotmail.com
2026-03-04 18:10:32 | INFO     | luminalib.middleware    | POST /api/v1/books → 201 (142.3 ms)
2026-03-04 18:10:35 | INFO     | luminalib.llm.factory   | Using Mock LLM provider
```

### Request Middleware

Every request is logged with:
- HTTP method and path
- Response status code
- Processing time in milliseconds

### Recommended Monitoring Stack

For production, integrate with:

```
FastAPI Logs → Loki → Grafana Dashboard
FastAPI Metrics → Prometheus → Grafana Dashboard
```

Install `prometheus-fastapi-instrumentator` and expose `/metrics` for Prometheus scraping.

---

## 🧪 Testing

```bash
# Install test dependencies
pip install -e ".[test]"

# Run tests
pytest

# Run with coverage
pytest --cov=luminalib --cov-report=html
```

**Testing Strategy:**
- **Unit tests** — Mock repositories/services and test logic in isolation
- **Integration tests** — Use an async SQLite database for full request/response testing
- **Fixtures** — Use `pytest-asyncio` for async test support

**Key Test Cases Covered:**
- `test_auth.py`: User registration validations, JWT token issuance, and Role verifications.
- `test_books.py`: Book CRUD operations, pagination, file uploading (mocked), and borrow status tracking.
- `test_users.py`: Bio and preferences updates, role access checks.
- `test_reviews.py`: Review submission logic, rating constraints (must borrow), and average rating calculations.
- `test_ingestion.py`: Async document chunking background job triggers.

For detailed instructions, see the [Backend Setup & Testing Guide](../docs/backend_setup.md).

---

## 🐳 Deployment

### Docker Compose (Development)

```bash
docker-compose up --build
```

Services:
| `api` | 8000 | FastAPI application |
| `postgres` | 5432 | PostgreSQL 16 |
| `redis` | 6379 | Redis (for future Celery support) |

### Production Checklist

- [ ] Set a strong `JWT_SECRET` (at least 32 characters)
- [ ] Configure a real `DATABASE_URL` (managed PostgreSQL)
- [ ] Set `LLM_PROVIDER` and provide API keys
- [ ] Configure `STORAGE_PROVIDER=s3` with bucket credentials
- [ ] Set `CORS_ORIGINS` to your frontend domain
- [ ] Enable HTTPS (use a reverse proxy like Nginx or Traefik)
- [ ] Set up Prometheus + Grafana for monitoring
- [ ] Configure log aggregation (Loki, CloudWatch, etc.)

---

## 🤝 Contributing

Contributions are welcome! Please follow the guidelines in the [Contributing Guide](../docs/contributing.md).

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Follow** the import order: stdlib → third-party → local modules
4. **Lint** your code:
   ```bash
   pip install ruff black mypy
   ruff check .
   black .
   mypy .
   ```
5. **Write tests** for new features
6. **Commit** with descriptive messages: `git commit -m 'feat: add user preferences endpoint'`
7. **Push** and open a **Pull Request**

### Code Quality Standards

| Tool | Purpose |
|------|---------|
| **Ruff** | Fast Python linter |
| **Black** | Code formatter |
| **MyPy** | Static type checking |
| **Pytest** | Test framework |

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](../LICENSE) file for details.

---

<p align="center">
  Built with ❤️ using <strong>Python</strong>, <strong>FastAPI</strong>, and <strong>Clean Architecture</strong>
</p>
