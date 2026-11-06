# Kings Taxi Central Backend — Local Development Guide

## 1. Overview

The Kings Taxi Central Backend is a modular monolithic REST and real-time backend constructed with Node.js LTS, TypeScript, Express, Prisma ORM, and PostgreSQL. It serves as the single source of truth for the Passenger Mobile App, Driver Mobile App, and Super Admin portal.

---

## 2. Prerequisites

- **Node.js**: v20 LTS or v22 LTS (Verified on v24)
- **npm**: v10+
- **PostgreSQL**: v14+ (Local instance or Docker container)

---

## 3. Quick Start

### Step 1: Install Dependencies
From the repository root:
```bash
npm install
```

### Step 2: Environment Configuration
Navigate to the `backend/` directory and create `.env`:
```bash
cd backend
cp .env.example .env
```

Ensure `.env` contains valid values for local development:
```env
NODE_ENV=development
PORT=3000
API_PREFIX=/api/v1
LOG_LEVEL=info
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/kings_taxi_db?schema=public"
JWT_ACCESS_SECRET="a_very_secure_cryptographic_secret_key_minimum_32_characters_long"
JWT_REFRESH_SECRET="another_different_cryptographic_secret_key_minimum_32_chars"
CORS_ORIGINS="*"
```

### Step 3: Run Database Migrations
Generate the Prisma Client:
```bash
npm run prisma:generate --workspace=backend
```

Apply migrations to your local PostgreSQL instance:
```bash
npx prisma migrate dev --name init
```
*(Alternatively, for local rapid prototyping: `npx prisma db push`)*

### Step 4: Start the Development Server
From the root workspace:
```bash
npm run backend:dev
```
Or directly from `backend/`:
```bash
cd backend
npm run dev
```

The server starts on:
- API Root: `http://localhost:3000/api/v1`
- Swagger Documentation: `http://localhost:3000/api/v1/docs`
- Health Probe: `http://localhost:3000/api/v1/health`
- Readiness Probe: `http://localhost:3000/api/v1/health/ready`

---

## 4. Running Automated Tests

Run the Vitest unit and integration test suite:
```bash
npm run backend:test
```
*(Or inside `backend`: `npm test`)*

The test suite automatically loads `backend/.env.test` and verifies:
- Environment variable validation & secret redaction
- Standard `ApiResponse` envelope formatting
- Error hierarchies and central error handling
- Helmet security headers and `x-request-id` tracking
- Health liveness (`GET /api/v1/health/live`)
- Health readiness dependency verification (`GET /api/v1/health/ready`)
- OpenAPI Swagger contract (`GET /api/v1/docs.json`)

---

## 5. Mobile Device Integration (Physical Device Testing)

When testing the passenger mobile app on a physical Android or iOS device:
1. Ensure both your development computer and phone are connected to the same Wi-Fi network.
2. Find your computer's local IP address (`ipconfig` on Windows or `ifconfig` on macOS/Linux), e.g. `192.168.1.150`.
3. Set `EXPO_PUBLIC_API_URL=http://192.168.1.150:3000/api/v1` in `apps/passenger-mobile/.env`.
4. The passenger app will communicate with the backend running on your development workstation.

