<div align="center">
  <img src="docs/luminalib_logo.png" alt="LuminaLib Logo" width="180" />
  <h1>LuminaLib Frontend</h1>
  <p>A Modern, Secure, and Blazing-Fast Library Management Platform. Built for the Enterprise.</p>

  [![Next.js](https://img.shields.io/badge/Next.js-15.0-black?logo=next.js)](https://nextjs.org/)
  [![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
  [![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.0-38B2AC?logo=tailwindcss)](https://tailwindcss.com/)
  [![Jest](https://img.shields.io/badge/Tested_with-Jest-C21325?logo=jest)](https://jestjs.io/)
</div>

---

## 📖 Overview

The LuminaLib Frontend is an elegant, responsive web application that provides the user interface for the LuminaLib backend endpoints. It is precisely engineered around modern Next.js methodologies and enterprise-grade React architectures. We guarantee speed, highly-secure integrations (such as robust JWT abstractions), and deep TypeScript models seamlessly aligning with our core API logic.

## ✨ Key Features

- **App Router Architecture:** Employs the highly performant Next.js 15 App router taking full advantage of React Server Components (RSC) and layouts.
- **Strict Component Composition:** Clean layouts comprising isolated atoms and fully reusable context-aware UI templates.
- **Robust Abstracted Network Layer:** We strictly forbid the usage of uncontrolled `axios` and `fetch` calls in front-end pages. All endpoint mapping utilizes unified wrapper functions via `TanStack React Query`, resulting in smart-caching and extreme network resilience.
- **AI-Powered Recommendations:** Fully integrated "For You" experience drawing real-time machine learning predictions mapped via the backend and preferences configuration.
- **User Profile & Preferences Configurator:** Managed dashboard integrating robust preferences mappings leveraging interactive React hooks to mutate states seamlessly.
- **Stunning UI Experience:** Clean design layouts incorporating customized micro-animations crafted directly via unified `Tailwind CSS`.
- **Form Interception:** Secure, rapid data handling composed via `react-hook-form` and thoroughly checked via `zod`.
- **App Settings Dashboard:** Configure dynamic settings like active LLM Providers (OpenRouter, Ollama, OpenAI) or API keys directly from an intuitive Admin UI panel—bypassing `.env`.
- **Grafana Observability Navigation:** Securely proxied administrative SSO dashboard link injected via Edge middleware, automatically pushing dual-tracked Next.js user activity logs and backend traces to Loki.
- **Bulletproof Type Definitions:** Unified `types/*` perfectly syncing with the FastAPI definitions to assure bug-free payloads.
- **Strict Security Pipelines:** Strong form validation enforcing complex password requirements (12+ characters, mixed symbols) tied closely with stateless JWT architectures.

## 🛠️ Technology Stack

| Architecture Layer               | Recommended Technology             |
|---------------------------------|---------------------------------|
| **Framework**                       | Next.js (App Router)            |
| **Core Language**                   | TypeScript                      |
| **UI Design System**                | TailwindCSS                     |
| **Network & Data State**            | TanStack React Query            |
| **Data Validation & Forms**         | React Hook Form + Zod           |
| **Network Client Wrapper**          | Next/Axios intercepts           |
| **Unit Testing Platform**           | Jest + React Testing Library    |

## 📂 Project Architecture Pattern

```bash
LuminaLib-frontend/
├── src/
│   ├── app/                 # Next.js App Router (Pages, Layouts, Configurations)
│   │   ├── books/           # Library Dashboard integration
│   │   ├── recommendations/ # AI For You predictions
│   │   ├── profile/         # Profile and Preferences managers
│   │   ├── login/           # Authentication ingress
│   │   └── signup/          # User registration ingress
│   ├── components/
│   │   ├── ui/              # Reusable generic UI atoms (Buttons, Inputs, Modals)
│   │   ├── books/           # UI logic specific to the Library Domain
│   │   └── layout/          # Foundational components (Navbars, sidebars)
│   ├── hooks/               # Connected React Query and State Hooks
│   ├── services/            # Secure endpoint data definitions
│   ├── types/               # Exact matching DTO signatures for the network calls
│   └── context/             # Global states (JWT Auth Managers)
```

## 🚀 Getting Started

### Prerequisites
Make sure you have Node installed (Node `v20`+ recommended) and the FastAPI LuminaLib backend running.

### Installation

1. Clone or access the correct repository directory.
2. Install npm packages:
   ```bash
   npm install
   ```

### Running Locally

Fire up the development environment connected to the default localhost parameters:

```bash
npm run dev
```

The application will start gracefully at `http://localhost:3000`.

*Note: For a complete step-by-step setup, see the [Frontend Setup Guide](../docs/frontend_setup.md).*

## 🧪 Testing and Quality Control

We follow highly aggressive testing scenarios for our crucial UI atoms (e.g., verifying `Button` behavior boundaries). We map Jest onto the new `jsdom` testing implementations.

Run the unit tests:
```bash
npm run test
```

See [Testing and Quality Control](../docs/frontend_setup.md#testing-suite) for more details.

## 🏗️ Building for Production

To assemble the optimized static representations and verify TS lint integrity:

```bash
npm run build
```

Then begin the node product cluster using:
```bash
npm run start
```

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](../LICENSE) file for details.

