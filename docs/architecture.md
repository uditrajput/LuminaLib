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

## 2. Gemini-Style Interactive Q&A & In-Place State Management
**Decision:** Interactive Gemini-inspired Q&A architecture (`/qa`) with session draft management, in-place prompt editing, and in-place response regeneration (Redo).
**Why:**
- **Draft Session Filtering:** Clicking **New Chat** initializes a transient session draft. If the user switches chats or clicks "New Chat" without sending a query, empty draft sessions are automatically filtered out and omitted from database history.
- **In-Place Prompt Updating:** Editing a prompt renders a rounded Gemini-style editor container (`rounded-3xl`). On save, downstream messages are truncated and updated in-place without generating redundant chat bubbles.
- **In-Place Response Regeneration (Redo):** Clicking **Redo** targets the specific assistant message index and re-queries the AI backend using the associated prompt text. The response is updated in-place (with loading spinner feedback), preventing prompt duplication or chat stream pollution.
- **Interactive Deletion Modal:** Uses a 3D glassmorphism dialog modal (`DeleteChatModal.tsx`) for non-blocking session deletion feedback.

---

## 3. Cross-Browser Dual-Engine Speech Recognition (Firefox & Whisper STT)
**Decision:** Hybrid Speech-to-Text (STT) architecture supporting native Web Speech API for Chromium browsers and `MediaRecorder` + Whisper AI fallback for Mozilla Firefox and Safari.
**Why:**
- **Firefox Compatibility:** Mozilla Firefox lacks native Web Speech API STT out-of-the-box. The frontend detects API availability and seamlessly falls back to `MediaRecorder` audio capture with live spectrum wave animation.
- **Microservice STT Proxy:** Audio blobs recorded in Firefox are submitted via `POST /api/v1/voice/transcribe` (proxied in `Lumina-backend`) to `Lumina-voice` (`POST /voice/transcribe`), where `faster-whisper` transcribes raw audio bytes into text for instant submission.

---

## 4. RAG Prompting & High-Yield Topic Question Generation
**Decision:** Enhance the RAG system prompt (`luminalib/api/v1/endpoints/qa.py`) to recognize topic practice requests and deliver structured high-yield questions with 1-click action hooks.
**Why:**
- **Exam & Interview Practice:** When users ask *"Ask me questions on [topic]"* (e.g. Python, Operating Systems, HTTP), the system prompt directs the LLM to select the most frequently asked, high-yield exam and interview questions for that topic.
- **Action Button Scoping:** The frontend message parser injects interactive **`✨ Answer`** action buttons exclusively under AI assistant messages (for Markdown table rows or lists), preventing invalid button rendering under user prompts.

---

## 5. Speech Synthesis (TTS) Narration Filtering Pipeline
**Decision:** Implement regex-based text normalization inside the frontend `speakAnswer` speech synthesis utility.
**Why:**
- **Meaningful Speech Output:** Reading raw Markdown tables or document excerpts aloud produces distracting audio artifacts (e.g. speaking "vertical bar", "dash dash dash", or reading page numbers like "On Page 12, p. 14").
- **Automated Filter:** Before invoking `window.speechSynthesis`, the pipeline strips page number phrases (`On Page X`, `p. Y`), bracketed citations (`[1]`), table pipes (`|`), action labels (`| Action |`), dashes (`---`), and Markdown bold markers (`**`), presenting pure, natural, and meaningful answer speech to the user.

---

## 6. PDF Reader Frame, Thumbnail Persistence & Speech Synthesis Architecture
**Decision:** Custom PDF viewer wrapper with 8 frame themes, frame-anchored navigation controls, space-preserved text selection layer, single-column enlarged thumbnail sidebar (`w-80`), **unified floating selection tooltip with inline Speak / Stop toggling**, and OCR text sanitization.
**Why:**
- **Custom Aesthetic Themes:** Provides 8 distinct visual themes (Default Clean, Glassmorphism, Classic Wood, Cyberpunk Neon, Vintage Parchment, Midnight Dark, Minimal White, Golden Luxury) with theme selection persisted in `localStorage`.
- **Space-Preserved Text Selection:** Transparent `<span>` elements on the PDF selection layer append word boundary spacing (`item.str + (item.hasEOL ? "\n" : " ")`), ensuring copied text and saved highlights preserve clean word spacing.
- **Unified Floating Selection Tooltip & Speech Synthesis:** When text is highlighted on a PDF page, a single floating glassmorphism tooltip renders (`[ 🔊 Speak ] | HIGHLIGHT: [●][●][●][●]`). On clicking Speak, the button transitions into a pinned `[ 🔇 Stop ]` controller without disappearing.
- **Event Propagation Isolation & Click-Outside Auto-Stop:** Speech control actions execute `e.stopPropagation()` and `e.preventDefault()`, shielding the speech state machine from native DOM selection clears. Clicking anywhere outside the tooltip automatically stops active audio playback and closes the menu cleanly.
- **OCR Text Sanitization:** Before sending text to speech synthesis, raw PDF extracts undergo hyphen rejoining (unhyphenation of line-break words like `syn-\nthesis` → `synthesis`) and whitespace collapsing, preventing awkward audio pauses.
- **Zoom-Responsive Navigation:** Left and Right glassmorphism navigation buttons are anchored outside the active page frame, dynamically adjusting position when the user zooms in or out.
- **Sidebar Thumbnail Organization:** The `w-80` collapsible sidebar renders single-column enlarged thumbnails with page number badges (`Page X`) and `Active` indicators positioned cleanly *below* thumbnail cards, accompanied by an in-panel text search filter.

