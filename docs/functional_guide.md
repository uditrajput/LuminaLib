# LuminaLib Functional Guide

Welcome to the LuminaLib functional guide. This document provides a walkthrough of the core features available in the platform and how to interact with them through the user interface.

---

## 🔐 1. Authentication & User Access

### Creating an Account
- Navigate to the **Signup** page.
- Requirements: A valid email and a strong password (minimum 12 characters, including mixed symbols/numbers).

### Logging In
- Navigate to the **Login** page.
- **Default Admin Credentials**:
  - **Email**: `udit.rajput@hotmail.com`
  - **Password**: `Admin@12345!`

### Profile Management
- Once logged in, click on the **Profile** icon in the navigation bar.
- Here you can update your personal details (Full Name, Bio) and security settings.

---

## 📚 2. Library Management (Books)

### Browsing the Collection
- The **Books** page displays a paginated list of all available books.
- You can see titles, authors, genres, and publication years at a glance.

### Uploading a Book (User/Admin)
- Click the **"Add New Book"** button.
- Provide the title, author, genre, and publication year.
- **File Upload**: Attach a PDF or Text file.
- On successful upload, the system starts an **Async AI Summary** task in the background.

### Borrowing and Returning
- Click on a book to view its details.
- If available, click **"Borrow Book"**.
- To return, navigate back to the book detail page and click **"Return Book"**.

---

## ⭐ 3. Feedback & Reviews

### Submitting a Review
- **Requirement**: You must have borrowed the book at least once.
- On the book detail page, scroll to the **Reviews** section.
- Provide a star rating (1-5) and your written feedback.
- **AI Sentiment**: The system automatically incorporates your review into a rolling "Review Consensus" summary for that book.

---

## 🤖 4. AI Intelligence Features

### AI Book Summaries
- Every ingested book gets an automatic AI-generated summary.
- View this on the book detail page to get a quick 5-point overview of the content.

### Document Ingestion & Q&A (RAG)
- Navigate to the **QA** section.
- You can upload documents specifically for semantic search.
- Once ingested, use the search bar to **"Ask anything about your library"**.
- The system will use the RAG (Retrieval-Augmented Generation) pipeline to give you context-grounded answers.

---

## 💡 5. Personalized Recommendations

### Setting Preferences
- Navigate to your **Profile** and look for the **"Reading Preferences"** section.
- Tag your favorite genres, authors, and keywords.

### Receiving Suggestions
- Navigate to the **Recommendations** page.
- The system uses a 3-tier ML engine to suggest books based on your preferences and the similarity of content in the library.

---

## ⚙️ 6. System Administration (Admin Only)

### App Settings Dashboard
- Accessible to users with the **Admin** role.
- **LLM Configuration**: Swap between providers like **OpenRouter**, **Ollama**, or **OpenAI**.
- **API Keys**: Manage your keys for external providers directly in the browser.
- **Recommendation Engine**: Switch between "Content-Based" and "ML-Model" strategies.

### Observability & Telemetry (Grafana)
- Admins have direct access to a **Grafana** link embedded right in their Navigation bar.
- Clicking the link seamlessly directs you to a pre-provisioned, secure SSO-proxied dashboard capturing live production frontend and backend logs injected natively via **Loki**.

---

## 🧪 Quick Verification Flow

If you have just installed the application, follow this flow to verify all components:
1. **Login** as the default admin.
2. **Setup AI**: Go to App Settings and ensure a valid LLM provider (like OpenRouter or OpenAI) is configured with an API key.
3. **Upload**: Add a small PDF book.
4. **Summary**: Wait 10 seconds and refresh the book detail page to see the AI summary.
5. **Review**: Borrow the book, then leave a 5-star review.
6. **Recommendation**: Set your preference to the genre of the book you just uploaded and check the Recommendations page.

---

## 📂 System Core Folder Structure
To understand where to look across the stack when referencing functionality:
- **`Lumina-backend/luminalib/api/v1/endpoints/`**: Holds all routing logic for User, Book, QA functionalities.
- **`Lumina-backend/luminalib/services/`**: Translates functional requirements to business logic actions (e.g., generating AI summaries via LLM factories).
- **`Lumina-frontend/src/app/`**: Reflects the user-facing URI hierarchy.
- **`Lumina-frontend/src/components/`**: Maps to visual blocks representing actions (like `BookCard`, `ReviewSubmitModal`).

---

## 🧪 Automated Integrated Test Scenarios Map
*LuminaLib verifies functionality comprehensively using internal tests mapped across domains:*
- **Backend Functional Tests (`pytest`)**:
  - `test_auth.py`: System registers, verifies profiles without duplication.
  - `test_books.py`/`test_reviews.py`: Confirms user constraints (must borrow before reviewing limits, borrow state tracks).
  - `test_ingestion_qa.py`: Asserts correct chunk-boundary operations.
- **Frontend Integrated Behaviors (`jest`)**:
  - Validates `ProfileContext` rendering conditional blocks successfully.
  - Strict UI testing checks API intercepts logic and UI responses (Modals closing on unauthenticated API `401` errors).
