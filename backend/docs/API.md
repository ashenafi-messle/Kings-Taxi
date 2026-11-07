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

### Readiness Probe Payload Example (Healthy)

```json
{
  "success": true,
  "message": "All service dependencies are ready and operational",
  "data": {
    "status": "healthy",
    "timestamp": "2026-11-07T16:10:44.123Z",
    "checks": {
      "database": {
        "status": "up",
        "latencyMs": 4.12
      }
    }
  },
  "error": null,
  "meta": { ... }
}
```

### Readiness Probe Payload Example (Database Down / Unreachable)

```json
{
  "success": false,
  "message": "One or more critical system dependencies (PostgreSQL) are currently offline or unreachable",
  "code": "DEPENDENCY_UNAVAILABLE",
  "data": null,
  "error": {
    "code": "DEPENDENCY_UNAVAILABLE",
    "message": "One or more critical system dependencies (PostgreSQL) are currently offline or unreachable",
    "details": {
      "database": {
        "status": "down",
        "latencyMs": 1002.5,
        "error": "Connection refused: 127.0.0.1:5433"
      }
    }
  },
  "meta": { ... }
}
```

---

## 3. Domain Modules & Operational Status Probes

All domain services are organized as self-contained feature modules under `backend/src/modules/` and expose status and domain endpoints:

| Endpoint | Module | Scope & Responsibilities |
| :--- | :--- | :--- |
| `GET /api/v1/auth/status` | `auth` | Multi-channel verification (Email & Telegram), Argon2id passwords, JWT rotation |
| `GET /api/v1/passengers/status` | `passengers` | Passenger profile management, photo/avatar, multi-device session control |
| `GET /api/v1/drivers/status` | `drivers` | Driver verification, documents, availability (ONLINE/OFFLINE), GPS pings |
| `GET /api/v1/vehicles/status` | `vehicles` | Vehicle registry, categories (Standard Sedan, Comfort Van, Tour Minivan), inspections |
| `GET /api/v1/bookings/status` | `bookings` | Ride request dispatch, state machine progression, Gondar heritage tours |
| `GET /api/v1/trips/status` | `trips` | Active trip telematics, route polyline tracking, passenger ratings & reviews |
| `GET /api/v1/payments/status` | `payments` | Multi-gateway checkout (Telebirr, Chapa, CBE Birr, Cash), signed webhooks |
| `GET /api/v1/notifications/status` | `notifications` | Push notification dispatch (Expo/FCM), multilingual alerts (Amharic/English) |
| `GET /api/v1/support/status` | `support` | In-app support tickets, trip dispute routing, Gondar emergency helpline |

---

## 4. Security & Compliance Headers

The backend applies enterprise security controls on all responses:
- **Helmet**: Disables MIME sniffing, enforces clickjacking prevention (`X-Frame-Options: SAMEORIGIN`), hides `X-Powered-By`.
- **Request Correlation ID**: Injects or echoes `x-request-id` header in both response headers and envelope `meta.requestId`.
- **CORS Filtering**: Strict origin validation against allowed frontend domains.
- **Rate Limiting**: Tiered IP rate limiting (100 req / 15 min default, with dedicated burst limits for OTP and auth).
- **Safe Error Shielding**: Uncaught internal server exceptions do not leak stack traces or internal server file paths in production.
