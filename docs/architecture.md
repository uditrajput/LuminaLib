# LuminaLib Architecture Document

This document explains the core architectural and design decisions made while building **LuminaLib**.

---

### 1. Dynamic Application Configuration & UI State Management
**Decision:** Store system settings and API keys in a dynamic `app_configs` database table instead of static `.env` files, paired with a hierarchical admin configuration interface (`/admin/config`).
**Why:** 
- **Runtime Adaptability:** Allows administrators to switch LLM providers (Docker Model Runner, OpenRouter, Ollama, OpenAI, Mock), update API keys, or change storage backends directly from the frontend UI without requiring application restarts or container rebuilds.
- **Hierarchical UI Layout:** General Configurations is positioned at the top (default expanded) with the `+ Add Config` action embedded in its header (automatically hidden when collapsed). LLM Provider and Voice Settings panels default to collapsed state with animated chevrons, keeping the interface uncluttered. The LLM Provider dropdown renders as an unclipped, scrollable overlay (`max-h-72 overflow-y-auto z-50`).
- **State Change Detection:** Form panels (such as `VoiceSettingsPanel`) compare active selections against initial server preferences, disabling the save button (`cursor-not-allowed`) until actual edits occur.

---

## 2. RAG Prompting & High-Yield Topic Question Generation
**Decision:** Enhance the RAG system prompt (`luminalib/api/v1/endpoints/qa.py`) to recognize topic practice requests and deliver structured high-yield questions with 1-click action hooks.
**Why:**
- **Exam & Interview Practice:** When users ask *"Ask me questions on [topic]"* (e.g. Python, Operating Systems, HTTP), the system prompt directs the LLM to select the most frequently asked, high-yield exam and interview questions for that topic.
- **Action Button Scoping:** The frontend message parser injects interactive **`✨ Answer`** action buttons exclusively under AI assistant messages (for Markdown table rows or lists), preventing invalid button rendering under user prompts.

---

## 3. Speech Synthesis (TTS) Narration Filtering Pipeline
**Decision:** Implement regex-based text normalization inside the frontend `speakAnswer` speech synthesis utility.
**Why:**
- **Meaningful Speech Output:** Reading raw Markdown tables or document excerpts aloud produces distracting audio artifacts (e.g. speaking "vertical bar", "dash dash dash", or reading page numbers like "On Page 12, p. 14").
- **Automated Filter:** Before invoking `window.speechSynthesis`, the pipeline strips page number phrases (`On Page X`, `p. Y`), bracketed citations (`[1]`), table pipes (`|`), action labels (`| Action |`), dashes (`---`), and Markdown bold markers (`**`), presenting pure, natural, and meaningful answer speech to the user.

---

## 4. PDF Reader Frame & Thumbnail Persistence Architecture
**Decision:** Custom PDF viewer wrapper with 8 frame themes, frame-anchored navigation controls, space-preserved text selection layer, and single-column enlarged thumbnail sidebar (`w-80`).
**Why:**
- **Custom Aesthetic Themes:** Provides 8 distinct visual themes (Default Clean, Glassmorphism, Classic Wood, Cyberpunk Neon, Vintage Parchment, Midnight Dark, Minimal White, Golden Luxury) with theme selection persisted in `localStorage`.
- **Space-Preserved Text Selection:** Transparent `<span>` elements on the PDF selection layer append word boundary spacing (`item.str + (item.hasEOL ? "\n" : " ")`), ensuring copied text and saved highlights preserve clean word spacing.
- **Zoom-Responsive Navigation:** Left and Right glassmorphism navigation buttons are anchored outside the active page frame, dynamically adjusting position when the user zooms in or out.
- **Sidebar Thumbnail Organization:** The `w-80` collapsible sidebar renders single-column enlarged thumbnails with page number badges (`Page X`) and `Active` indicators positioned cleanly *below* thumbnail cards, accompanied by an in-panel text search filter.

---

## 5. Machine Learning Recommendation Strategy
**Decision:** Three-Tier Recommendation Engine (ML Model, Content-Based, Preference-Based).
**Why:**
- **ML Model (TF-IDF & Cosine Similarity):** Uses `scikit-learn` to calculate TF-IDF and cosine similarity across the book corpus for robust relational mapping.
- **Content-Based Similarity:** Compares text embeddings of summaries when ML models are not trained.
- **Heuristic Preference Scoring:** Evaluates metadata (genre, author, keyword strings) against the user's JSON preferences profile directly in SQL.

---

## 6. Voice Assistant Microservice & Security Architecture
**Decision:** Separate `lumina-voice` microservice running FastAPI + WebSockets (`:8001`), integrated with Kokoro-82M TTS (ONNX Runtime CPU), Whisper STT (`faster-whisper`), and client-side Web Speech API voice previewing, enforcing strict security audit controls.
**Why:**
- **Microservice Isolation:** Decouples heavy real-time audio processing (speech recognition & TTS synthesis) from core REST API worker threads.
- **Web Speech API Previewing:** Voice sample testing in `VoiceSettingsPanel` invokes `window.speechSynthesis` directly for zero-latency, natural human voice previewing.
- **Security Audit Remediations (`security_audit.md`)**:
  - **Subprotocol Auth (`CRIT-001`)**: `Sec-WebSocket-Protocol`: `voice-v1, jwt-<token>` validates tokens before `websocket.accept()`.
  - **Input Sanitization (`CRIT-002`)**: 500-char transcript bounds, control char stripping, and XML `<DOCUMENT_CHUNK>` RAG isolation boundaries.
  - **Privilege Escalation Control (`CRIT-003`)**: `user_email` extracted strictly from verified JWT claims with 30s TTL `action_id` confirmation binding.
  - **Audio Validation (`MED-002`)**: Container magic byte verification (WAV, WebM, OGG, FLAC) and 10MB chunk payload ceiling.
  - **Log Scrubbing & Security Headers (`HIGH-004`, `LOW-002`)**: Automatic redaction of JWT tokens/Bearer headers from logs, plus security headers (`HSTS`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`).s.

---

## 7. Database Schema for Flexible User Preferences
**Decision:** Store user preferences in a `user_preferences` table utilizing a flexible `JSON` column.
**Why:** Reading preferences (favorite genres, authors, keywords) evolve frequently. A JSON column provides schema flexibility without requiring multiple join tables or DB migrations when adding new preference nodes.

---

## 8. Observability & Logging Architecture
**Decision:** Integrate Grafana and Loki natively within the Docker networking stack for full-stack structured logs with Edge Middleware SSO.
**Why:** Standard container console logs are insufficient for production debugging. `python-logging-loki` in FastAPI and `winston-loki` in Next.js push logs natively to Loki. The Next.js frontend includes an `ActivityTracker` to log client-side navigation. Grafana is pre-provisioned and securely proxied via an Edge Middleware SSO layer in Next.js, allowing Admins instant access to traces without exposing Grafana directly to the public internet.

---

## 9. Folder Structure & Clean Architecture
LuminaLib encapsulates the Clean Architecture pattern directly in its directory layout:
- **`luminalib/api/v1`**: Outermost HTTP routing layer.
- **`luminalib/services`**: Core business logic, decoupled from HTTP and Infrastructure.
- **`luminalib/repositories`**: Data-access layer bridging SQLAlchemy ORM models and services.
- **`tests/`**: Pytest test suites mirroring backend modules (34 passing test cases).
- **`Lumina-frontend/src/`**: Next.js App Router UI layer with 11 Jest test suites (51 passing tests).
