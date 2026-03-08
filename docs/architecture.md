# LuminaLib Architecture Document

This document explains the core architectural and design decisions made while building LuminaLib. 

## 1. Dynamic Application Configuration
**Decision:** Store system settings and API keys in a dynamic `app_configs` database table instead of static `.env` files.
**Why:** To provide a seamless administrative experience. By loading configurations dynamically at runtime and caching them in memory, administrators can switch LLM providers, update API keys, or change storage backends directly from the frontend UI without requiring an application restart or container rebuild.

## 2. Database Schema for User Preferences
**Decision:** Store user preferences in a `user_preferences` table utilizing a flexible `JSON` column for the `preferences` field.
**Why:** User preferences—such as favorite genres, authors, or topics—often evolve. By using a JSON column instead of standard relational mapping (which would require multiple join tables for genres, authors, etc.), we provide maximum scheme flexibility. This allows the frontend to send deeply nested preference data without requiring expensive DB migrations whenever we want to track a new type of preference node.

## 3. Handling the "Async" Aspect of LLM Generation
**Decision:** Use `BackgroundTasks` (FastAPI) and `asyncio.create_task` for non-blocking LLM execution. 
**Why:** Generating summaries or parsing review sentiment via a Local LLM or external API can take several seconds to over a minute. 
- **During Review Submission:** FastAPI's `BackgroundTasks` is utilized to add a fire-and-forget task (`update_review_summary`) that recalculates the rolling consensus after the API response is already returned.
- **During Ingestion:** Large documents are ingested, chunked, embedded, and summarized using `asyncio.create_task()` calling `_process_ingestion`, keeping the `/ingestion` endpoint fast and moving the heavy NLP workloads to the background.

## 4. Machine Learning Recommendation Strategy
**Decision:** Three-Tier Recommendation Engine (ML Model, Content-Based, Preference-Based).
**Why:** To ensure we always provide high-quality recommendations regardless of the data scale:
- **ML Model (TF-IDF & Cosine Similarity):** We use `scikit-learn` to calculate TF-IDF and cosine similarity across the book corpus for robust relational mapping.
- **Content-Based Similarity:** For scenarios without ML models trained, we compare hash-based text embeddings of summaries.
- **Heuristic Scoring:** We use a custom scoring algorithm based on how closely metadata (genre, author, keyword strings) aligns with the user's JSON preferences profile, serving highly relevant content directly from the SQL catalog.

## 5. Frontend Design Choices
**Decision:** Next.js + React Query + Tailwind CSS.
**Why:**
- **Next.js:** Provides Server-Side Rendering (SSR) which vastly improves perceived load times and ensures our catalog pages remain SEO-friendly.
- **React Query (@tanstack/react-query):** Abstracted network layer. Instead of directly using `fetch` or `axios` inside hooks, React Query manages background data syncing, caching, loading states, and mutations cleanly out of the box.
- **Tailwind CSS:** Used for styling thanks to its composition-focused utility classes. It pairs exceptionally well with React components, allowing us to build atomic, responsive elements with high consistency and no arbitrary CSS bleed.

## 6. Extensibility & Clean Architecture
**Decision:** Interface-Driven Development for Storage and LLM via built-in Factories.
**Why:** LuminaLib uses strict service abstractions. Changing the LLM from a cloud provider (OpenAI, OpenRouter) to a local model (Ollama), or switching file storage from local disk to S3, only requires pointing to a different Provider class implementation injected at runtime via Dependency Injection.

## 7. Observability & Logging Architecture
**Decision:** Integrate Grafana and Loki natively within the Docker networking stack for full-stack structured logs.
**Why:** Standard docker driver console logs are insufficient for a production-grade backend. Utilizing `python-logging-loki` inside the FastAPI app and `winston-loki` inside the Next.js frontend pushes logs natively to Loki over HTTP. Furthermore, the frontend implements an `ActivityTracker` to relay client-side navigation into the observability pipeline. Grafana is seamlessly pre-provisioned and securely proxied via an Edge Middleware SSO layer in Next.js, allowing Admins instant access to both backend traces and frontend user activity without exposing Grafana to the public internet.

## 8. Folder Structure Architecture
LuminaLib encapsulates the Clean Architecture pattern directly in its folder definitions:
- **`luminalib/api/v1`**: The outermost routing layer. Only deals with HTTP abstractions.
- **`luminalib/services`**: The core business logic, decoupled from HTTP and Infrastructure.
- **`luminalib/repositories`**: Interface boundaries bridging between SQLAlchemy models and the Service layer.
- **`tests/`**: Mirroring the project structure to enable strict unit boundaries.

## 9. Test Cases Architecture
LuminaLib asserts functional correctness via integrated testing architectures:
- **`pytest` + SQLite Factory**: Using in-memory `sqlite` representations mapped dynamically against SQLAlchemy sessions for backend testing.
- **`jest` + jsdom**: Abstract UI rendering assertions against Tailwind configurations and React Query boundaries on the frontend.
- **Key Test Modules Coverage**: Authenticators, CRUD Books, Review Sentiments (Mocked LLM), and Document QA ingestion pipelines.
