# Kings Taxi — Transportation, Hotel & Tourism Platform

Kings Taxi is a premier multi-service mobility and tourism platform engineered for Ethiopia, initially serving Gondar City and expanding regionally. It unifies urban ride-hailing, verified hotel transport, historical heritage tours, and inter-city contract travel into a secure, cohesive ecosystem.

---

## 1. Monorepo Architecture & Directory Structure

```text
kings-taxi/
├── apps/
│   └── passenger-mobile/       # Expo SDK 52 / React Native 0.76 passenger mobile app (iOS & Android)
├── backend/                    # Central Node.js / Express / TypeScript Monolithic Backend
│   ├── prisma/                 # Prisma ORM schema, migrations, and database seeders
│   │   ├── schema.prisma       # Complete 10-domain relational entity model
│   │   └── migrations/         # Versioned SQL migration history
│   ├── src/
│   │   ├── config/             # Environment, CORS, database, and Swagger configuration
│   │   ├── core/               # Logging (Pino), error handling, rate limiting, and response envelopes
│   │   ├── modules/            # Autonomous domain modules
│   │   │   ├── auth/           # Multi-channel verification (Email & Telegram), Argon2id passwords
│   │   │   ├── passengers/     # Passenger profile and multi-device session management
│   │   │   ├── drivers/        # Driver verification, availability, and GPS tracking
│   │   │   ├── vehicles/       # Fleet management and vehicle category inspections
│   │   │   ├── bookings/       # Ride dispatching and tour contract reservations
│   │   │   ├── trips/          # Active trip progression, route polyline tracking, ratings
│   │   │   ├── payments/       # Multi-gateway payments (Telebirr, Chapa, CBE Birr, Cash)
│   │   │   ├── notifications/  # Push notifications (Expo/FCM) & localized alerts
│   │   │   ├── support/        # In-app tickets and Gondar emergency helpline routing
│   │   │   └── health/         # Operational health, liveness, and readiness probes
│   │   ├── routes/             # Central API v1 router mounting all modular endpoints
│   │   ├── app.ts              # Express application factory with security middleware
│   │   └── server.ts           # HTTP server listener and graceful shutdown coordinator
│   ├── tests/                  # Automated Vitest unit and integration test suite
│   └── docs/                   # Backend API and architectural documentation
├── shared/                     # Shared TypeScript interfaces, contracts, and constants
├── scripts/                    # Platform audit and cross-platform verification tooling
├── package.json                # Root workspace configuration
└── README.md
```

---

## 2. Central Backend Architecture

The backend is built as a **Modular Monolith** using Node.js, Express, TypeScript, and Prisma ORM targeting PostgreSQL.

- **API Base URL**: `http://localhost:5000/api/v1`
- **Interactive Documentation**: `http://localhost:5000/api/v1/docs` (Swagger OpenAPI 3.0)
- **Standardized Response Envelope**: Every endpoint returns `{ success, message, data, code, meta }`
- **Security Baseline**: Helmet security headers, CORS filtering, rate limiting (100 req/15min default), Pino structured logging, and request correlation IDs (`x-request-id`).

---

## 3. Database Architecture & Strict Security Rules

The Kings Taxi platform database runs on PostgreSQL 16 hosted within Docker on the production VPS (`196.188.250.186`).

### 3.1 Strict Security Boundaries

> [!CAUTION]
> **Database Security Rules — Non-Negotiable**:
> 1. **Zero Public Port Exposure**: PostgreSQL port 5432 is bound to internal VPS docker networks only. It is **never** published publicly to the Internet.
> 2. **Strict Environment Isolation**: Local development and testing must **never** connect to the production `kings_taxi` database.
> 3. **Erkab Platform Protection**: The existing `erkab` production database and its services sharing the host must remain completely untouched.
> 4. **No Destructive Operations**: Never run `prisma migrate reset` against production or staging databases.

