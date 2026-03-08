# Local Setup and Testing Guide

This document provides step-by-step instructions on how to set up, run, and test the **LuminaLib** backend application on your local machine. You can choose to run the application fully using Docker, or natively using a Python virtual environment.

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Git**: For version control.
- **Python 3.11+**: If running natively.
- **Docker & Docker Compose**: If running via Docker.
- **PostgreSQL 16**: (Optional) If running natively without a Dockerized database.

---

## 🐳 Option 1: Setup using Docker (Recommended)

Running the application with Docker is the fastest way to get started, as it bundles the application, PostgreSQL, and Redis into isolated containers.

### Step 1: Clone and Configure
1. Open your terminal and navigate to the project root directory (`Lumina-backend`).
2. Create your environment configuration file from the template:
   ```bash
   cp .env.example .env
   ```
   *Note: The default values in `.env.example` are already configured to work with the `docker-compose.yml` networking.*

### Step 2: Build and Run
1. Build the Docker images and start the containers in detached mode:
   ```bash
   docker-compose up --build -d
   ```
2. Verify that the containers are running:
   ```bash
   docker-compose ps
   ```
   *You should see `luminalib-backend`, `luminalib-postgres`, and `luminalib-redis` containers in the `Up` state.*

### Step 3: Verify the Application
1. Open your browser and navigate to the Swagger UI:
   [http://localhost:8000/docs](http://localhost:8000/docs)
2. The application is now running. Any changes you make to the source code will automatically reload the server if configured with a volume (though building the image baked the code in. For live-reload in Docker, you would map a volume in `docker-compose.yml`).

### Viewing Logs and Stopping
- To view live logs from the API container:
  ```bash
  docker-compose logs -f api
  ```
- To stop the containers without destroying the database volume:
  ```bash
  docker-compose stop
  ```
- To bring down the containers and remove everything (including the database volume if specified):
  ```bash
  docker-compose down -v
  ```

---

## 💻 Option 2: Setup for Local Development (Native)

If you prefer to run the FastAPI application directly on your host machine for easier debugging or testing, follow these steps.

### Step 1: Create a PostgreSQL Database
You need a running PostgreSQL instance. You can either use a local install or spin up just the database in Docker.

**Using Docker for just the database (Recommended for native dev):**
```bash
docker run -d --name luminalib-pg \
  -e POSTGRES_DB=luminalib \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgres:16-alpine
```

### Step 2: Configure Environment Variables
1. Create your `.env` file from the template:
   ```bash
   cp .env.example .env
   ```
2. Ensure the `DATABASE_URL` in `.env` points to your `localhost` accessible PostgreSQL instance:
   ```env
   DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/luminalib
   JWT_SECRET=your-secret-key
   JWT_ALGORITHM=HS256
   ```

*Note: In LuminaLib v1.0, application settings (LLM Provider, API Keys, Storage Settings) have been removed from the static `.env` file and migrated into a dynamic `app_configs` PostgreSQL system table.*

### Step 3: Setup Python Environment
1. Create a virtual environment:
   ```bash
   # Windows
   python -m venv .venv
   .venv\Scripts\activate

   # macOS/Linux
   python3 -m venv .venv
   source .venv/bin/activate
   ```
2. Install the project in editable mode with development/testing dependencies:
   ```bash
   pip install -e ".[test,ml]"
   ```

### 📂 Backend Folder Structure Refresher
Ensure you are operating in the correct environment boundaries. The backend application follows this layout:
```bash
Lumina-backend/
├── luminalib/          # Main application package
│   ├── api/            # Controller endpoints
│   ├── core/           # Security, Configurations, Middleware
│   ├── db/             # SQLAlchemy configurations
│   ├── infrastructure/ # LLMs and Storage implementations
│   ├── models/         # SQLAlchemy ORMs
│   ├── repositories/   # DB interactions
│   ├── schemas/        # Pydantic schemas
│   └── services/       # Core business logic
├── tests/              # All pytest implementations
├── docs/               # Architecture/Setup guides
├── .env.example        # Environment variable templating
├── deploy.ps1          # Easy Windows deployment powershell helper
└── docker-compose.yml  # Container compositions
```

### Step 4: Run the Application
1. Start the FastAPI development server using `uvicorn`:
   ```bash
   uvicorn luminalib.main:app --host 0.0.0.0 --port 8000 --reload
   ```
2. The server will start, automatically create the database tables, and seed the default admin user.
3. Access the API documentation at [http://localhost:8000/docs](http://localhost:8000/docs).

---

## 🧪 Running Tests Locally

LuminaLib includes an automated test suite powered by `pytest`. Follow these steps to run the tests locally.

### Prerequisites for Testing
Ensure you have installed the test dependencies. If you haven't already:
```bash
pip install -e ".[test]"
```

### Running the Test Suite
1. **Run all tests:**
   ```bash
   pytest
   ```
   *Note: Our tests are configured to use an isolated async SQLite database or mocked dependencies, so they won't interfere with your main PostgreSQL database.*

2. **Run tests with verbose output:**
   ```bash
   pytest -v
   ```

3. **Run a specific test file or directory:**
   ```bash
   pytest tests/services/
   pytest tests/api/v1/endpoints/test_books.py
   ```

4. **Run tests with coverage report:**
   To see how much of your code is covered by tests, install `pytest-cov` and run:
   ```bash
   pip install pytest-cov
   pytest --cov=luminalib --cov-report=term-missing
   ```
   Generate an HTML report:
   ```bash
   pytest --cov=luminalib --cov-report=html
   # Open htmlcov/index.html in your browser
   ```

### 🧪 Core Test Cases Covered
- **Authentication**: Validating signup with constraints (e.g. valid email, strong password matching regex rules) and validating JWT generation via login routes.
- **Book Workflows**: Tests for fetching list configurations, fetching individual books, file ingestions via Mock abstractions, updating metadata parameters, and standard deletion.
- **Borrow Logic**: Asserting users can borrow books sequentially and confirming the toggle between unavailable/available states.
- **Review Constraint Chains**: Checking if the system prevents users from reviewing unborrowed books, validating rating limits, and calculating the updated consensus.
- **LLM/AI Abstractions**: Injecting Mocked Responses for checking the GenAI functionalities without actually utilizing OpenRouter or Local APIs over network loops.

---

## 🔍 Interacting with the Application (Quick Test Flow)

Once the application is running (via Docker or natively), you can test the core flows using Swagger UI or `curl`.

1. **Login as Admin:**
   - Go to `POST /api/v1/auth/login`
   - Use `udit.rajput@hotmail.com` and `Admin@12345!`
   - Copy the returned `access_token`.

2. **Upload a Book:**
   - Go to `POST /api/v1/books`
   - Authorize using the token at the top of Swagger.
   - Fill in the form metadata and upload a PDF file.

3. **View AI Configuration:**
   - Go to `GET /api/v1/config`
   - See the currently active `llm_provider` and `storage_provider`. By default, this might be set to `mock` or `openrouter` depending on your seeded configuration.

4. **Change Configuration (Runtime):**
   - Go to `PUT /api/v1/config`
   - Update `llm_provider` to `"openrouter"` and provide an `llm_api_key`.
   - Subsequent AI operations will immediately utilize the newly provided infrastructure without requiring a server reboot!

5. **View Live Server Telemetry:**
   - Go to [http://localhost:3000/grafana/dashboards](http://localhost:3000/grafana/dashboards).
   - See the real-time aggregated full-stack logs parsed by Loki explicitly proxied through the secure Next.js SSO Edge Middleware.
