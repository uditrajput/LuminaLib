# LuminaLib Frontend Configuration and Setup Guide

This document outlines the complete setup procedure for the **LuminaLib** Next.js frontend environment, including local development runs, Docker multi-stage standalone builds, atomic Jest testing, and directory layout.

---

### Table of Contents
1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Running via Docker 🐳](#running-via-docker-)
4. [Testing Suite (18 Suites / 75 Tests)](#testing-suite)
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

*(Note: The frontend voice service supports both high-efficiency `audio/mpeg` (MP3) from the low-latency Edge-TTS engine and `audio/wav` from Kokoro. Audio chunks streamed over WebSocket or fetched via `/voice/tts` are decoded natively in the browser via `AudioContext.decodeAudioData()`. LLM API keys and model provider selections are managed dynamically from the **App Settings Dashboard** in the browser, so `.env` edits are not required for AI configuration.)*

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

### 2. Test Metrics & Coverage (18 Suites / 75 Tests Passed)

All 18 test suites pass cleanly across core frontend modules:

- **Admin Dynamic Config Page (`admin-config.test.tsx`, `smtp-and-oauth.test.tsx`)**: Validates rendering of settings, General Configurations section placement, modal triggers, search filtering, conditional `+ Add Config` button toggling, SMTP configuration, OAuth providers, and unclipped LLM Provider dropdown menu.
- **Admin User & Role Management (`admin-users.test.tsx`, `admin-roles.test.tsx`)**: Asserts admin user table rendering, role switching, permissions matrix checkboxes, user blocking, and deletion workflows.
- **Profile & Preferences (`profile.test.tsx`, `voice-settings.test.tsx`)**: Validates user profile updates, avatar image persistence, primary/secondary mobile number validation, reading preference tags, Web Speech API audio sample testing, and smart disabled save button states.
- **Authentication & Route Guarding (`login.test.tsx`, `signup.test.tsx`, `route-auth-protection.test.tsx`)**: Validates form inputs, Zod schema validation errors, 12-character password constraints, password reset session revocation, JWT session handling, and unauthenticated redirects.
- **Book Catalogue & Detail (`books.test.tsx`, `private-library.test.tsx`, `recommendations.test.tsx`)**: Verifies book listing renders, PDF reader modal triggers, 8 frame themes, space-preserved text selection, saved highlights formatting, private cohort entitlements, and recommendation carousels.
- **AI Q&A Chat (`qa.test.tsx`)**: Validates Gemini-style question submission, RAG answer rendering, draft chat auto-filtering, interactive 3D glassmorphism deletion modal (`DeleteChatModal.tsx`), in-place prompt editing, in-place response regeneration (Redo), 1-click `✨ Answer` action buttons, and cross-browser Speech-to-Text via backend Whisper STT.
- **Quiz System (`quiz-v4.test.tsx`, `quiz-create.test.tsx`, `quiz-attempt-lock.test.tsx`)**: Asserts AI quiz creation flow, timed assessment runner, anti-cheat visibility tracking, auto-submit countdowns, and attempt locks.
- **UI Components & Voice Widget (`Button.test.tsx`, `VoiceWidget.test.tsx`, `page.test.tsx`)**: Validates atomic button states, voice widget toggle states, and landing page rendering.

---

## 📂 Frontend Directory Layout

```
Lumina-frontend/
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── admin/config/    # Dynamic App Settings page (General Config top, LLM & Voice collapsed, SMTP/OAuth)
│   │   ├── admin/users/     # User management table & role administration
│   │   ├── admin/roles/     # RBAC roles & permissions matrix
│   │   ├── books/           # Book catalogue & detail pages (/books/[id] with PDF reader, 8 frame themes & inline TTS)
│   │   ├── quizzes/         # Quiz catalogue, creation wizard & timed assessment runner
│   │   ├── qa/              # AI Q&A chat page with Gemini-style UI, in-place edit/redo, 3D delete modal & Whisper STT
│   │   ├── profile/         # Profile management, avatar upload & reading preferences
│   │   ├── recommendations/ # Personalized ML book suggestions
│   │   ├── dashboard/       # Streamlined user dashboard (clean header)
│   │   ├── login/           # User authentication
│   │   └── signup/          # Account registration
│   ├── components/
│   │   ├── ui/              # Buttons, inputs, status alerts, modals
│   │   ├── books/           # Book cards, review forms, summary modals
│   │   ├── pdf/             # Integrated PDF viewer with 8 frame themes, single floating Stop tooltip & enlarged sidebar
│   │   ├── qa/              # DeleteChatModal.tsx (3D glassmorphism deletion modal) & QA formatting
│   │   ├── quiz/            # Timed quiz runner, question palette, anti-cheat tracker
│   │   ├── voice/           # Floating voice widget & slide-over panel
│   │   └── layout/          # Sidenav, navbar, DashboardLayout
│   ├── context/             # AuthContext, LangContext
│   ├── hooks/               # Custom hooks (useAuth, useBooks, useRecommendations, usePreferences, useAppConfigs)
│   ├── services/            # Axios API clients (authService, bookService, qaService, voiceService, configService, quizService)
│   └── types/               # TypeScript DTOs mirroring backend models
├── public/                  # Static assets & logos
├── __tests__/               # Jest test suites
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
