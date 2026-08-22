# 📋 LuminaLib Product Requirements Document (PRD)

**Document Version:** 3.0  
**Status:** Approved for Implementation  
**Target Release:** Phase 3 — Enterprise RBAC, Multi-Tenant Libraries & Authentication Hardening  
**Target Audience:** Engineering, Product, Security & QA Teams  

---

## 1. Executive Summary & Vision

LuminaLib is evolving from a single-tenant library service into an **Enterprise Multi-Tenant Educational Platform**. This PRD specifies the functional, technical, and architectural requirements for six core platform expansions:

1. **Granular Role-Based Access Control (RBAC)**: A visual permissions management system modeled after the `Roles.png` UI layout, introducing the `Teacher` role, system defaults (`Admin`, `Teacher`, `User`), and custom role creation.
2. **Dual Library Access Model (Public vs. Private Libraries)**: Separation of globally available books (*Public Library*) from cohort-restricted titles (*Private / Institutional Library*), presented via a dual-tab catalog interface.
3. **Book Access Level Classification**: Upload modal controls enabling Admins and Teachers to classify books as Public or Private and bind them to specific cohorts upon upload.
4. **User Groups & Resource Entitlements**: Group-based access control allowing Admins and Teachers to create classes/departments, enroll users, and assign private library resources.
5. **SMTP Configuration, Domain Whitelisting & Account Approval**: Enterprise onboarding pipeline featuring SMTP server settings, domain whitelist restrictions (e.g. `@google.com, @hotmail.com`), double opt-in email verification, and Admin approval queues.
6. **Social Media OAuth 2.0 Integration**: Configurable Single Sign-On (SSO) for Google (Gmail), Microsoft (Hotmail/Outlook), and Facebook, with per-provider toggles on the Admin Config dashboard.

---

## 2. Feature Specification 1: Role-Based Access Control (RBAC)

### 2.1 Overview & UI Layout (Grounding `Roles.png`)
The `/admin/users` section will feature a top-level tab switcher:
- **Tab 1: 👥 Users Directory**: Existing user list table, search, role assignment dropdown, block/unblock, and pending approval review queue.
- **Tab 2: 🛡️ Roles & Permissions**: Visual RBAC matrix and role management dashboard modeled after `Roles.png`.

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ Users & Roles                                                                    │
│ Configure Role-Based Access Control (RBAC), user statuses, and permission tiers.   │
│                                           [ Users Directory ] [ Roles & Permissions ] │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Role Definitions
| Role | Type | Description | System Default |
|------|------|-------------|----------------|
| **Admin** | System Default | Full administrative access to all system features, user management, system configs, and RBAC matrix. | Yes (Immutable) |
| **Teacher** | System Default | Create & manage classes/groups, upload Public/Private books, assign private resources, view student Q&A analytics. | Yes |
| **User (Student / Member)** | System Default | Read Public books, access assigned Private books, use AI Q&A, write reviews, use Voice AI. | Yes |
| **Custom Roles** | User-Defined | Custom combinations of permission blocks created via `+ Create Custom Role` modal. | No |

### 2.3 Permissions Matrix Categories
Each role card displays a 2x3 or 2x4 grid of permission category checkboxes matching `Roles.png`:

1. 📊 **Dashboard & Analytics**: View main library metrics, system usage telemetry, and activity logs.
2. 📚 **Book Management & Upload**: Upload, edit, and delete Public and Private library books.
3. 👥 **User Groups & Classes**: Create cohorts, enroll students/teachers, and bind private library books.
4. 🤖 **AI Q&A & RAG Pipeline**: Ask questions against vector embeddings and request high-yield topic practice.
5. 🎙️ **Voice AI Assistant**: Access real-time voice agent, audio streaming, and voice command execution.
6. ⚙️ **Settings & App Config**: Modify system settings, SMTP, OAuth providers, and LLM backends.
7. 🔐 **Users & Roles (RBAC)**: Manage user profiles, assign roles, approve registrations, and define custom role matrices.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Teacher  [System Default]                                                       │
│ Create & manage classes/groups, upload books, assign private resources.         │
│                                                                                 │
│ PERMISSIONS MATRIX                                                              │
│  [✓] Dashboard & Analytics         [✓] Book Management & Upload                 │
│  [✓] User Groups & Classes         [✓] AI Q&A & RAG Pipeline                    │
│  [✓] Voice AI Assistant            [ ] Settings & App Config                    │
│  [ ] Users & Roles (RBAC)                                                       │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Feature Specification 2: Public vs. Private Library Model

### 3.1 Conceptual Model
- **Public Library (Global Catalog)**: Books uploaded with `access_level = "public"`. Accessible to all authenticated platform users.
- **Private Library (Institutional / Cohort Catalog)**: Books uploaded with `access_level = "private"`. Accessible ONLY to users enrolled in a `UserGroup` explicitly entitled to that book.

