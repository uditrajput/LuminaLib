# 🛡️ LuminaLib Security Audit & Vulnerability Remediation Report

**Document Version:** 3.0 (Enterprise Multi-Tenant Security Audit)  
**Classification:** Internal Confidential / Security Baseline  
**Date:** 2026-08-10  
**Scope:** RBAC Engine, Private Resource Isolation, SMTP Auth, Domain Whitelisting & Social OAuth 2.0  

---

## 1. Executive Summary

As LuminaLib expands into a multi-tenant platform with Role-Based Access Control (RBAC), Private Library resource entitlements, email verification, domain restrictions, and Social Media Sign-On, a comprehensive security audit was conducted. 

This document details threat modeling, vulnerability assessments, security controls, risk matrices, and remediation protocols designed to safeguard platform assets against unauthorized access, privilege escalation, data leakage, and authentication bypasses.

---

## 2. Threat Matrix & Risk Ratings

| ID | Vulnerability / Threat | Severity | Component | Risk Summary | Mitigation & Remediation Strategy |
|----|------------------------|----------|-----------|--------------|-----------------------------------|
| **SEC-001** | Unauthorized Access to Private Library Books | Critical | Backend API / RAG | Users bypassing group membership to read or query Private books. | Enforce server-side SQL group entitlement checks in `/books`, PDF stream, and RAG vector filters. |
| **SEC-002** | RBAC Privilege Escalation via API Manipulation | Critical | Auth / Middleware | Users modifying their `role_id` or crafting arbitrary permissions. | Server-side JWT claim verification; immutable system default roles (`Admin`, `Teacher`). |
| **SEC-003** | Domain Whitelist Bypass via Alias/Subdomain | High | Signup API | Bypassing domain whitelist via tricks like `user@sub.google.com` or unicode. | Strict regex domain normalization against exact whitelist (`@google.com, @hotmail.com`). |
| **SEC-004** | Email Verification Token Forgery / Tampering | High | Auth / SMTP | Guessing or tampering verification tokens to bypass email verification. | Cryptographically secure 256-bit random tokens stored hashed with 24-hour expiration TTL. |
| **SEC-005** | Unapproved Account Login Bypass | High | Auth / OAuth | Social OAuth sign-in bypassing Admin approval workflow. | Route new OAuth users through `VERIFIED_PENDING_APPROVAL` status before granting JWT access. |
| **SEC-006** | OAuth 2.0 CSRF / State Parameter Hijacking | High | Social Auth | Replay attack during Google/Microsoft/Facebook OAuth callback. | Mandatory cryptographically signed OAuth `state` parameter bound to user session. |
| **SEC-007** | SMTP Password Leakage in Logs / Config API | Medium | Admin Config | Plaintext SMTP passwords exposed in logs or `GET /api/v1/config`. | Redact secrets in API responses (`••••••••`), encrypt at rest with AES-GCM. |
| **SEC-008** | Group Resource Entitlement Race Condition | Medium | Group Service | Concurrent member removal vs. active PDF stream read. | Re-validate token and group membership on every page chunk request. |

---

## 3. Security Control Specifications

### 3.1 Role-Based Access Control (RBAC) Hardening
- **Immutable Admin Boundaries**: The `Admin` role (`id=1`) is immutable. Permissions cannot be removed from `Admin` via API or UI.
- **Granular Permission Checks**: FastAPI endpoints use `@require_permission("books:upload")` decorators rather than hardcoded role string comparisons.
- **Matrix Integrity**: Custom role creation validates that custom roles cannot grant permissions higher than the creator's role level.

```python
# FastAPI Permission Decorator Pattern
def require_permission(permission_key: str):
    async def dependency(current_user: User = Depends(get_current_user)):
        if not current_user.has_permission(permission_key):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Missing required permission '{permission_key}'"
            )
        return current_user
    return dependency
```

### 3.2 Private Library Resource Isolation
- **Dual-Layer Filtering**:
  1. **Metadata Level**: `GET /api/v1/books` appends SQL subquery verifying `access_level = 'public' OR id IN (SELECT book_id FROM book_group_entitlements WHERE group_id IN (...))`.
  2. **Vector RAG Level**: Vector similarity search in `/qa` forces `book_id` filtering against authorized books only, preventing vector embedding cross-leakage across cohorts.

```sql
-- RAG Vector Search Isolation Query
SELECT id, document_id, content, embedding <-> :query_vector AS distance
FROM document_chunks
WHERE book_id IN (
    SELECT b.id FROM books b
    WHERE b.access_level = 'public'
       OR b.id IN (
           SELECT e.book_id FROM book_group_entitlements e
           JOIN group_members m ON e.group_id = m.group_id
           WHERE m.user_id = :requesting_user_id
       )
)
ORDER BY distance ASC
LIMIT 5;
```

