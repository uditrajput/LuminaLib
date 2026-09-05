# LuminaLib Functional Guide

Welcome to the LuminaLib functional guide. This document provides a detailed walkthrough of all core features, AI intelligence capabilities, PDF reading experience, voice interaction workflows, and system settings available in the platform.

---

## 🔐 1. Authentication & User Access

### Creating an Account
- Navigate to the **Signup** page (`/signup`).
- Requirements: A valid email address and a strong password (minimum 12 characters, including uppercase, lowercase, numbers, and symbols).

### Logging In & Password Reset
- Navigate to the **Login** page (`/login`).
- **Default Admin Credentials**:
  - **Email**: `udit.rajput@hotmail.com`
  - **Password**: `Admin@12345!`
- **Password Reset & Session Revocation**: When a user resets their password, active authentication sessions are automatically invalidated and signed out, requiring re-login with the new credentials.

### Profile Management
- Click on the **Profile** icon in the navigation bar (`/profile`).
- **Profile Picture Upload**: Upload and save custom avatar images with automatic persistence when updating profile information.
- **Mobile Number Validation**: Enforces strict contact validation — **Primary Mobile Number** and **Secondary Mobile Number** cannot be identical.
- Update personal details (Full Name, Bio) and security settings.
- Direct link to **Voice Settings** (`/profile/voice-settings`) to configure preferred speech synthesis parameters.

---

## 📊 2. User Dashboard

### Clean & Focused Interface (`/dashboard`)
- Streamlined user dashboard displaying borrowed book stats, active reading sessions, and quick recommendations.
- **Optimized Header**: Removed non-functioning search bar and notification bell icon for a clean, distraction-free UX focused entirely on user library activity.

---

## 📚 3. Library Management & PDF Reading Experience

### Browsing the Collection
- The **Books** page (`/books`) displays a responsive grid and paginated list of available books.
- Search by title, author, or filter by genre and publication year.

### Uploading a Book (User/Admin)
- Click the **"Add New Book"** button on the Books page.
- Provide the title, author, genre, and publication year.
- **File Upload**: Attach a PDF or Text file.
- Upon successful upload, the system automatically starts an **Async AI Background Ingestion Task** to chunk, embed, and summarize the book.

### PDF Reader & Custom Frame Themes
- Click any book to open its detail page (`/books/[id]`) with the integrated PDF reader.
- **8 Book Frame Themes**: Choose your preferred reading atmosphere from the frame selector:
  1. *Default Clean* (Sleek slate border)
  2. *Glassmorphism* (Frosted glass backdrop blur)
  3. *Classic Wood* (Warm mahogany timber finish)
  4. *Cyberpunk Neon* (Vibrant cyan/purple glowing border)
  5. *Vintage Parchment* (Aged paper texture)
  6. *Midnight Dark* (Deep dark theme for night reading)
  7. *Minimal White* (Pure crisp white canvas)
  8. *Golden Luxury* (Elegant brushed gold border)
  - Selected frame style is automatically saved to local storage and persists across reading sessions.
- **Frame-Anchored Navigation Buttons**: Left and Right glassmorphism page navigation buttons appear anchored right outside the page frame on hover and adjust position dynamically when zooming.
- **Enlarged Thumbnail Sidebar**: Click the panel toggle button to open the left sidebar (`w-80`).
  - Displays single-column enlarged page thumbnails.
  - Page number labels (`Page X`) and `Active` status badges are cleanly displayed *below* each thumbnail card.
  - Built-in text search bar allows searching for specific text directly within the sidebar panel.
- **Text Selection & Saved Highlights Drawer**:
  - Selecting text on any page preserves exact word boundaries and spaces (`item.str + (item.hasEOL ? "\n" : " ")`).
  - Text highlights format cleanly in the **Saved Highlights** drawer with text wrapping (`break-words`) and page jump links.