---

## 7. Machine Learning Recommendation Strategy
**Decision:** Three-Tier Recommendation Engine (ML Model, Content-Based, Preference-Based).
**Why:**
- **ML Model (TF-IDF & Cosine Similarity):** Uses `scikit-learn` to calculate TF-IDF and cosine similarity across the book corpus for robust relational mapping.
- **Content-Based Similarity:** Compares text embeddings of summaries when ML models are not trained.
- **Heuristic Preference Scoring:** Evaluates metadata (genre, author, keyword strings) against the user's JSON preferences profile directly in SQL.

---

## 8. Profile Integrity & Password Security Controls
**Decision:** Implement strict profile field constraints and active session revocation upon password reset.
**Why:**
- **Contact Uniqueness:** Enforces database/frontend validation preventing identical primary and secondary mobile numbers.
- **Avatar Persistence:** Avatar upload handlers preserve profile image URLs across user details updates.
- **Session Revocation:** Resetting user passwords automatically revokes active JWT sessions, terminating unauthorized access across devices until re-authentication occurs.

---

## 9. Voice Assistant Microservice & Multi-Engine TTS Architecture
**Decision:** Separate `lumina-voice` microservice running FastAPI + WebSockets (`:8001`), integrated with a **Multi-Engine Hybrid TTS Architecture** (Microsoft Edge Neural TTS primary, Kokoro-82M offline neural fallback, gTTS cloud fallback), Whisper STT (`faster-whisper`), in-memory LRU audio caching, 10,000-character payload support, and client-side Web Speech API voice previewing, enforcing strict security audit controls.
**Why:**
- **Microservice Isolation:** Decouples heavy real-time audio processing (speech recognition & TTS synthesis) from core REST API worker threads.
- **Low-Latency Hybrid TTS Pipeline:**
  - **Primary Engine (`edge-tts`)**: Delivers studio-grade Microsoft Neural voices (`en-US-JennyNeural`, `en-US-GuyNeural`, `en-GB-SoniaNeural`, `en-GB-RyanNeural`, `hi-IN-SwaraNeural`, `hi-IN-MadhurNeural`) with **~1.3s response times** and compact MP3 encoding (20KB vs 200KB uncompressed WAV).
  - **Secondary Offline Engine (`Kokoro-82M`)**: Local CPU neural TTS running in a non-blocking threadpool executor (`loop.run_in_executor`). Concatenates raw PCM int16 samples into a single buffer before writing a single valid RIFF header, preventing audio clicks, static, and premature browser playback cutoffs.
  - **Indic & Devanagari Support**: Automatic Devanagari detection routing Hindi and Sanskrit queries to native natural voices (`hi-IN-SwaraNeural` / `gTTS`).
  - **In-Memory LRU Audio Cache**: 256-slot async cache keyed by `(text, voice, speed)` providing **<6ms instant response times** for repeated queries, book titles, and action confirmations.
  - **Long-Form Text Support**: `TTSGenerateRequest` and `POST /voice/tts` endpoints support up to **10,000 characters** with automatic sentence chunking and streaming.
  - **Buzzer Elimination**: Replaced legacy mathematical sine-wave hum/buzzer generators with authentic neural speech and clean silent fallbacks.
