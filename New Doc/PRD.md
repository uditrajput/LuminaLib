# Product Requirements Document (PRD)

## LuminaLib — Real-Time Chat Module

**Version:** 1.0  
**Date:** 2026-08-10  
**Status:** Draft  
**Author:** Product Team  

---

## 1. Executive Summary

This PRD defines the complete real-time chat module for LuminaLib, enabling secure 1-on-1 messaging, admin-managed group conversations, system-wide broadcast capability, and granular admin controls over user chat privileges. All messages are protected with end-to-end encryption (E2EE), and the system supports industry-standard delivery and read receipts (double blue tick).

---

## 2. Goals & Objectives

| ID | Objective | Priority |
|---|---|---|
| G1 | Enable secure, real-time peer-to-peer and group messaging | P0 |
| G2 | Provide admin-exclusive tools: group creation, broadcast, and chat toggle | P0 |
| G3 | Guarantee message confidentiality via end-to-end encryption | P0 |
| G4 | Deliver reliable message status tracking (sent / delivered / read) | P0 |
| G5 | Ensure the module passes security and penetration testing before release | P0 |

---

## 3. Functional Requirements

### 3.1 One-on-One Messaging (Standard Chat)

| ID | Requirement | Acceptance Criteria |
|---|---|---|
| F1.1 | Users can initiate a chat with any other registered user. | Search by username/email; tap to open chat thread. |
| F1.2 | Users can send text messages (max 4,096 chars). | Input field + send button; message appears in thread. |
| F1.3 | Users can send media: images, documents (PDF, DOCX), and audio notes. | File picker integration; max file size 25 MB. |
| F1.4 | Users can reply to a specific message (threaded reply). | Swipe-to-reply or context menu; quoted message visible. |
| F1.5 | Users can forward messages to another user or group. | Forward icon; recipient picker; original sender metadata preserved. |
| F1.6 | Users can delete messages for themselves or for everyone within 15 minutes. | "Delete for me" (local) vs "Delete for everyone" (global); time limit enforced server-side. |
| F1.7 | Users can edit sent messages within 15 minutes. | Edit history not retained; "Edited" label appended. |
| F1.8 | Users can react to messages with emojis (6 default + full picker). | Reaction count aggregated; tap to view reactor list. |
| F1.9 | Users can copy, star/bookmark, and share message content. | Context menu options; starred messages view in settings. |
| F1.10 | Typing indicators are shown when the other party is composing a message. | "Typing…" status appears in header and conversation list. |
| F1.11 | Online / last-seen status is visible based on user privacy settings. | Green dot = online; timestamp = last seen; toggle in settings. |
| F1.12 | Push notifications for new messages when app is backgrounded. | Title = sender name; body = message preview (obeying privacy settings). |

### 3.2 Group Chat

| ID | Requirement | Acceptance Criteria |
|---|---|---|
| F2.1 | **Only Admins** can create groups. | "New Group" button visible exclusively to roles `admin` and `super_admin`. |
| F2.2 | Admin assigns a group name (max 100 chars) and optional group icon. | Validation rules enforced; default icon auto-generated from initials. |
| F2.3 | Admin selects initial members from the user directory (min 2, max 512). | Multi-select user list with search; selected count displayed. |
| F2.4 | Admin can add or remove members after creation. | Member management panel inside group info. |
| F2.5 | Admin can assign another member as co-admin or remove admin rights. | Role elevation requires confirmation modal; only one owner can exist. |
| F2.6 | Admin can delete the group; this action is irreversible and removes all messages. | Confirmation with typed group name; 7-day soft delete before permanent purge. |
| F2.7 | Members can voluntarily leave the group. | Leave button in group info; no rejoin without admin invite. |
| F2.8 | Group metadata (name, icon, description) can be edited by admin/co-admin. | Audit log entry created for every change. |
| F2.9 | Group messages support all standard options defined in F1.2–F1.9. | Feature parity with 1-on-1 chat. |
| F2.10 | Mention functionality (`@username`) triggers a notification for the mentioned user even if group is muted. | Parse `@` symbols; case-insensitive match; push notification sent. |

### 3.3 Admin Broadcast

| ID | Requirement | Acceptance Criteria |
|---|---|---|
| F3.1 | **Only Admins** can compose and send broadcast messages. | Dedicated "Broadcast" composer in admin dashboard. |
| F3.2 | Broadcast reaches **all registered users** simultaneously. | Single API call fans out to every active user record. |
| F3.3 | Broadcasts appear as a system-level thread labeled "Announcements" or admin-defined sender name. | Thread pinned to top of chat list; non-dismissible. |
| F3.4 | Broadcast supports text, media, and hyperlinks. | Same composer capabilities as standard chat. |
| F3.5 | Delivery and read receipts are aggregated and visible to the admin sender. | Dashboard view: Delivered X / Read Y out of Total Z. |
| F3.6 | Users cannot reply to a broadcast thread. | Reply input disabled; read-only interface. |
| F3.7 | Rate limiting: max 1 broadcast per admin per 5 minutes to prevent spam. | Server-side throttle enforced; error message displayed. |