### 3.2 Dual-Tab Catalog Navigation (`/books`)
When a user belongs to one or more `UserGroup`s with private book entitlements, a dual-tab navigation header appears on the `/books` page:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Book Library                                                                    │
│ Browse, search, and read your digital collection.                               │
│                                                                                 │
│  [ 🌐 Public Library ]  [ 🔒 Private Library (3) ]                               │
└─────────────────────────────────────────────────────────────────────────────────┘
```

- **Tab 1: 🌐 Public Library** (Default): Displays all public books available to the entire community.
- **Tab 2: 🔒 Private Library**: Displays private books assigned to the logged-in user's groups (e.g. *CS101 Fall 2026*, *Research Division*), with a badge showing group affiliation.
- **Users without private group memberships**: The tab switcher is hidden and the user sees the standard Public Library catalog.

---

## 4. Feature Specification 3: Book Upload Access Selector

### 4.1 Upload Modal Integration (`BookUploadModal.tsx`)
When an Admin or Teacher opens the book upload modal:

1. **Access Level Dropdown**:
   - Field: `Access Level`
   - Options:
     - `🌐 Public Library` (Default selection)
     - `🔒 Private Library (Restricted Cohort Access)`
2. **Dynamic Group Entitlement Selector**:
   - When `Private Library` is selected, a multi-select dropdown **Assign to User Groups** expands:
     - Displays all active `UserGroup`s managed by or accessible to the uploader.
     - Allows selecting one or multiple groups (e.g., `[x] CS101 - Intro to AI`, `[x] Data Science Cohort B`).
3. **Backend Enforcement**:
   - Saves `access_level = "private"` in the `books` table.
   - Inserts mapping records into `book_group_entitlements (book_id, group_id)`.

---

## 5. Feature Specification 4: User Groups & Resource Entitlements

### 5.1 Cohort Architecture
Admins and Teachers can create and manage **User Groups**:
- **Attributes**: `id`, `name`, `description`, `created_by_user_id`, `created_at`.
- **Memberships (`group_members`)**: Maps `user_id` to `group_id` with `role_in_group` (`teacher` or `student`).
- **Resource Entitlements (`book_group_entitlements`)**: Maps `book_id` to `group_id`.

### 5.2 Enforcement Across Microservices
- **REST API (`GET /api/v1/books`)**: Filters `access_level = 'public' OR id IN (SELECT book_id FROM book_group_entitlements WHERE group_id IN (user_groups))`.
- **PDF Reader File Stream (`GET /api/v1/books/{id}/file`)**: Validates group membership before streaming PDF bytes.
- **Vector Search RAG (`POST /api/v1/qa`)**: Filters Q&A vector embeddings strictly by `book_id`s the user has authorization to read.

---

## 6. Feature Specification 5: SMTP, Domain Whitelisting & Account Approval

### 6.1 Admin Configuration Tab (`/admin/config` -> SMTP & Security Settings)

A dedicated **SMTP & Email Verification** configuration card will be added to `/admin/config`:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ✉️ SMTP & Account Security Settings                                              │
│ Configure outbound mail server, domain whitelist, and registration approvals.   │
│                                                                                 │
│ Enable Outbound SMTP Emailing: [ Toggle ON ]                                    │
│ SMTP Host: [ smtp.office365.com ]     SMTP Port: [ 587 ]                       │
│ SMTP Username: [ admin@luminalib.com ] SMTP Password: [ •••••••••••• ]          │
│ Encryption: (•) TLS  ( ) SSL  ( ) None                                          │
│ Sender Email: [ noreply@luminalib.com ] Sender Name: [ LuminaLib Library ]      │
│                                                                                 │
│ Allowed Email Domains Whitelist (comma-separated):                              │
│ [ @google.com, @hotmail.com, @outlook.com, @yahoo.com, @university.edu ]         │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Registration Domain Whitelist Validation
During signup (`POST /api/v1/auth/signup`):
1. Extract email domain (e.g. `@hotmail.com`).
2. Parse `allowed_email_domains` from `app_configs`.
3. If domain is not in the whitelist:
   - Reject registration immediately with HTTP 400: *"Registration is restricted to authorized email domains: @google.com, @hotmail.com, @outlook.com, @yahoo.com"*.

### 6.3 Double Opt-in & Admin Approval Workflow

```
[ User Signs Up ] ──► [ Status: UNVERIFIED ] ──► [ Send Email Verification Link ]
                                                              │
                                                              ▼
