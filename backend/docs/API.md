# Kings Taxi — Central Backend API Specification

**API Version:** `v1`  
**Base URL:** `http://localhost:5000/api/v1` (Production: `https://api.kingstaxi.et/api/v1`)  
**Swagger UI:** `http://localhost:5000/api/v1/docs`  
**OpenAPI Spec:** `http://localhost:5000/api/v1/docs.json`

---

## 1. Unified Response Envelope Standard

Every HTTP response returned by the Kings Taxi Central Backend adheres strictly to the unified envelope specification.

### 1.1 Success Response (`HTTP 200..299`)

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... },
  "error": null,
  "meta": {
    "timestamp": "2026-11-07T16:10:44.123Z",
    "requestId": "req_8f1c4e2b",
    "version": "1.0.0"
  }
}
```

### 1.2 Error Response (`HTTP 400..599`)

```json
{
  "success": false,
  "message": "Resource not found: GET /api/v1/unknown",
  "code": "NOT_FOUND",
  "data": null,
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found: GET /api/v1/unknown",
    "details": null
  },
  "meta": {
    "timestamp": "2026-11-07T16:10:44.123Z",
    "requestId": "req_8f1c4e2b",
    "version": "1.0.0"
  }
}
```

---

## 2. Operational Health & Probes

| Endpoint | Method | Purpose | Response Code | Description |
| :--- | :--- | :--- | :--- | :--- |
| `/api/v1/health` | `GET` | Service Summary | `200` | Process uptime, environment, version, memory |
| `/api/v1/health/live` | `GET` | Container Liveness | `200` | Lightweight ping for Docker/Kubernetes probe |
| `/api/v1/live` | `GET` | Liveness Shortcut | `200` | Direct alias for container liveness |
| `/api/v1/health/ready` | `GET` | Service Readiness | `200` / `503` | Active Prisma PostgreSQL query latency test |
| `/api/v1/ready` | `GET` | Readiness Shortcut | `200` / `503` | Direct alias for infrastructure readiness |

---

## 3. Authentication & Multi-Channel OTP Endpoints (Phase 2)

All authentication endpoints are mounted under `/api/v1/auth` and protected by a dedicated rate limiter (30 requests per 15 minutes).

### 3.1 Registration Endpoints

| Endpoint | Method | Body Payload | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/auth/register/initiate` | `POST` | `{ "method": "email" \| "telegram", "identifier": "user@example.com", "fullName": "Dawit Haile" }` | Initiates registration session, validates unique identity, and dispatches 6-digit OTP |
| `/api/v1/auth/register/resend-otp` | `POST` | `{ "sessionId": "reg_..." }` | Generates a fresh OTP subject to a 60-second cooldown timer |
| `/api/v1/auth/register/verify-otp` | `POST` | `{ "sessionId": "reg_...", "code": "123456" }` | Verifies OTP against salt hash. On success, returns `registrationToken` |
| `/api/v1/auth/register/complete` | `POST` | `{ "sessionId": "reg_...", "registrationToken": "tok_...", "password": "Password123!" }` | Sets salted password hash, creates database records, and returns JWT session |

### 3.2 Login & Session Endpoints

| Endpoint | Method | Body Payload / Headers | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/auth/login` | `POST` | `{ "identifier": "user@example.com", "password": "Password123!" }` | Authenticates passenger credentials and returns JWT access + rotating refresh token |
| `/api/v1/auth/refresh` | `POST` | `{ "refreshToken": "rt_..." }` | Rotates refresh token pair and issues a new 15-minute access token |
| `/api/v1/auth/logout` | `POST` | `Authorization: Bearer <token>`, `{ "refreshToken": "rt_..." }` | Revokes the current refresh token and terminates the active session |
| `/api/v1/auth/me` | `GET` | `Authorization: Bearer <token>` | Returns the verified `PassengerProfile` for the authenticated passenger |

### 3.3 Password Recovery Endpoints

| Endpoint | Method | Body Payload | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/auth/recovery/initiate` | `POST` | `{ "method": "email" \| "telegram", "identifier": "user@example.com" }` | Verifies account existence and sends a recovery OTP |
| `/api/v1/auth/recovery/resend-otp` | `POST` | `{ "sessionId": "rec_..." }` | Resends recovery OTP after 60s cooldown |
| `/api/v1/auth/recovery/verify-otp` | `POST` | `{ "sessionId": "rec_...", "code": "123456" }` | Verifies OTP and returns `recoveryToken` |
| `/api/v1/auth/recovery/reset` | `POST` | `{ "sessionId": "rec_...", "recoveryToken": "rec_tok_...", "newPassword": "NewPassword123!" }` | Updates passenger password hash and revokes prior refresh tokens |

### 3.4 Telegram Bot Handshake

| Endpoint | Method | Body Payload | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/auth/telegram/verify` | `POST` | `{ "challenge": "kt_...", "telegramUser": { ... } }` | Validates Telegram deep link challenge |

---

## 4. Domain Modules Status Endpoints

| Endpoint | Module | Scope & Responsibilities |
| :--- | :--- | :--- |
| `GET /api/v1/auth/status` | `auth` | Operational status of the authentication and session module |
| `GET /api/v1/passengers/status` | `passengers` | Passenger profile management, photo/avatar, multi-device session control |
| `GET /api/v1/drivers/status` | `drivers` | Driver verification, documents, availability (ONLINE/OFFLINE), GPS pings |
| `GET /api/v1/vehicles/status` | `vehicles` | Vehicle registry, categories (Standard Sedan, Comfort Van, Tour Minivan), inspections |
| `GET /api/v1/bookings/status` | `bookings` | Ride request dispatch, state machine progression, Gondar heritage tours |
| `GET /api/v1/trips/status` | `trips` | Active trip telematics, route polyline tracking, passenger ratings & reviews |
| `GET /api/v1/payments/status` | `payments` | Multi-gateway checkout (Telebirr, Chapa, CBE Birr, Cash), signed webhooks |
| `GET /api/v1/notifications/status` | `notifications` | Push notification dispatch (Expo/FCM), multilingual alerts (Amharic/English) |
| `GET /api/v1/support/status` | `support` | In-app support tickets, trip dispute routing, Gondar emergency helpline |

---

## 5. Security & Compliance Controls

- **Helmet**: Enforces CSP, X-Frame-Options (clickjacking), disables MIME sniffing, hides X-Powered-By.
- **Request Correlation ID**: Injects or echoes `x-request-id` header in responses and metadata.
- **CORS Filtering**: Strict origin validation against allowed frontend domains.
- **Tiered Rate Limiting**: Global rate limiting (100 req / 15 min) and dedicated auth limiting (30 req / 15 min).
- **Safe Error Shielding**: Uncaught internal server exceptions do not leak stack traces or internal server file paths in production.
- **Cryptographic Hashing**: Salted Scrypt/Argon2id password hashing and SHA-256 HMAC OTP verification.