### 3.4 Admin Chat Toggle (User Management)

| ID | Requirement | Acceptance Criteria |
|---|---|---|
| F4.1 | Admin can enable or disable chat functionality for any individual user from the User Management section. | Toggle switch per user row in admin panel. |
| F4.2 | When chat is **disabled** for a user: | |
| | a. The user cannot initiate new conversations. | "New Chat" button hidden/disabled; API returns `403 Forbidden`. |
| | b. The user cannot send messages in existing threads. | Composer disabled with banner: "Chat has been disabled by administrator." |
| | c. The user can still read historical messages. | Read-only access to inbox. |
| | d. Other users cannot send messages to the disabled user. | Sender sees error: "This user is currently unavailable for chat." |
| F4.3 | When chat is **re-enabled**, full functionality is restored instantly. | WebSocket event triggers UI state refresh. |
| F4.4 | A global audit log records every toggle action with admin ID, user ID, timestamp, and new state. | Immutable log entry; exportable CSV. |

### 3.5 Message Status & Read Receipts (Double Blue Tick)

| ID | Requirement | Acceptance Criteria |
|---|---|---|
| F5.1 | Every message transitions through four states: `sending` → `sent` (single grey tick) → `delivered` (double grey tick) → `read` (double blue tick). | Visual indicators match state exactly. |
| F5.2 | `sent`: Message has reached the server and been assigned a server timestamp. | Appears immediately after successful POST. |
| F5.3 | `delivered`: Message has been pushed to the recipient's device via WebSocket/FCM and the device has acknowledged receipt. | Tick turns grey ×2 when `delivery_ack` event received. |
| F5.5 | `read`: Recipient has opened the conversation and the message has entered the viewport. | Tick turns blue ×2; `read_receipt` event emitted. |
| F5.6 | Read receipts are **not** sent if the recipient has disabled read receipts in privacy settings. | Global toggle; if OFF, sender sees double grey tick only. |
| F5.7 | Group chat shows read receipt count (e.g., "Read by 5 of 8") instead of ticks. | Tap to expand list of readers with timestamps. |
| F5.8 | Read receipt timestamps are stored and viewable on long-press / info menu. | Modal displays exact read time per recipient. |

### 3.6 End-to-End Encryption (E2EE)

| ID | Requirement | Acceptance Criteria |
|---|---|---|
| F6.1 | All chat messages (1-on-1, group, and broadcast) are encrypted on the sender's device before transmission. | Plaintext never traverses the network or rests on the server. |
| F6.2 | The server stores only ciphertext; it cannot decrypt message contents. | Server-side unit tests assert no plaintext leakage in logs or DB. |
| F6.3 | Decryption occurs only on the recipient's authenticated device using their private key. | Private keys stored in secure enclave / Keychain / Keystore. |
| F6.4 | Key exchange uses the X3DH (Extended Triple Diffie-Hellman) protocol for 1-on-1 sessions. | Initial handshake generates shared secret; ephemeral keys rotated per message. |
| F6.5 | Group chats use Sender Keys (Signal Protocol) for efficient multi-recipient encryption. | Each member receives an encrypted sender key; message encryption uses symmetric key. |
| F6.6 | Device fingerprinting / safety numbers allow users to verify each other's identity and detect MITM. | QR code + numeric comparison in contact info screen. |
| F6.7 | Key rotation is triggered on demand or automatically every 30 days. | Old keys archived; new keys propagated via encrypted control messages. |
| F6.8 | If a user logs in from a new device, historical encrypted messages are **not** decryptable unless backup key is provided. | Forward secrecy maintained; no retroactive decryption by server. |

---

## 4. Non-Functional Requirements

| ID | Requirement | Target |
|---|---|---|
| NF1 | Message delivery latency (P99) | < 300 ms globally |
| NF2 | Media upload throughput | Min 5 Mbps effective |
| NF3 | Concurrent active chat sessions | 50,000+ per node |
| NF4 | Uptime SLA | 99.95% |
| NF5 | Encryption overhead | < 10% increase in payload size |
| NF6 | Client-side battery impact | < 3% per hour of active chat |
| NF7 | Accessibility | WCAG 2.1 AA compliant |

---

## 5. User Stories