### 3.3 Registration Whitelist & Account Verification Pipeline
- **Strict Domain Whitelisting**:
  - `allowed_email_domains` parsed as normalized lowercase domain suffixes.
  - Rejects disposable email providers (`@tempmail.com`, `@guerrillamail.com`).
- **Account State Machine**:
  ```
  [ REGISTERED ] ──(Email Token)──► [ VERIFIED_PENDING_APPROVAL ] ──(Admin Review)──► [ ACTIVE ]
  ```
- **Login Blockade**: Non-`active` statuses (`unverified`, `verified_pending_approval`, `blocked`) are blocked at `POST /api/v1/auth/login` and OAuth callback handlers with HTTP 403 response.

### 3.4 Social Authentication (OAuth 2.0 / OIDC) Security
- **Per-Provider Admin Controls**: OAuth providers (Google, Microsoft, Facebook) are disabled by default until explicitly enabled by Admin in `/admin/config`.
- **State Validation**: Uses HMAC-SHA256 signed `state` parameters containing timestamp and nonce to prevent CSRF attacks.
- **Account Linking Safety**: Social email addresses must match allowed domain whitelist rules before account provisioning.

### 3.5 Voice AI & Streaming Speech Security Controls
- **WebSocket Subprotocol Authentication (`CRIT-001`)**: Real-time audio sockets (`/voice/ws/{book_id}`) require client token passing via RFC 6455 subprotocols (`Sec-WebSocket-Protocol: voice-v1, jwt-<token>`). Tokens are validated prior to connection acceptance (`websocket.accept()`).
- **Input Bounds & Denial-of-Service Defense**: REST endpoints (`POST /voice/tts`, `POST /api/v1/voice/tts`) enforce strict payload bounds (up to 10,000 characters via Pydantic `TTSGenerateRequest`), rejecting oversized buffer exhaustion attempts with HTTP 422.
- **Audio File Header Magic Byte Validation (`MED-002`)**: Audio chunk uploads verify standard container headers (RIFF/WAV, WebM, OGG, FLAC) before routing to Whisper STT, discarding rogue executable binaries.
- **JWT Log Scrubbing (`HIGH-004`)**: Logging formatters across `lumina-voice` and `luminalib-backend` automatically redact Bearer tokens, Authorization headers, and raw session tokens.

---

## 4. Action Item Tracker & Sign-Off

| ID | Finding | Severity | Owner | Target Milestone | Status |
|----|---------|----------|-------|------------------|--------|
| **A1** | SEC-001: Private Library RAG Leakage | Critical | AI/Backend Team | Phase 3 — Sprint 1 | 🟢 Planned |
| **A2** | SEC-002: RBAC Matrix Privilege Checking | Critical | Backend Team | Phase 3 — Sprint 1 | 🟢 Planned |
| **A3** | SEC-003: Email Domain Whitelist Normalization | High | Auth Team | Phase 3 — Sprint 2 | 🟢 Planned |
| **A4** | SEC-004: SMTP Verification Token Hashing | High | DevOps/Backend | Phase 3 — Sprint 2 | 🟢 Planned |
| **A5** | SEC-005: Social OAuth Approval Interceptor | High | Auth Team | Phase 3 — Sprint 3 | 🟢 Planned |
| **A6** | SEC-006: OAuth State CSRF Protection | High | Auth/Frontend | Phase 3 — Sprint 3 | 🟢 Planned |
| **A7** | SEC-007: SMTP Secret Encryption at Rest | Medium | Security Team | Phase 3 — Sprint 2 | 🟢 Planned |
| **A8** | CRIT-001: Voice WebSocket Subprotocol Auth | Critical | Voice/Sec Team | Phase 2 — Sprint 4 | ✅ Remediated |
| **A9** | MED-002: Audio Container Magic Byte Validation | Medium | Voice Team | Phase 2 — Sprint 4 | ✅ Remediated |

---

## 5. Compliance & Security Verification Checklist

- [ ] Penetration test against RBAC permissions matrix endpoints.
- [ ] Verify private PDF file streaming returns HTTP 403 for non-group users.
- [ ] Confirm vector search in RAG `/qa` does not return private chunk text to unauthorized users.
- [ ] Test registration with unapproved domain (e.g., `@invalid-domain.com`) returns HTTP 400.
- [ ] Verify user with `verified_pending_approval` status cannot log in until Admin approves.
- [ ] Confirm OAuth 2.0 social sign-in credentials are encrypted in PostgreSQL.
- [x] Confirm WebSocket audio streaming rejects connections without valid subprotocol JWT tokens.
- [x] Confirm audio synthesis payloads exceeding 10,000 characters are rejected with HTTP 422.
- [x] Confirm JWT Bearer tokens are scrubbed from Loki log aggregations.