### Borrowing and Returning
- Click **"Borrow Book"** on an available book detail page.
- To return a borrowed book, navigate back to the book detail page and click **"Return Book"**.

---

## ⭐ 4. Feedback & Reviews

### Submitting a Review
- **Requirement**: Users must have borrowed the book at least once to leave a review.
- Scroll to the **Reviews** section on the book detail page.
- Select a star rating (1–5) and write your review.
- **AI Sentiment & Review Consensus**: The system automatically recalculates and updates the rolling AI "Review Consensus" summary for the book after every review submission.

---

## 🤖 5. AI Intelligence & Interactive Q&A (`/qa`)

### AI Book Summaries
- Every uploaded book receives an automated AI-generated summary.
- View this on the book detail page for a quick 5-point overview.

### Gemini-Style Chat Interface & Sessions
- **Persistent Chat History**: Left sidebar lists past Q&A sessions with auto-generated session titles based on the initial question.
- **Draft Chat Auto-Filtering**: Clicking **New Chat** creates a fresh draft. If no question is asked, empty draft sessions are automatically filtered out and never saved to history.
- **Interactive 3D Glassmorphism Deletion Modal**: Deleting a conversation triggers a sleek glassmorphism confirmation modal (`DeleteChatModal.tsx`).
- **Independent Page Scrolling**: Locked outer QA viewport with independent vertical scrolling for chat history (`scrollbar-thin`).

### Prompt Editing & In-Place Updates
- **Gemini-Style Prompt Editor**: Clicking **Edit** on a user prompt opens a rounded Gemini-style editor container with a transparent auto-resizing textarea and pill buttons (**Cancel** & **Update**).
- **In-Place Response Refresh**: Saving an edited prompt replaces the message in-place, truncates downstream old AI responses, and fetches a fresh AI response without duplicating messages.

### In-Place Response Regeneration (Redo)
- **Redo Action**: Clicking **Redo** on an assistant response regenerates the answer **in-place** (with spinning loading feedback) using the associated user prompt text.
- **Clean Stream**: Avoids creating duplicate user prompt bubbles or appending redundant chat entries.

### Document Ingestion & Q&A (RAG Pipeline)
- Ask questions against the ingested documents of your borrowed books using the natural language prompt input.
- Ground answers in your library's content using the vector RAG pipeline.

### High-Yield Topic Practice Questions
- When you ask the AI assistant to generate practice questions on a topic (e.g. *"Ask me questions on Python"*, *"Ask me a question on Operating Systems"*):
  - Generates frequently asked, high-yield exam and interview questions formatted in structured tables or lists.
- **1-Click `✨ Answer` Action Buttons**: Interactive `✨ Answer` buttons appear exclusively under assistant messages for 1-click prompt execution.

### Dual-Mode Speech-to-Text (STT) & Mozilla Firefox Support
- **Chrome / Edge**: Uses native Web Speech API `SpeechRecognition` for real-time live transcript streaming.
- **Mozilla Firefox / Cross-Browser Fallback**:
  - Automatically captures audio stream via `MediaRecorder` with live animated sound spectrum waves.
  - On stop, sends audio bytes to backend Whisper STT (`POST /api/v1/voice/transcribe` -> `Lumina-voice` `POST /voice/transcribe` via `faster-whisper`).
  - Automatically populates transcribed text into the prompt input box and submits the question.

### Clean Speech Synthesis (Multi-Engine Neural TTS)
- Click the speaker icon on any response or use Voice Mode to hear answers read aloud.
- **Ultra-Low Latency & High Fidelity**: Powered by Microsoft Edge Neural TTS primary synthesis delivering studio-quality natural voices in ~1.3 seconds, with seamless local Kokoro-82M and gTTS fallbacks.
- **Sub-Millisecond Caching**: In-memory LRU audio caching returns repeated answers, book summaries, and action confirmations in **under 6 milliseconds**.
- **Native Indic / Devanagari Narration**: Automatically detects Hindi and Sanskrit text and synthesizes authentic native pronunciation via `hi-IN-SwaraNeural`.
- **Text Normalization Filter**: Automatically strips page numbers (*"On Page 12"*), bracketed citations (`[1]`), table pipes (`|`), dashes, and markdown symbols for natural human speech without audio artifacts.