### 3.2 Local Development via Secure SSH Tunnel

To connect your local development environment to the dedicated development database (`kings_taxi_dev`), establish an encrypted SSH tunnel mapping local port `5433` to the internal PostgreSQL container (`172.18.0.7:5432`):

```bash
# In an open terminal window on your local machine:
ssh -N -L 5433:172.18.0.7:5432 ambelu@196.188.250.186
```

Keep this tunnel active during local backend development.

### 3.3 Backend `.env` Database URL Configuration

```env
PORT=5000
NODE_ENV=development
API_PREFIX=/api/v1

# Development Database URL connecting via local SSH tunnel on port 5433
DATABASE_URL="postgresql://kings_taxi_dev_user:YOUR_DEV_PASSWORD@127.0.0.1:5433/kings_taxi_dev?schema=public"
```

---

## 4. Prisma Relational Schema & Domain Entities

The relational database architecture is defined in `backend/prisma/schema.prisma` and models all 10 platform domain entities:

1. **`Passenger`**: Verified passenger records, profile photos, ratings, language preferences.
2. **`PassengerAuthIdentity`**: Multi-channel authentication providers (`EMAIL`, `TELEGRAM`, `PHONE`).
3. **`OTPVerification`**: Ephemeral 6-digit verification codes with rate-limiting and expiration.
4. **`Driver`**: Onboarded drivers, national IDs, license verifications, availability status (`ONLINE`, `OFFLINE`, `BUSY`).
5. **`Vehicle`**: Vehicles with plate uniqueness, categories (`STANDARD_SEDAN`, `COMFORT_VAN`, `EXECUTIVE`, `MINIVAN_TOUR`), and inspection logs.
6. **`Booking`**: Ride requests, scheduled trips, hotel transports, and heritage tour reservations.
7. **`Trip`**: Active trip progression state machine, telematics coordinates, actual distance and duration, and passenger ratings.
8. **`Payment`**: Multi-gateway transactions (`TELEBIRR`, `CBE_BIRR`, `CHAPA`, `CASH`) with high-precision `@db.Decimal(10, 2)` monetary values and idempotency keys.
9. **`Notification`**: Push and in-app notifications with multilingual template support.
10. **`SupportRequest`**: In-app dispute tickets and Gondar dispatch helpline requests.
11. **`RefreshToken`**: Cryptographically hashed session tokens with device metadata and revocation tracking.
12. **`AuditLog`**: Tamper-evident operational audit trail.

---

## 5. Health & Operational Probes

| Endpoint | Method | Purpose | Response |
| :--- | :--- | :--- | :--- |
| `GET /api/v1/health` | `GET` | Service status, uptime, node environment | `200 OK` |
| `GET /api/v1/health/live` (or `/api/v1/live`) | `GET` | Docker & K8s liveness probe | `200 OK` |
| `GET /api/v1/health/ready` (or `/api/v1/ready`) | `GET` | Database readiness via active Prisma ping | `200 OK` (Healthy) / `503 Service Unavailable` |

---

## 6. Developer Commands

### Backend (`backend/`)

```bash
# Start backend in development mode with hot reload
npm run backend:dev

# Run TypeScript compilation and build production bundle
npm run backend:build

# Run automated tests (Unit & Integration)
npm run backend:test
npm run test:unit --prefix backend
npm run test:integration --prefix backend

# Prisma ORM workflows
npm run prisma:generate --prefix backend
npm run prisma:migrate --prefix backend
```

### Passenger Mobile Application (`apps/passenger-mobile/`)

```bash
# Start Expo development server
npm run mobile

# Run TypeScript typecheck on mobile app
npm run typecheck --workspace=apps/passenger-mobile

# Run cross-platform compatibility audit
node scripts/test-cross-platform-compatibility.js
```

---

## 7. License

Confidential and Proprietary. Copyright © 2026 Kings Taxi Transportation Platform. All Rights Reserved.