- **Container Healthcheck**: Exposes native `GET /voice/voices` on `:8001` ensuring Docker health checks report `healthy` status.
- **Web Speech API Previewing:** Voice sample testing in `VoiceSettingsPanel` invokes `window.speechSynthesis` directly for zero-latency, natural human voice previewing.
- **Security Audit Remediations (`security_audit.md`)**:
  - **Subprotocol Auth (`CRIT-001`)**: `Sec-WebSocket-Protocol`: `voice-v1, jwt-<token>` validates tokens before `websocket.accept()`.
  - **Input Sanitization (`CRIT-002`)**: 500-char transcript bounds, control char stripping, and XML `<DOCUMENT_CHUNK>` RAG isolation boundaries.
  - **Privilege Escalation Control (`CRIT-003`)**: `user_email` extracted strictly from verified JWT claims with 30s TTL `action_id` confirmation binding.
  - **Audio Validation (`MED-002`)**: Container magic byte verification (WAV, WebM, OGG, FLAC) and 10MB chunk payload ceiling.
  - **Log Scrubbing & Security Headers (`HIGH-004`, `LOW-002`)**: Automatic redaction of JWT tokens/Bearer headers from logs, plus security headers (`HSTS`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`).

---

## 10. Database Schema for Flexible User Preferences
**Decision:** Store user preferences in a `user_preferences` table utilizing a flexible `JSON` column.
**Why:** Reading preferences (favorite genres, authors, keywords) evolve frequently. A JSON column provides schema flexibility without requiring multiple join tables or DB migrations when adding new preference nodes.

---

## 11. Observability & Telemetry Architecture (Dual-Engine: PostgreSQL + Loki)
**Decision:** Integrate Grafana with dual datasources (`Loki` for structured application log aggregation and `PostgreSQL` for operational & business metrics), provisioned out-of-the-box with role-based Edge Middleware Admin SSO.
**Why:** Standard container console logs are insufficient for comprehensive observability:
- **Loki Integration:** `python-logging-loki` in `luminalib-backend` and `lumina-voice`, alongside client/server logging in `luminalib-frontend`, push structured telemetry directly to Loki (`application="luminalib"`, `application="lumina-voice"`, `application="luminalib-frontend"`).
- **PostgreSQL Operational Telemetry:** Grafana connects natively to the PostgreSQL database (`postgres:5432/luminalib`) to render real-time business KPIs and platform health across catalog inventory, active borrows, reading sessions & completion velocity, user growth, quiz analytics, and voice turns.
- **Pre-Provisioned Production Dashboards:**
  1. *LuminaLib Executive & Library Operations* (`luminalib_overview_1`): Catalog inventory, borrow circulation, reader completion rates, and user role distribution.
  2. *LuminaLib AI, Voice & Study Telemetry* (`luminalib_ai_voice_1`): Voice conversation & turn volume, study flashcard generation, quiz pass rates, and AI review consensus.
  3. *LuminaLib System Health & SRE Telemetry* (`luminalib_system_health_1`): 5xx/4xx error rate tracking, container log throughput, security events, and database table row counters.
  4. *LuminaLib Unified Multi-Service Logs* (`luminalib_logs_1`): Live log stream explorer with service and log-level filtering across all microservices.
- **Admin SSO Proxy:** Secured through `/grafana-sso` and Next.js Edge Middleware, verifying administrator JWT claims before issuing Grafana session cookies with automatic reverse-proxying.

---

## 12. Quiz & Assessment Engine (v4.0)
**Decision:** Server-authoritative timer (`expires_at = NOW()+duration`), `quiz_group_entitlements` (reuse `UserGroup` pattern), LLM Factory for AI generation (`document_chunks` → prompt → JSON), auto-grade MCQ exact-match + AI-assisted descriptive (human confirm).
**Why:** Group entitlement reuses `groups.py:82` proven path; server time prevents client drift; AI never auto-publishes — draft editable; `quiz_attempt_events` logs `visibility_hidden` for light anti-cheat.

---

## 13. Reading Telemetry + PWA + Study Companion (v4.0)
**Decision:** `reading_sessions` heartbeat `15s` from `PDFReaderModal:316`, `highlights` sync `POST /progress/highlights`, `GET /progress/stats` for streak/XP/level, `manifest.json` + `sw.js` cache-first pdfs, `POST /study/generate` for flashcards/mindmap (mermaid), `GET /search` hybrid LIKE→vector, `LangContext` + reduced-motion.
**Why:** Telemetry unlocks dashboard `ReadingAnalytics` + gamification; PWA gives offline for edu; study companion reuses highlight context.

---

## 14. Folder Structure & Clean Architecture
LuminaLib encapsulates the Clean Architecture pattern directly in its directory layout:
- **`luminalib/api/v1`**: Outermost HTTP routing layer.
- **`luminalib/services`**: Core business logic, decoupled from HTTP and Infrastructure.
- **`luminalib/repositories`**: Data-access layer bridging SQLAlchemy ORM models and services.
- **`Lumina-voice/app`**: Dedicated voice microservice with Whisper STT, Multi-Engine Hybrid TTS (Edge-TTS, Kokoro-82M, gTTS), and LRU audio caching (7 passing unit test cases).
- **`Lumina-backend/tests/`**: Pytest test suites mirroring backend modules (52 passing test cases across 20 test files).
- **`Lumina-frontend/src/`**: Next.js App Router UI layer with 18 Jest test suites (75 passing tests).