[ Account Activated ] ◄── [ Admin Approves ] ◄── [ Status: VERIFIED_PENDING_APPROVAL ]
```

1. **Signup**: Account created with `status = "unverified"`. A secure 64-character verification token is emailed to the user via SMTP.
2. **Email Verification**: User clicks link (`/auth/verify-email?token=...`). Status updates to `verified_pending_approval`.
3. **Admin Review Queue**: In `/admin/users`, a highlighted **Pending Approvals** tab displays new verified users.
4. **Admin Approval**: Admin clicks **Approve & Enable Access**. Status becomes `active`. Login attempts prior to Admin approval return HTTP 403: *"Your email is verified. Your account is currently under Admin review for access approval."*

---

## 7. Feature Specification 6: Social Media OAuth 2.0 Integration

### 7.1 Admin Config Panel (`/admin/config` -> Social Authentication)
Admins can independently toggle and configure Single Sign-On (SSO) providers:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 🌐 Social Media Authentication (OAuth 2.0)                                      │
│ Enable 1-click social sign-in for users.                                       │
│                                                                                 │
│ [✓] Google Sign-In (Gmail)                                                     │
│     Client ID: [ xxxxx.apps.googleusercontent.com ]                             │
│     Client Secret: [ ••••••••••••••••••••••• ]                                  │
│                                                                                 │
│ [✓] Microsoft Sign-In (Hotmail / Outlook)                                       │
│     Client ID: [ xxxxx-xxxx-xxxx ]                                              │
│     Client Secret: [ ••••••••••••••••••••••• ]                                  │
│                                                                                 │
│ [ ] Facebook Sign-In                                                            │
│     App ID: [ 123456789 ]                                                       │
│     App Secret: [ ••••••••••••••••••••••• ]                                     │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Login & Signup UI
On `/login` and `/signup`:
- Enabled social login buttons appear dynamically under an *"Or continue with"* divider:
  - `Google` (Gmail)
  - `Microsoft` (Hotmail / Outlook)
  - `Facebook`
- Social accounts automatically respect the domain whitelist and admin approval workflow policies.

---

## 8. Technical Architecture & Database Schema Extensions

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                               DATABASE SCHEMA EXTENSIONS                        │
├──────────────────────────────────────────────────────────────────────────────────┤
│  roles                      user_groups                group_members             │
│  ├── id (PK)                ├── id (PK)                ├── group_id (FK)         │
│  ├── name ("teacher", etc)  ├── name ("CS101")         ├── user_id (FK)          │
│  ├── is_system (bool)       ├── description            └── role_in_group         │
│  └── permissions_json       └── created_by (FK)                                  │
│                                                        book_group_entitlements   │
│  users (updated)            books (updated)            ├── book_id (FK)          │
│  ├── role_id (FK)           ├── access_level           └── group_id (FK)         │
│  ├── status                 │   ("public"/"private")                             │
│  └── email_verified (bool)  └── created_by (FK)                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 8.1 Database Migrations Table Definitions
```sql
-- 1. Roles & Permissions Table
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT FALSE,
    permissions_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. User Groups (Classes / Departments)
CREATE TABLE user_groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Group Memberships
CREATE TABLE group_members (
    group_id INTEGER REFERENCES user_groups(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role_in_group VARCHAR(20) DEFAULT 'student',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (group_id, user_id)
);

-- 4. Private Book Group Entitlements
CREATE TABLE book_group_entitlements (
    book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
    group_id INTEGER REFERENCES user_groups(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (book_id, group_id)
);
```

---

## 9. REST API Endpoint Specifications

| Module | Method | Endpoint | Access | Description |
|--------|--------|----------|--------|-------------|
| **RBAC** | `GET` | `/api/v1/roles` | All Auth | List all system & custom roles with permission matrices |
| **RBAC** | `POST` | `/api/v1/roles` | Admin | Create a new custom role with selected permissions |
| **RBAC** | `PUT` | `/api/v1/roles/{id}` | Admin | Update custom role permissions |
| **RBAC** | `DELETE` | `/api/v1/roles/{id}` | Admin | Delete custom role (system default roles protected) |
| **Groups** | `GET` | `/api/v1/groups` | Teacher/Admin | List user groups / classes |
| **Groups** | `POST` | `/api/v1/groups` | Teacher/Admin | Create a new user group / class |
| **Groups** | `POST` | `/api/v1/groups/{id}/members` | Teacher/Admin | Add users/teachers to a group |
| **Groups** | `POST` | `/api/v1/groups/{id}/books` | Teacher/Admin | Assign private books to a group |
| **Books** | `GET` | `/api/v1/books?catalog=public\|private` | All Auth | Filter catalog by Public vs. Private Library |
| **Auth** | `GET` | `/api/v1/auth/verify-email` | Public | Process double opt-in email verification token |
| **Auth** | `POST` | `/api/v1/auth/oauth/{provider}` | Public | Process OAuth 2.0 social login callback |

---

## 10. Acceptance Criteria & Verification

- [ ] **RBAC Matrix UI**: `/admin/users` displays `Users Directory` and `Roles & Permissions` tabs matching `Roles.png` layout.
- [ ] **Teacher Role**: `Teacher` system default role is created with book upload and class management permissions.
- [ ] **Dual Library Catalog**: Users with private group memberships see `Public Library` and `Private Library` tabs on `/books`.
- [ ] **Private Book Upload**: Upload modal contains `Access Level` (`Public`/`Private`) and group assignment selectors.
- [ ] **Domain Whitelist**: Signup rejects emails from domains not in `allowed_email_domains` (e.g. rejecting `@tempmail.com`).
- [ ] **SMTP & Approval Flow**: Signup sends email verification -> Token verification sets status to `VERIFIED_PENDING_APPROVAL` -> Admin approves user in `/admin/users` -> User transitions to `ACTIVE`.
- [ ] **Social Sign-In**: Admin can toggle Google, Microsoft, and Facebook sign-in on `/admin/config`. Enabled buttons render on `/login` and `/signup`.