**US-1:** As a student, I want to chat with my classmates so that I can discuss assignments securely.  
**US-2:** As an admin, I want to create subject-based groups so that I can organize class discussions.  
**US-3:** As an admin, I want to broadcast urgent announcements so that all users receive critical updates instantly.  
**US-4:** As an admin, I want to disable chat for a disruptive user so that I can maintain community standards without deleting their account.  
**US-5:** As a user, I want to see blue ticks so that I know my message was read.  
**US-6:** As a privacy-conscious user, I want E2EE so that even the platform cannot read my messages.  

---

## 6. Technical Architecture

### 6.1 High-Level Flow

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Client    │◄────►│  API Gateway │◄────►│  Chat WS    │
│  (E2EE)     │      │  (Auth/Z)    │      │   Server    │
└─────────────┘      └──────────────┘      └──────┬──────┘
                                                   │
                    ┌──────────────┐      ┌────────┴────────┐
                    │   Key Server │◄────►│  Message Store  │
                    │ (X3DH / SK)  │      │  (Ciphertext)   │
                    └──────────────┘      └─────────────────┘
```

### 6.2 Stack Recommendations

| Layer | Technology |
|---|---|
| Client | React Native / Flutter (mobile) + React (web) |
| E2EE Library | libsignal-client (Signal Protocol) |
| Real-Time Transport | WebSocket (primary) + Firebase Cloud Messaging (fallback push) |
| API Framework | Node.js (NestJS) or Go (Gin/Fiber) |
| Message Store | PostgreSQL (metadata) + MinIO/S3 (encrypted media) |
| Cache / Presence | Redis (online status, typing indicators) |
| Queue | RabbitMQ / Apache Kafka (broadcast fan-out) |

---

## 7. Data Models (Simplified)

### 7.1 Conversation

```json
{
  "id": "uuid",
  "type": "direct | group | broadcast",
  "participants": ["user_id[]"],
  "admin_ids": ["user_id[]"],
  "created_by": "user_id",
  "created_at": "timestamp",
  "updated_at": "timestamp",
  "is_active": "boolean",
  "encryption_session_id": "string"
}
```

### 7.2 Message (Server View — Ciphertext)

```json
{
  "id": "uuid",
  "conversation_id": "uuid",
  "sender_id": "user_id",
  "ciphertext_body": "base64",
  "media_url": "encrypted_url | null",
  "status": "sending | sent | delivered | read",
  "sent_at": "timestamp",
  "delivered_at": "timestamp | null",
  "read_at": "timestamp | null",
  "edited_at": "timestamp | null",
  "deleted_for_all": "boolean",
  "reply_to_id": "uuid | null"
}
```

### 7.3 User Chat Privilege

```json
{
  "user_id": "uuid",
  "chat_enabled": "boolean",
  "read_receipts_enabled": "boolean",
  "last_modified_by_admin_id": "uuid",
  "last_modified_at": "timestamp"
}
```

---

## 8. API Specification (Core Endpoints)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/conversations` | Admin | Create group |
| POST | `/api/v1/conversations/broadcast` | Admin | Send broadcast |
| GET | `/api/v1/conversations` | User | List my conversations |
| GET | `/api/v1/conversations/:id/messages` | User | Fetch message history |
| POST | `/api/v1/conversations/:id/messages` | User | Send message (ciphertext) |
| PATCH | `/api/v1/messages/:id/status` | User | Update status (delivered/read) |
| DELETE | `/api/v1/messages/:id` | User | Delete message |
| PATCH | `/api/v1/admin/users/:id/chat-toggle` | Admin | Enable/disable chat |
| GET | `/api/v1/keys/bundle/:userId` | User | Fetch pre-key bundle (X3DH) |
| POST | `/api/v1/keys/bundle` | User | Upload pre-key bundle |

---

## 9. Security Requirements

| ID | Control | Implementation |
|---|---|---|
| S1 | TLS 1.3 for all transport | Mandatory certificate pinning on mobile |
| S2 | E2EE for every message payload | Signal Protocol; no plaintext server access |
| S3 | Authentication | OAuth 2.0 + short-lived JWT (15 min) + refresh token rotation |
| S4 | Authorization | RBAC middleware (`user`, `admin`, `super_admin`) |
| S5 | Rate Limiting | 100 msg/min per user; 1 broadcast/5 min per admin |
| S6 | Input Sanitization | DOMPurify for text; AV scan for media metadata stripping |
| S7 | Audit Logging | Immutable append-only logs for admin actions (F4.4) |
| S8 | Key Integrity | Safety number verification UI; alert on key change |
| S9 | Secure Storage | Private keys in iOS Keychain / Android Keystore / Web Crypto subtle |
| S10 | Media Encryption | AES-256-GCM for files at rest; pre-signed URLs with expiry |

---

## 10. Secure Testing Strategy

### 10.1 Automated Security Testing (CI/CD Gates)

