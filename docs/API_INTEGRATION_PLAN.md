# Kings Taxi — Backend API Integration Plan

## 1. Overview & Strategy

The Kings Taxi passenger mobile application is built "API-Ready." During Phases 1 through 9, all data queries and mutations execute against a deterministic, high-fidelity mock service layer. This ensures lightning-fast frontend development while maintaining 100% architectural compatibility with the planned centralized REST and WebSocket backend.

---

## 2. API Conventions & Standards

- **Base URL**: `https://api.kingstaxi.et/v1` (configurable via `EXPO_PUBLIC_API_URL`)
- **Protocol**: HTTPS / TLS 1.3
- **Content Type**: `application/json`
- **Authentication**: Bearer Token (`Authorization: Bearer <accessToken>`)
- **Idempotency**: `Idempotency-Key: <UUIDv4>` header on all booking and payment POST endpoints.
- **Envelope Standard**:
```json
{
  "success": true,
  "data": {},
  "error": null,
  "meta": {
    "timestamp": "2026-11-02T19:00:00Z",
    "requestId": "req_84928174"
  }
}
```

---

## 3. Core REST Endpoints Specification

### 3.1 Authentication & Profile
- `POST /auth/register` — Register passenger with phone number, full name, and password.
- `POST /auth/login` — Authenticate and receive `accessToken` and `refreshToken`.
- `POST /auth/otp/send` — Request SMS or Telegram verification code.
- `POST /auth/otp/verify` — Validate OTP token.
- `POST /auth/refresh` — Rotate expired access token using refresh token.
- `GET /passenger/me` — Retrieve active passenger profile and preferences.
- `PATCH /passenger/me` — Update passenger profile, saved addresses, or language.

### 3.2 Ride-Hailing Service
- `POST /rides/estimate` — Calculate estimated distance, duration, and fare across vehicle classes.
- `POST /rides/request` — Dispatch ride booking request.
- `GET /rides/active` — Retrieve current active ride state and driver position.
- `POST /rides/:id/cancel` — Cancel active ride with cancellation reason code.
- `POST /rides/:id/rate` — Submit driver rating and feedback.
- `GET /rides/history` — Paginated history of passenger rides.

### 3.3 Hotel Reservations
- `GET /hotels` — Search hotels by destination city, dates, and guest count.
- `GET /hotels/:id` — Detailed hotel data, room inventory, photos, policies.
- `POST /hotels/reservations` — Create hotel reservation draft and acquire booking quote.
- `GET /hotels/reservations/:id` — View reservation confirmation and check-in voucher.

### 3.4 Heritage & Tourism Tours
- `GET /heritage` — List of historical and cultural destinations.
- `GET /heritage/:id` — Heritage site background, entry hours, and guidelines.
- `POST /tours/contract/quote` — Submit multi-destination itinerary to generate custom full-contract quotation.
- `POST /tours/contract/book` — Confirm full-contract transportation booking.

### 3.5 Payments
- `POST /payments/initiate` — Generate payment intent for Telebirr, Chapa, CBE Birr, or Cash.
- `GET /payments/:transactionId/status` — Query backend-verified payment confirmation.
- `GET /payments/receipt/:transactionId` — Fetch digital receipt and itemized tax invoice.

---

## 4. WebSocket Real-Time Telematics (Socket.IO)

- **Namespace**: `/rides/telematics`
- **Events Emitted by Client**:
  - `join_trip_room`: `{ tripId: string }`
  - `passenger_location_ping`: `{ lat: number, lng: number }`
- **Events Listened by Client**:
  - `driver_assigned`: `{ driverId, name, phone, vehicle, rating }`
  - `driver_location_update`: `{ lat, lng, bearing, speed, etaMinutes }`
  - `trip_status_changed`: `{ status: RideStatus, timestamp }`

---

## 5. Mock Adapter to Production Switch

All service calls are routed through interface implementations. Switching to live backend requires only updating the environment variable:

```env
# Toggle between 'mock' and 'live'
EXPO_PUBLIC_DATA_SOURCE=mock
EXPO_PUBLIC_API_URL=https://api.kingstaxi.et/v1
```
