# LuminaLib Frontend Configuration and Setup Guide

This document outlines the complete setup procedure for the **LuminaLib** Next.js frontend environment, including local development runs, Docker multi-stage standalone builds, atomic Jest testing, and directory layout.

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Running via Docker 🐳](#running-via-docker-)
4. [Testing Suite (11 Suites / 51 Tests)](#testing-suite)
5. [Directory Layout](#directory-layout)
6. [Linting and Code Quality](#linting-and-code-quality)

---

## Prerequisites

Ensure your development environment has:

- **Node.js**: Version 20.x LTS or higher.
- **npm**: Version 10.x or higher.
- **Backend Running**: FastAPI backend (`Lumina-backend`) listening on `http://localhost:8000/api/v1`.
- **Docker**: Installed (if building production container images).

---

## Local Development Setup

### 1. Installation

Navigate into the `Lumina-frontend` directory and install Node dependencies:

```bash
cd Lumina-frontend
npm install
```

### 2. Environment Variables

Create your local `.env.local` file at `Lumina-frontend/.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_VOICE_WS_URL=ws://localhost:8001/voice/ws
```

*(Note: LLM API keys and model provider selections are managed dynamically from the **App Settings Dashboard** in the browser and stored in the database, so `.env` edits are not required for AI configuration.)*

### 3. Launch Development Server

Run the development server with Hot Module Replacement (HMR):

```bash
npm run dev
```

The application will be accessible at [http://localhost:3000](http://localhost:3000).

---

## Running via Docker 🐳

The frontend uses a multi-stage `Dockerfile` leveraging Next.js `output: 'standalone'` to produce a lightweight production container.

### 1. Build the Docker Image

Run `docker build` inside `Lumina-frontend`:

```bash
docker build -t luminalib-frontend:latest .
```

*Stages: `deps` (npm ci) → `builder` (TypeScript compilation & static generation) → `runner` (minimal Alpine runtime environment).*

### 2. Run the Container

Execute the Docker image and map port 3000:

```bash
docker run -p 3000:3000 luminalib-frontend:latest
```

The production frontend will start at [http://localhost:3000](http://localhost:3000).

---

## Testing Suite

The LuminaLib frontend implements atomic unit and integration tests using **Jest** and **React Testing Library**, running DOM assertions in memory via `jsdom`.

### 1. Execute Unit Tests

Run the test suite:

```bash
npm run test
```

### 2. Test Metrics & Coverage (11 Suites / 51 Tests Passed)

All 11 test suites pass cleanly across core frontend modules:

- **Admin Dynamic Config Page (`admin-config.test.tsx`)**: Validates rendering of settings, General Configurations section placement, modal triggers, search filtering, conditional `+ Add Config` button toggling, and unclipped LLM Provider dropdown menu.
- **Admin User Management (`admin-users.test.tsx`)**: Asserts admin user table rendering, role switching, user blocking, and deletion workflows.
- **Profile & Preferences (`profile.test.tsx`, `voice-settings.test.tsx`)**: Validates user profile updates, avatar image persistence, primary/secondary mobile number validation, reading preference tags, Web Speech API audio sample testing, and smart disabled save button states.
- **Authentication (`login.test.tsx`, `signup.test.tsx`)**: Validates form inputs, Zod schema validation errors, 12-character password constraints, password reset session revocation, and JWT session handling.
- **Book Catalogue & Detail (`books.test.tsx`)**: Verifies book listing renders, PDF reader modal triggers, 8 frame themes, space-preserved text selection, saved highlights formatting, and review submission forms.
- **AI Q&A Chat (`qa.test.tsx`)**: Validates Gemini-style question submission, RAG answer rendering, draft chat auto-filtering, interactive 3D glassmorphism deletion modal (`DeleteChatModal.tsx`), in-place prompt editing, in-place response regeneration (Redo), 1-click `✨ Answer` action buttons, and cross-browser Speech-to-Text via backend Whisper STT.

---

## 📂 Frontend Directory Layout

```
Lumina-frontend/
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── admin/config/    # Dynamic App Settings page (General Config top, LLM & Voice collapsed)
│   │   ├── admin/users/     # User management table & role administration
│   │   ├── books/           # Book catalogue & detail pages (/books/[id] with PDF reader & 8 frame themes)
│   │   ├── qa/              # AI Q&A chat page with Gemini-style UI, in-place edit/redo, 3D delete modal & Whisper STT
│   │   ├── profile/         # Profile management, avatar upload & reading preferences
│   │   ├── recommendations/ # Personalized ML book suggestions
│   │   ├── dashboard/       # Streamlined user dashboard (clean header)
│   │   ├── login/           # User authentication
│   │   └── signup/          # Account registration
│   ├── components/
│   │   ├── ui/              # Buttons, inputs, status alerts, modals
│   │   ├── books/           # Book cards, review forms, summary modals
│   │   ├── pdf/             # Integrated PDF viewer with 8 frame themes & enlarged thumbnail sidebar (w-80)
│   │   ├── qa/              # DeleteChatModal.tsx (3D glassmorphism deletion modal) & QA formatting
│   │   ├── voice/           # Floating voice widget & slide-over panel
│   │   └── layout/          # Sidenav, navbar, DashboardLayout
│   ├── context/             # AuthContext (JWT state management)
│   ├── hooks/               # Custom hooks (useAuth, useBooks, useRecommendations, usePreferences, useAppConfigs)
│   ├── services/            # Axios API clients (authService, bookService, qaService, voiceService, configService)
│   └── types/               # TypeScript DTOs mirroring backend models
├── public/                  # Static assets & logos
├── __tests__/               # 11 Jest test suites
├── next.config.ts           # Next.js standalone output configuration
├── tailwind.config.ts       # TailwindCSS utility theme definitions
├── tsconfig.json            # TypeScript compiler configuration
└── jest.config.js           # Jest test runner setup
```

---

## Linting and Code Quality

Run static code analysis:

```bash
npm run lint
```

Ensure all code passes linting rules before committing changes.
