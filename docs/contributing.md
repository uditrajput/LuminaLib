# Contributing to LuminaLib

First off, thank you for considering contributing to LuminaLib! 

## Code of Conduct

By participating in this project, you are expected to uphold our Code of Conduct.

## How Can I Contribute?

### Reporting Bugs
Before creating bug reports, please check the existing issues to see if the problem has already been reported.

### Suggesting Enhancements
Enhancement suggestions are tracked as GitHub issues.

### Pull Requests
1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. **Ensure the test suites pass**:
   - **Backend testing:** Navigate to `Lumina-backend` and run `pytest --cov`. This verifies Auth logic, API endpoints, Book CRUD limits, Borrow workflows, Quiz runner, RBAC matrix, Voice security subprotocols, and mock GenAI (52 passed across 20 test files).
   - Ensure to verify that there are no critical anomalies pushing to the Grafana logger (`http://localhost:3000/grafana/dashboards`) natively during integration testing.
   - **Voice service testing:** Navigate to `Lumina-voice` and run `pytest`. This verifies subprotocol JWT auth, audio payload validation, log scrubbing, multi-engine TTS synthesis, Indic text detection, and LRU audio caching (7 passed).
   - **Frontend testing:** Navigate to `Lumina-frontend` and run `npm run test`. This ensures Component rendering boundaries, PDF space-preserved text selection, single floating Stop tooltip, Voice Web Speech API testing, and Zod form architectures remain intact (18 suites / 75 tests passed).
5. Make sure your code lints.

## 📁 Repository Folder Structure Guide
Familiarize yourself with the architecture before contributing:
- `Lumina-backend/`: Containerized Python FastAPI application.
  - `luminalib/`: Domain-driven layers separating `api`, `services`, `models` and `repositories`.
  - `tests/`: Integrated Pytest files mapping to the operational logic (52 tests across 20 test files).
- `Lumina-voice/`: Standalone FastAPI + WebSockets audio streaming microservice with Whisper STT & Multi-Engine Neural TTS (7 tests).
- `Lumina-frontend/`: Next.js 16 App Router codebase.
  - `src/app`: Page routing boundaries.
  - `src/components`: Shared layout, PDF viewer, and UI components.
  - `__tests__/`: UI Jest boundary tests (18 suites / 75 tests).

## Styleguides

### Python Styleguide
We use `ruff` for linting and `black` for formatting.

### TypeScript Styleguide
We use `eslint` and `prettier`.

### Documentation Styleguide
Ensure all documentation is written in clear, concise Markdown in the `docs/` directory.