| Test Suite | Tool | Scope | Gate |
|---|---|---|---|
| Static Application Security Testing (SAST) | Semgrep, SonarQube | Source code | Block merge on `HIGH`+ findings |
| Software Composition Analysis (SCA) | Snyk, OWASP Dependency-Check | Third-party libs | Block merge on known CVEs |
| Secret Scanning | GitLeaks, TruffleHog | Commits / configs | Block merge on leaked secrets |
| Unit Tests (Crypto) | Jest / pytest | E2EE key exchange, encryption/decryption rounds | 100% pass required |
| Fuzz Testing | AFL / libFuzzer | Message parser, ciphertext decoder | Zero crashes in 1M iterations |

### 10.2 Manual / Penetration Testing

| Phase | Activity | Owner | Deliverable |
|---|---|---|---|
| PT-1 | Network penetration test (OWASP ASVS Level 2) | External vendor | Report + remediation tracker |
| PT-2 | Cryptographic review (E2EE implementation audit) | External crypto auditor | Formal audit letter |
| PT-3 | Mobile app reverse engineering & tampering | Red team | Resilience assessment |
| PT-4 | Admin privilege escalation attempts | QA Security | No unauthorized group creation or broadcast |
| PT-5 | Message interception & server DB dump analysis | Red team | Confirm ciphertext only; no plaintext leakage |

### 10.3 Functional Security Test Cases

| TC-ID | Scenario | Expected Result |
|---|---|---|
| SEC-01 | Attempt to create group as non-admin user | `403 Forbidden`; audit log entry created |
| SEC-02 | Attempt to send broadcast as non-admin user | `403 Forbidden` |
| SEC-03 | Attempt to disable chat for admin by lower-privilege admin | `403 Forbidden` (if RBAC hierarchy enforced) |
| SEC-04 | Intercept WebSocket traffic via proxy | Ciphertext only; no plaintext message body |
| SEC-05 | Extract local database from rooted device | Ciphertext messages; private key encrypted with device credential |
| SEC-06 | Replay old `read_receipt` event | Rejected due to timestamp + nonce validation |
| SEC-07 | Send oversized payload (>25 MB media) | `413 Payload Too Large`; connection not dropped |
| SEC-08 | SQL injection in search field | Parameterized query blocks attack; logged as security event |
| SEC-09 | XSS via message content | Output encoding / CSP prevents execution |
| SEC-10 | Brute-force key ID enumeration | Rate limit triggers; account lockout after 10 failures |

### 10.4 Compliance & Privacy

- **GDPR:** Right to data portability (export encrypted chat backup); right to erasure (secure wipe of keys renders history inaccessible).  
- **SOC 2 Type II:** Audit trails for all admin actions.  
- **OWASP MASVS:** Level 2 (Defense-in-Depth) compliance for mobile clients.

---

## 11. Implementation Phases

| Phase | Duration | Deliverables |
|---|---|---|
| **Phase 1: Foundation** | 2 weeks | WebSocket infra, conversation & message APIs, PostgreSQL schema |
| **Phase 2: E2EE Core** | 3 weeks | Signal Protocol integration, key server, client crypto layer |
| **Phase 3: Standard Chat** | 2 weeks | 1-on-1 messaging, media, replies, reactions, typing indicators |
| **Phase 4: Group & Broadcast** | 2 weeks | Admin group creation, member management, broadcast fan-out |
| **Phase 5: Admin Controls** | 1 week | Chat toggle, user management integration, audit logging |
| **Phase 6: Read Receipts** | 1 week | Status pipeline, blue tick UI, privacy toggle |
| **Phase 7: Secure Testing** | 2 weeks | SAST/SCA integration, penetration test, crypto audit, remediation |
| **Phase 8: Hardening & Release** | 1 week | Performance tuning, bug fixes, production rollout |

---

## 12. Success Metrics (KPIs)

| Metric | Target |
|---|---|
| Message delivery success rate | > 99.9% |
| Median E2EE handshake time | < 500 ms |
| Broadcast latency (P99) | < 5 seconds for 10k users |
| Security test pass rate | 100% (P0 blockers = 0) |
| User-reported chat issues | < 0.5% of DAUs within 30 days of launch |

---

## 13. Open Questions / Risks

| Risk | Mitigation |
|---|---|
| Key loss leading to unrecoverable history | Optional encrypted cloud backup with user-managed passphrase |
| High broadcast fan-out cost | Implement chunked fan-out via message queue; monitor infra cost |
| Regulatory pressure to decrypt | Legal hold process operates on metadata only; content remains inaccessible |

---

## 14. Appendix

- **A:** Wireframes / UI Mockups *(linked separately)*  
- **B:** Signal Protocol Specification *(https://signal.org/docs/)*  
- **C:** OWASP ASVS 4.0 Checklist *(linked separately)*  

---

**End of Document**