---

## 💡 6. Personalized Recommendations

### Setting Preferences
- Go to your **Profile** (`/profile`) and navigate to **Reading Preferences**.
- Tag your favorite genres, authors, and topics of interest.

### Receiving Recommendations
- Navigate to the **Recommendations** page (`/recommendations`).
- The 3-tier ML engine calculates TF-IDF cosine similarity across the library corpus and pairs it with your preference profile to surface personalized suggestions.

---

## 🎙️ 7. Voice AI Assistant (Hands-Free Interaction)

### Floating Voice Widget & Slide-Over Panel
- A persistent microphone widget floats at the bottom-right of every page.
- On book detail pages (`/books/[id]`), the widget automatically binds to that book's context.
- Click the widget or press the spacebar shortcut to open the slide-over **Voice Panel**.

### Spoken Commands & Actions
- **Book Q&A**: Ask *"What is this book about?"* or *"Summarize chapter 2"* to hear AI answers read aloud in natural voice.
- **Voice Actions**: Say *"Borrow this book"*, *"Return this book"*, or *"Leave a 5-star review: excellent explanation"*.
- **Confirmation Flow**: Destructive actions trigger a 30-second voice or click confirmation (*"Say confirm to proceed"*).
- **Voice Preferences & Previewing**:
  - Select among studio-quality neural voices: **Bella** (US Female), **Sarah** (US Female), **Adam** (US Male), **Emma** (UK Female), **George** (UK Male), or **Swara** (Hindi/Sanskrit Natural).
  - Adjust speech speed (0.5x–2.0x).
  - Test voice samples instantly with **`Test Active Voice`**.

---

## ⚙️ 8. System Administration (Admin Only)

### Dynamic App Settings (`/admin/config`)
1. **General Configurations (Top Section, Default Open)**: Search, edit, and add custom key-value configurations (`+ Add Config` button automatically hides when collapsed).
2. **LLM Provider Panel (Default Collapsed)**: Switch dynamically between Docker Model Runner, OpenRouter, Ollama, OpenAI, and Mock. Dropdown menu opens in an unclipped, scrollable overlay (`max-h-72 overflow-y-auto z-50`).
3. **Voice Assistant & Speech Settings Panel (Default Collapsed)**: Configure Kokoro TTS voice model, speech speed, auto-play, and smart disabled save button state management.

### User Management (`/admin/users`)
- View registered users, assign roles (Admin/User), block accounts, or delete user profiles.

### Observability & Telemetry (Grafana & Loki)
- Admins can click **Grafana** in the navigation bar to access live backend/frontend Loki logs via Edge Middleware SSO proxying.

---

## 🧪 Quick Verification Checklist

1. **Login & Password Reset**: Reset password to verify active sessions sign out and require fresh login.
2. **Profile Validation**: Verify profile picture persists on update and primary/secondary mobile numbers cannot be identical.
3. **Dashboard**: Verify search bar and bell icon are removed from user dashboard.
4. **AI Q&A (`/qa`)**:
   - Click "New Chat" without asking a question -> confirm empty draft is not saved in history.
   - Edit prompt -> confirm prompt replaces in-place and downstream responses update.
   - Click **Redo** on AI response -> confirm response regenerates in-place without prompt duplication.
   - Test Voice-to-Text in Mozilla Firefox -> confirm audio wave animation and Whisper STT auto-submission.
5. **PDF Reader**: Open `/books/[id]` and test 8 frame themes, thumbnail sidebar (`w-80`), and space-preserved text selection.
6. **App Settings**: Access `/admin/config` to manage LLM providers and voice parameters.
