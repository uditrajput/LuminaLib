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
   - **Backend testing:** Navigate to `Lumina-backend` and run `pytest --cov`. This verifies Auth logic, API endpoints, Book CRUD limits, Borrow workflows, and mock GenAI. 
   - Ensure to verify that there are no critical anomalies pushing to the Grafana logger (`http://localhost:3000/grafana/dashboards`) natively during integration testing.
   - **Frontend testing:** Navigate to `Lumina-frontend` and run `npm run test`. This ensures Component rendering boundaries and Zod form architectures remain intact.
5. Make sure your code lints.

## 📁 Repository Folder Structure Guide
Familiarize yourself with the architecture before contributing:
- `Lumina-backend/`: Containerized Python FastAPI application.
  - `luminalib/`: Domain-driven layers separating `api`, `services`, `models` and `repositories`.
  - `tests/`: Integrated Pytest files mapping to the operational logic.
- `Lumina-frontend/`: Next.js 15 App Router codebase.
  - `src/app`: Page routing boundaries.
  - `src/components`: Shared layout hooks.
  - `__tests__/`: UI Jest boundary tests.

## Styleguides

### Python Styleguide
We use `ruff` for linting and `black` for formatting.

### TypeScript Styleguide
We use `eslint` and `prettier`.

### Documentation Styleguide
Ensure all documentation is written in clear, concise Markdown in the `docs/` directory.
