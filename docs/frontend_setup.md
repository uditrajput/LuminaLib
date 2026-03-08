# LuminaLib Frontend Configuration and Setup Guide

This document outlines the complete, step-by-step setup procedure for the LuminaLib frontend environment, including local development runs, Dockerized production builds, unit testing instructions, and environment configurations.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Running via Docker 🐳](#running-via-docker-)
4. [Testing Suite](#testing-suite)
5. [Linting and Formatting](#linting-and-formatting)

---

## Prerequisites

Before setting up the frontend application, ensure your environment meets the following requirements:

- **Node.js**: Version 20.x or higher.
- **npm**: Version 10.x or higher (comes bundled with Node.js).
- **Backend Running**: Make sure your FastAPI backend (`Lumina-backend`) is up and running.
- **Docker**: Installed on your machine (if you wish to build containerized versions).

---

## Local Development Setup

### 1. Installation

Start by cloning the codebase and navigating directly into the `Lumina-frontend` directory. Install the required Node packages:

```bash
cd Lumina-frontend
npm install
```

### 2. Environment Variables

Create your local `.env.local` file at the root of the frontend application (`Lumina-frontend/.env.local`):

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

*(Note: In previous versions, API keys for LLMs like OpenAI or OpenRouter were stored here. As of v1.0, these are configured dynamically from the **App Settings Dashboard** in the browser, so only the API URL is required locally.)*

### 3. Launch the Server

Run the development server utilizing the Next.js runtime:

```bash
npm run dev
```

The application provides Hot Module Replacement (HMR) and typically runs on `http://localhost:3000`.

---

## Running via Docker 🐳

The project includes an optimized, multi-stage `Dockerfile` tailored for Next.js to drastically decrease image size by utilizing Next's `standalone` output technique.

### 1. Configure for Standalone Mode

We've already enabled the `output: 'standalone'` directive in `next.config.ts`. The Dockerfile uses this to build an extremely light production image.

### 2. Build the Docker Image

Run the `docker build` command inside the `Lumina-frontend` folder:

```bash
docker build -t luminalib-frontend:latest .
```

*This will run through the layers: `deps` (install dependencies) -> `builder` (compile TypeScript, create static Next.js paths) -> `runner` (create minimal user environment).*

### 3. Run the Container

Execute your finalized Docker image and expose the correct mapping to your local machine port 3000:

```bash
docker run -p 3000:3000 luminalib-frontend:latest
```

The production-ready frontend will now be actively running at `http://localhost:3000`. 

*(Note: When linking this Frontend Docker container directly to your Backend Container, you should configure a `docker-compose.yml` to set them on a unified network, pointing `NEXT_PUBLIC_API_URL` to the backend container name).*

---

## Testing Suite

The LuminaLib Frontend implements strict, high-fidelity atomic testing using **Jest** and **React Testing Library**. It enforces DOM validation securely in memory using `jsdom`.

### 1. Run Unit Tests natively

Execute the test command. It will execute the predefined configurations generated within `jest.config.js`:

```bash
npm run test
```

### 2. Available Test Boundaries & Key Test Cases Covered

Currently, atomic tests focus on fundamental UI design constraints (e.g., verifying `components/ui/Button.test.tsx` constraints on varying states and CSS tailwind classes). This strategy prevents architectural styling overrides.

#### **Explicit Test Environments:**
- **Auth Forms Verification**: Validation tests for login structures mimicking real form `Zod` events with strict conditions matching password standards.
- **Component Mock Renders**: Validation checks for mocked API book queries testing proper loading states within UI frames.
- **State Changes**: AuthContext assertions and User Session validation bounds through Jest abstraction.

---

## 📂 Frontend Folder Structure Refresher
```bash
Lumina-frontend/
├── src/
│   ├── app/                 # Next.js Server Components, layouts
│   ├── components/
│   │   ├── ui/              # Buttons, inputs, interactive base blocks
│   │   ├── books/           # Library-specific blocks
│   │   └── layout/          # Sidenavs, header navs
│   ├── context/             # JWT Context providers
│   ├── hooks/               # TanStack query handlers
│   ├── services/            # Axios API configurations
│   └── types/               # Strict DTO interfaces
├── public/                  # Assets and logos
├── __tests__/               # Jest test locations
├── next.config.ts           # Standalone outputs
├── tailwind.config.ts       # Utility styling overrides
└── tsconfig.json            # Deep typescript maps
```

---

## Linting and Formatting

LuminaLib asserts firm code styles via `eslint`. All code merged should meet the static analysis checks.

### Run Linter

Check the overall codebase for TypeScript or pattern violations:

```bash
npm run lint
```

---

## Next Steps

After your frontend and backend are interconnected, try the following actions inside the UI:
1. Navigate to `http://localhost:3000/signup`.
2. Register an enterprise User profile (or use the seeded admin account `udit.rajput@hotmail.com` / `Admin@12345!`).
3. Observe the Next.js client-router push you correctly to the internal Library (**Books**) page via your secure session!
4. Head to your **Profile** page (`/profile` via top navigation) to dictate your favorite genres.
5. Watch the **Recommendations** (`/recommendations`) update utilizing your customized preferences to match predictive AI mappings.
6. (Admin Only) Navigate to the **App Settings** panel to dynamically configure your preferred GenAI LLM provider (OpenAI, OpenRouter, Ollama, etc.) and save it straight to the active backend infrastructure.
7. (Admin Only) View real-time full-stack logs instantly and securely directly inside the Next.js runtime via the Edge Middleware SSO proxy by clicking the **Grafana** item in the main header!
